import { State, Switch } from '@chkt/states/dist/state';

import { applyControllerAction, ControllerContext } from "./controller";
import { http_method, http_reply_code, httpMessage } from "../io/http";
import { sendTextReply } from "../io/reply";


export const enum controller_action {
	list = 'list',
	create = 'create',
	read = 'read',
	update = 'update',
	delete = 'delete'
}

interface MethodMapping {
	method : http_method;
	action : controller_action;
	id : boolean;
}
type MethodMappings = MethodMapping[];

const map:MethodMappings = [
	{ method : http_method.get, action : controller_action.list, id : false },
	{ method : http_method.get, action : controller_action.read, id : true },
	{ method : http_method.head, action : controller_action.list, id : false },
	{ method : http_method.head, action : controller_action.read, id : true },
	{ method : http_method.post, action : controller_action.create, id : false },
	{ method : http_method.put, action : controller_action.update, id : true },
	{ method : http_method.delete, action : controller_action.delete, id : true }
];


export async function resolveRequestMethod(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const hasId = 'id' in context.params;
	const method = context.request.method;

	for (const mapping of map) {
		if (mapping.method !== method || mapping.id !== hasId) continue;

		return next.named(mapping.action, {
			...context,
			controller : applyControllerAction(context.controller, mapping.action)
		});
	}

	return next.failure(context);
}

export async function respondBadRequest(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const code = http_reply_code.malformed;
	const message = httpMessage.get(code) as string;

	context.reply.writeHead(code, message);

	return next.failure({
		...context,
		view : {
			status : message
		}
	});
}

export async function respondNotFound(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const code = http_reply_code.not_found;
	const message = httpMessage.get(code);

	context.reply.writeHead(code, message);

	return next.failure({
		...context,
		view : {
			status : message as string
		}
	});
}

export async function respondBadMethod(
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

	context.reply.setHeader('Allow', allow.join(', '));
	sendTextReply(context.reply, http_reply_code.no_method);

	return next.failure(context);
}
