import { StateDescriptionMap } from '@chkt/states/dist/create';
import { Injector } from '../inject/injector';
import { HttpContext } from '../io/context';
import {
	controller_boundary,
	noop,
	controllerTransform,
	respondError,
	respondNoController,
	respondRouteError,
	endReply, respondNoRoute, logError
} from './requestTransforms';
import { AppCommonProvider } from './app';


export function getResolver(injector:Injector<AppCommonProvider>) : StateDescriptionMap<HttpContext> {
	return {
		before_route : {
			transform : noop,
			targets : [{ id : 'route' }, { id : 'send' }]
		},
		route : {
			transform : noop,
			targets : [
				{ id : 'after_route', name : 'route_found' },
				{ id : 'no_route', name : 'no_route' },
				{ id : 'route_error', name : 'error' }
			]
		},
		route_error : {
			transform : respondRouteError,
			targets : [{ id : 'error' }]
		},
		no_route : {
			transform : respondNoRoute,
			targets : [{ id : 'log' }]
		},
		after_route : {
			transform : noop,
			targets : [{ id : 'controller' }]
		},
		controller : {
			transform : controllerTransform,
			targets : [
				{ id : 'send', name : controller_boundary.success },
				{ id : 'no_controller', name : controller_boundary.no_controller },
				{ id : 'error', name : controller_boundary.error }
			]
		},
		no_controller : {
			transform : respondNoController,
			targets : [{ id : 'error'}]
		},
		error : {
			transform : respondError,
			targets : [{ id : 'log' }]
		},
		log : {
			transform : logError.bind(null, injector),
			targets : [{ id : 'send' }]
		},
		send : {
			transform : endReply,
			targets : [{ id : 'after_send' }]
		}
	};
}
