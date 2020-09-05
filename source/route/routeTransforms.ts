import { State, Switch } from '@chkt/states/dist/state';
import { transform } from '@chkt/states/dist/transition';
import { createErrorContext, HttpContext } from '../io/context';
import { createRouter, route_error_msg, RouteDescriptions, routeResolver } from './route';


export async function resolveRoute(
	router:routeResolver,
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	try {
		return next.success(router(context));
	}
	catch (err) {
		return next.named(
			err.message === route_error_msg.no_match ? 'no_route' : 'error',
			createErrorContext(context, err.message)
		);
	}
}


export function bindRoutes(routes:RouteDescriptions) : transform<HttpContext> {
	const router = createRouter(routes);

	return resolveRoute.bind(null, router);
}
