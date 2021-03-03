import { State, Switch } from '@chkt/states/dist/state';
import { HttpMethod, httpRequestHeader, httpResponseCode, httpResponseHeader } from '../io/http';
import { setResponseStatus } from '../io/reply';
import { decodeHeaderListHeader, encodeHeaderListHeader } from '../io/request';
import { ControllerContext } from './controller';


export interface CorsOrigin {
	readonly origin : string;
	readonly allowedMethods : ReadonlyArray<HttpMethod>;
	readonly allowedHeaders : ReadonlyArray<string>;
	readonly maxAge? : number;
}

export type CorsOrigins = ReadonlyArray<CorsOrigin>;


const corsSafeHeaders:ReadonlyArray<string> = [
	httpRequestHeader.acceptMediaType,
	httpRequestHeader.acceptLanguage,
	httpRequestHeader.contentLanguage,
];


export async function encodeCorsOrigin(
	sites:CorsOrigins,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const origin = context.request.headers.origin;

	sites.some(site => {
		if (origin === site.origin) {
			context.reply.setHeader(httpResponseHeader.corsOrigin, origin);

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

	setResponseStatus(context.reply, httpResponseCode.empty);

	if (site !== undefined) {
		const method = (context.request.headers['access-control-request-method'] ?? '') as string;
		const headers = decodeHeaderListHeader((context.request.headers['access-control-request-headers'] ?? '') as string);

		reply.setHeader(httpResponseHeader.corsOrigin, site.origin);
		reply.setHeader(
			httpResponseHeader.corsMethods,
			encodeHeaderListHeader(site.allowedMethods.filter(value => value === method))
		);
		reply.setHeader(
			httpResponseHeader.corsHeaders,
			encodeHeaderListHeader(headers.filter(value => !corsSafeHeaders.includes(value) && site.allowedHeaders.includes(value)))
		);
		reply.setHeader(httpResponseHeader.corsMaxAge, (site.maxAge ?? 0).toFixed(0));
		reply.setHeader(httpResponseHeader.vary, encodeHeaderListHeader([
			httpRequestHeader.origin,
			httpRequestHeader.corsMethod,
			httpRequestHeader.corsHeaders
		]));
	}

	return next.default(context);
}
