import { Controller } from '../controller/controller';
import { createRouteMatch, RouteData, RouteMatch } from './route';


type resolveController = (data:RouteData) => Controller;


export function resolveRouteRest(resolve:resolveController) : (data:RouteData) => RouteMatch {
	return data => createRouteMatch(resolve(data), data.params, {
		endpoint : data.match.combine()
	});
}
