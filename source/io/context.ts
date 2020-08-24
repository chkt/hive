import { IncomingMessage, ServerResponse } from "http";

import { Context } from "@chkt/states/dist/state";

import { Hash, ReadonlyHash } from "../common/base/Hash";


export interface HttpContext
extends Context {
	readonly timestamp : number;
	readonly request : IncomingMessage;
	readonly reply : ServerResponse;
	readonly attributes : ReadonlyHash<string>;
}

export type ErrorContext<T extends Context> = T & {
	error : string;
};


export function isHttpContext(context:Context) : context is HttpContext {
	return 'request' in context &&
		'reply' in context &&
		context.request instanceof IncomingMessage &&
		context.reply instanceof ServerResponse;
}

export function isErrorContext<T extends Context>(context:T) : context is ErrorContext<T> {
	return 'error' in context && typeof context.error === 'string';
}


export function createHttpContext(
	timestamp:number,
	request:IncomingMessage,
	reply:ServerResponse,
	attributes:Hash<string> = {}
) : HttpContext {
	return { timestamp, request, reply, attributes };
}

export function createErrorContext<T extends Context>(context:T, error:string) : ErrorContext<T> {
	return { ...context, error };
}
