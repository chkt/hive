import { createTransitionMap, StateDescriptionMap } from '@chkt/states/dist/create';
import { modify } from '@chkt/states/dist/modify';
import { bindContextToState, contextToState } from '@chkt/states/dist/traverse'
import { Injector } from '../inject/injector';
import { HttpContext } from '../io/context';
import { RouteDescriptions } from './route';
import { bindRoutes } from './routeTransforms';
import { LoggingProvider } from '../app/app';


type resolverFactory = (injector:Injector<LoggingProvider>) => StateDescriptionMap<HttpContext>;


export function createResolver(
	injector:Injector<LoggingProvider>,
	createDescriptor:resolverFactory,
	routes:RouteDescriptions
) : contextToState<HttpContext> {
	let map = createDescriptor(injector);

	map = modify(map, {
		route : {
			transform : bindRoutes(routes),
			targets : map.route.targets
		}
	});

	return bindContextToState(createTransitionMap(map), 'before_route');
}
