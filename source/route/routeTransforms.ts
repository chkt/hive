import { State, Switch } from "@chkt/states/dist/state";
import { transform } from "@chkt/states/dist/transition";

import { createRouter, route_error_msg, RouteDescriptions, routeResolver } from "./route";
import { HttpContext } from "../io/context";


export async function resolveRoute(
	router:routeResolver,
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	try {
		return next.success(router(context));
	}
	catch (err) {
		if (err.message === route_error_msg.no_match) return next.named('no_route', context);
		else return next.named('error', context);
	}
}


export function bindRoutes(routes:RouteDescriptions) : transform<HttpContext> {
	const router = createRouter(routes);

	return resolveRoute.bind(null, router);
}
