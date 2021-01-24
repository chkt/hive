import { State, Switch } from '@chkt/states/dist/state';
import { http_method, http_reply_code, http_request_header, http_response_header } from '../io/http';
import { setResponseStatus } from '../io/reply';
import { decodeHeaderListHeader, encodeListHeader } from '../io/request';
import { ControllerContext } from './controller';


export interface CorsOrigin {
	readonly origin : string;
	readonly allowedMethods : ReadonlyArray<http_method>;
	readonly allowedHeaders : ReadonlyArray<string>;
	readonly maxAge? : number;
}

export type CorsOrigins = ReadonlyArray<CorsOrigin>;


const corsSafeHeaders:ReadonlyArray<string> = [
	http_request_header.accept_mime,
	http_request_header.accept_language,
	http_request_header.content_language,
];


export async function encodeCorsOrigin(
	sites:CorsOrigins,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const origin = context.request.headers.origin;

	sites.some(site => {
		if (origin === site.origin) {
			context.reply.setHeader(http_response_header.cors_origin, origin);

			return true;
		}
		else return false;
	});

	return next.default(context);
}

export async function encodeCorsPreflight(
	sites:CorsOrigins,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const reply = context.reply;
	const origin = context.request.headers.origin;
	const site = sites.find(value => origin === value.origin);

	setResponseStatus(context.reply, http_reply_code.ok);

	if (site !== undefined) {
		const method = (context.request.headers['access-control-request-method'] ?? '') as string;
		const headers = decodeHeaderListHeader((context.request.headers['access-control-request-headers'] ?? '') as string);

		reply.setHeader(http_response_header.cors_origin, site.origin);
		reply.setHeader(
			http_response_header.cors_methods,
			encodeListHeader(site.allowedMethods.filter(value => value === method))
		);
		reply.setHeader(
			http_response_header.cors_headers,
			encodeListHeader(headers.filter(value => !corsSafeHeaders.includes(value) && site.allowedHeaders.includes(value)))
		);
		reply.setHeader(http_response_header.cors_max_age, (site.maxAge ?? 0).toFixed(0));
		reply.setHeader(http_response_header.vary, encodeListHeader([
			http_request_header.origin,
			http_request_header.cors_method,
			http_request_header.cors_headers
		]));
	}

	return next.default(context);
}
