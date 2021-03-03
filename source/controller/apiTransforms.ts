import { State, Switch } from '@chkt/states/dist/state';
import { httpResponseCode, HttpResponseCode } from '../io/http';
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

const replyMap:ReadonlyMap<reply_status, HttpResponseCode> = new Map([
	[ reply_status.action_unavailable, httpResponseCode.noMethod ],
	[ reply_status.auth_failed, httpResponseCode.noAuth ],
	[ reply_status.auth_malformed, httpResponseCode.noAuth ],
	[ reply_status.endpoint_unavailable, httpResponseCode.notFound ],
	[ reply_status.error, httpResponseCode.error ],
	[ reply_status.mime_unsupported, httpResponseCode.malformed ],
	[ reply_status.ok, httpResponseCode.ok ],
	[ reply_status.request_malformed, httpResponseCode.malformed ],
	[ reply_status.request_unsupported, httpResponseCode.malformed ],
	[ reply_status.resource_mismatch, httpResponseCode.mismatch ],
	[ reply_status.resource_missing, httpResponseCode.notFound ],
	[ reply_status.service_unavailable, httpResponseCode.noService ]
]);


export function codeOfStatus(status:string|undefined) : HttpResponseCode {
	return replyMap.get(status as reply_status) ?? httpResponseCode.error;
}


export async function filterView(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	if (Object.keys(context.view).length !== 0) return next.success(context);
	else return next.failure(context);
}
