import { State, Switch } from '@chkt/states/dist/state';
import { http_method, http_reply_code, http_response_header, httpMessage } from '../io/http';
import { sendTextReply, setResponseStatus } from '../io/reply';
import { applyControllerAction, ControllerContext } from './controller';


export const enum controller_action {
	list = 'list',
	create = 'create',
	read = 'read',
	update = 'update',
	delete = 'delete'
}

export const enum reply_status {
	action_unavailable = 'action unavailable',
	auth_failed = 'authentication failed',
	auth_malformed = 'authentication required',
	error = 'processing error',
	mime_unsupported = 'representation unsupported',
	ok = 'ok',
	request_malformed = 'request malformed',
	request_unsupported = 'request unsupported',
	resource_missing = 'resource not found',
	service_unavailable = 'service unavailable'
}

const replyMap:Map<reply_status, http_reply_code> = new Map([
	[ reply_status.action_unavailable, http_reply_code.no_method ],
	[ reply_status.auth_failed, http_reply_code.no_auth ],
	[ reply_status.auth_malformed, http_reply_code.no_auth ],
	[ reply_status.error, http_reply_code.error ],
	[ reply_status.mime_unsupported, http_reply_code.malformed ],
	[ reply_status.ok, http_reply_code.ok ],
	[ reply_status.request_malformed, http_reply_code.malformed ],
	[ reply_status.request_unsupported, http_reply_code.malformed ],
	[ reply_status.resource_missing, http_reply_code.not_found ],
	[ reply_status.service_unavailable, http_reply_code.no_service ],
]);

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


export function codeOfStatus(status:string|undefined) : http_reply_code {
	return replyMap.get(status as reply_status) ?? http_reply_code.error;
}


export async function resolveRequestMethod(
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

export async function filterAction(
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

export async function applyReplyStatus(
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

export async function resolveMethods(
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

export async function respondStatus(
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

export async function respondError(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	sendTextReply(context.reply, http_reply_code.error);

	return next.failure(context);
}
