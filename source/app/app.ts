import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from '@chkt/onceupon';
import { contextToState, isErrorState } from '@chkt/states/dist/traverse';
import { Injector, Provider } from '../inject/injector';
import { http_reply_code } from '../io/http';
import { createHttpContext, HttpContext } from '../io/context';
import { sendTextReply } from '../io/reply';


export interface LoggingProvider extends Provider {
	logger : Logger;
}

interface AppContext {
	readonly injector : Injector<LoggingProvider>;
	readonly resolve : contextToState<HttpContext>;
}

export type handleRequest = (request:IncomingMessage, response:ServerResponse) => Promise<void>;


async function onRequest(
	appContext:AppContext,
	request:IncomingMessage,
	response:ServerResponse
) : Promise<void> {
	const context = createHttpContext(request, response);
	const res = await appContext.resolve(context);

	if (isErrorState(res)) {
		sendTextReply(response, http_reply_code.error);

		appContext.injector.get('logger').failure(res.error);
	}
}

export function createApp(context:AppContext) : handleRequest {
	return onRequest.bind(null, context);
}
