import { State, Switch } from '@chkt/states/dist/state';
import { http_reply_code } from '../io/http';
import { ControllerContext } from './controller';


export const enum reply_status {
	action_unavailable = 'action unavailable',
	auth_failed = 'authentication failed',
	auth_malformed = 'authentication required',
	endpoint_unavailable = 'endpoint unavailable',
	error = 'processing error',
	mime_unsupported = 'representation unsupported',
	ok = 'ok',
	request_malformed = 'request malformed',
	request_unsupported = 'request unsupported',
	resource_mismatch = 'resource mismatch',
	resource_missing = 'resource not found',
	service_unavailable = 'service unavailable',
	timeout = 'processing timeout'
}

const replyMap:Map<reply_status, http_reply_code> = new Map([
	[ reply_status.action_unavailable, http_reply_code.no_method ],
	[ reply_status.auth_failed, http_reply_code.no_auth ],
	[ reply_status.auth_malformed, http_reply_code.no_auth ],
	[ reply_status.endpoint_unavailable, http_reply_code.not_found ],
	[ reply_status.error, http_reply_code.error ],
	[ reply_status.mime_unsupported, http_reply_code.malformed ],
	[ reply_status.ok, http_reply_code.ok ],
	[ reply_status.request_malformed, http_reply_code.malformed ],
	[ reply_status.request_unsupported, http_reply_code.malformed ],
	[ reply_status.resource_mismatch, http_reply_code.mismatch ],
	[ reply_status.resource_missing, http_reply_code.not_found ],
	[ reply_status.service_unavailable, http_reply_code.no_service ],
]);


export function codeOfStatus(status:string|undefined) : http_reply_code {
	return replyMap.get(status as reply_status) ?? http_reply_code.error;
}


export async function filterView(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	if (Object.keys(context.view).length !== 0) return next.success(context);
	else return next.failure(context);
}
