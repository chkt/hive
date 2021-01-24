import { State, Switch } from '@chkt/states/dist/state';
import { http_method, http_response_header, httpMessage } from '../io/http';
import { setResponseStatus } from '../io/reply';
import { applyControllerAction, ControllerContext } from './controller';
import { codeOfStatus, reply_status } from "./apiTransforms";


export const enum rest_action {
	list = 'list',
	create = 'create',
	read = 'read',
	update = 'update',
	delete = 'delete'
}

interface MethodMapping {
	readonly method : http_method;
	readonly action : rest_action;
	readonly id : boolean;
}
type MethodMappings = readonly MethodMapping[];

const map:MethodMappings = [
	{ method : http_method.get, action : rest_action.list, id : false },
	{ method : http_method.get, action : rest_action.read, id : true },
	{ method : http_method.head, action : rest_action.list, id : false },
	{ method : http_method.head, action : rest_action.read, id : true },
	{ method : http_method.post, action : rest_action.create, id : false },
	{ method : http_method.put, action : rest_action.update, id : true },
	{ method : http_method.delete, action : rest_action.delete, id : true }
];


export async function decodeRestAction(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const hasId = 'id' in context.params;
	const method = context.request.method;

	for (const mapping of map) {
		if (mapping.method !== method || mapping.id !== hasId) continue;

		return next.success({
			...context,
			attributes : {
				...context.attributes,
				action : mapping.action
			}
		});
	}

	return next.failure(context);
}

export async function filterRestAction(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const action = context.attributes.action;

	if (action in context.controller.actions) {
		return next.named(action, {
			...context,
			controller : applyControllerAction(context.controller, action)
		});
	}

	return next.failure(context);
}

export async function encodeRestReplyStatus(
	status:string,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	return next.success({
		...context,
		attributes : {
			...context.attributes,
			status
		}
	});
}

export async function decodeRestAllowedMethods(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const actions = context.controller.actions;
	const allow:http_method[] = [];

	for (const action in actions) {
		if (!actions.hasOwnProperty(action)) continue;

		for (const method of map) {
			if (
				action === method.action &&
				allow.indexOf(method.method) === -1
			) allow.push(method.method);
		}
	}

	context.reply.setHeader(http_response_header.allowed_methods, allow.join(', '));

	return next.failure({
		...context,
		attributes : {
			...context.attributes,
			status : reply_status.action_unavailable
		}
	});
}

export async function respondRestStatus(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const code = codeOfStatus(context.attributes.status);

	setResponseStatus(context.reply, code);

	return next.success({
		...context,
		view : { status : httpMessage.get(code) ?? 'unresolved' }
	});
}
