import { IncomingMessage, ServerResponse } from "http";

import { contextToState, bindContextToState, isErrorState } from "@chkt/states/dist/traverse";
import { StateDescriptionMap, createTransitionMap } from "@chkt/states/dist/create";
import { modify } from "@chkt/states/dist/modify";

import { createHttpContext, HttpContext } from "../io/context";
import { RouteDescriptions } from "../route/route";
import { bindRoutes } from "../route/routeTransforms";
import { sendTextReply } from "../io/reply";
import { http_reply_code } from "../io/http";
import { logError } from "../log/log";


export type handleRequest = (request:IncomingMessage, response:ServerResponse) => Promise<void>;


async function onRequest(
	traversal:contextToState<HttpContext>,
	request:IncomingMessage,
	response:ServerResponse
) : Promise<void> {
	const context = createHttpContext(request, response);
	const res = await traversal(context);

	if (isErrorState(res)) {
		sendTextReply(response, http_reply_code.error);

		logError(res.error);
	}
}

function bindOnRequest(traversal:contextToState<HttpContext>) : handleRequest {
	return onRequest.bind<
		null,
		contextToState<HttpContext>,
		[IncomingMessage, ServerResponse],
		Promise<void>
	>(null, traversal);
}

export function createApp(
	resolve:StateDescriptionMap<HttpContext>,
	routes:RouteDescriptions = []
) : handleRequest {
	const map = modify(resolve, {
		route : {
			transform : bindRoutes(routes),
			targets : resolve.route.targets
		}
	});

	const traversal = bindContextToState(createTransitionMap(map), 'before_route');

	return bindOnRequest(traversal);
}
