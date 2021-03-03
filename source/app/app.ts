import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from '@chkt/onceupon';
import { contextToState, isErrorState } from '@chkt/states/dist/traverse';
import { Injector, Provider } from '../inject/injector';
import { httpResponseCode } from '../io/http';
import { createHttpContext, HttpContext } from '../io/context';
import { sendTextReply } from '../io/reply';


export interface TimeSource {
	now() : number;
}

export interface AppCommonProvider extends Provider {
	readonly time : TimeSource;
	readonly logger : Logger;
}

interface AppContext {
	readonly common : AppCommonProvider;
	readonly injector : Injector<AppCommonProvider>;
	readonly resolve : contextToState<HttpContext>;
}

export type handleRequest = (request:IncomingMessage, response:ServerResponse) => Promise<void>;


async function onRequest(
	appContext:AppContext,
	request:IncomingMessage,
	response:ServerResponse
) : Promise<void> {
	const context = createHttpContext(appContext.common.time.now(), request, response);
	const res = await appContext.resolve(context);

	if (isErrorState(res)) {
		sendTextReply(response, httpResponseCode.error);

		appContext.common.logger.failure(res.error);
	}
}

export function createApp(context:AppContext) : handleRequest {
	return onRequest.bind(null, context);
}
