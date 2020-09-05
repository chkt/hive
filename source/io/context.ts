import { IncomingMessage, ServerResponse } from 'http';
import { Context } from '@chkt/states/dist/state';
import { Hash, ReadonlyHash } from '../common/base/Hash';
import { JsonConformValue, JsonConformHash } from '../common/base/Json';


export type DataContext<T extends Context> = T & {
	readonly data : Readonly<JsonConformHash>;
}

export interface HttpContext
extends Context {
	readonly timestamp : number;
	readonly request : IncomingMessage;
	readonly reply : ServerResponse;
	readonly attributes : ReadonlyHash<string>;
}

export type HttpBodyContext<T extends HttpContext> = T & {
	readonly requestBody : Readonly<JsonConformValue>;
}

export type ErrorContext<T extends Context> = T & {
	error : string;
};


export function isDataContext<T extends Context>(context:T) : context is DataContext<T> {
	return 'data' in context && typeof context.data === 'object' && context.data !== null;
}

export function isHttpContext(context:Context) : context is HttpContext {
	return 'request' in context &&
		'reply' in context &&
		'timestamp' in context &&
		'attributes' in context &&
		context.request instanceof IncomingMessage &&
		context.reply instanceof ServerResponse &&
		typeof context.timestamp === 'number' &&
		typeof context.attributes === 'object' && context.attributes !== null;
}

export function isHttpBodyContext<T extends HttpContext>(context:T) : context is HttpBodyContext<T> {
	return 'requestBody' in context;
}

export function isErrorContext<T extends Context>(context:T) : context is ErrorContext<T> {
	return 'error' in context && typeof context.error === 'string';
}


export function createDataContext<T extends Context>(context:T, data:Readonly<JsonConformHash>) : DataContext<T> {
	return {
		...context, data : {
			...context.data ?? {},
			...data
		}
	};
}

export function createHttpContext(
	timestamp:number,
	request:IncomingMessage,
	reply:ServerResponse,
	attributes:Hash<string> = {}
) : HttpContext {
	return { timestamp, request, reply, attributes };
}

export function createHttpBodyContext<T extends HttpContext>(context:T, requestBody:JsonConformValue) {
	return { ...context, requestBody };
}

export function createErrorContext<T extends Context>(context:T, error:string) : ErrorContext<T> {
	return { ...context, error };
}
