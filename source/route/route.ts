import * as uri from "url";
import * as pathToExpr from 'path-to-regexp';
import * as queryString from 'query-string';

import { HttpContext } from "../io/context";
import { Controller, ControllerContext, createControllerContext } from "../controller/controller";
import { Hash } from "../common/base/Hash";


export const enum route_error_msg {
	no_match = 'no route match'
}


export type RouteAttributes = Hash<string>;
export type RouteParams = Hash<string|string[]|null>;

export interface RouteData {
	readonly path : string;
	readonly params : RouteParams;
}

export interface RouteMatch {
	readonly controller : Controller;
	readonly attributes : RouteAttributes;
	readonly params : RouteParams;
}

export function createRouteMatch(
	controller:Controller,
	params:RouteParams = {},
	attributes:RouteAttributes = {}
) : RouteMatch {
	return { controller, attributes,  params };
}


type resolve = (data:RouteData) => RouteMatch;

export interface RouteDescription {
	readonly path : string;
	readonly resolve : resolve;
}

export type RouteDescriptions = RouteDescription[];


interface RouteExpression {
	readonly expr : RegExp;
	readonly keys : pathToExpr.Key[];
}

interface Route
extends RouteDescription {
	readonly parser : RouteExpression;
}

type Routes = Route[];

function createRouteExpression(path:string) : RouteExpression {
	const opts = { sensitive : true };
	const keys:pathToExpr.Key[] = [];
	const expr = pathToExpr.pathToRegexp(path, keys, opts);

	return { keys, expr };
}

function createRoute(desc:RouteDescription) : Route {
	return {
		...desc,
		parser : createRouteExpression(desc.path)
	};
}


function getPathParams(segs:string[], keys:pathToExpr.Key[]) : RouteParams {
	const params:RouteParams = {};

	for (let i = segs.length = 1; i > -1; i -= 1) {
		const seg = segs[i];

		if (seg === undefined) continue;

		params[keys[i].name as string] = seg;
	}

	return params;
}

interface Match {
	path : string;
	route : Route;
	params : RouteParams;
}

function matchRoutes(routes:Routes, path:string) : Match {
	for (const route of routes) {
		const match = route.parser.expr.exec(path);

		if (match !== null) {
			return {
				path,
				route,
				params : getPathParams(match.slice(1), route.parser.keys)
			};
		}
	}

	throw new Error(route_error_msg.no_match);
}


export type routeResolver = (context:HttpContext) => ControllerContext;

function resolveContext(routes:Routes, context:HttpContext) : ControllerContext {
	const { pathname, query } = uri.parse(context.request.url as string);
	const match = matchRoutes(routes, pathname as string);

	const resolution = match.route.resolve({
		path : match.path,
		params : query !== null ? { ...queryString.parse(query) as RouteParams, ...match.params } : match.params
	});

	return createControllerContext(context, resolution);
}

export function createRouter(descriptions:RouteDescriptions) : routeResolver {
	const routes = [];

	for (const desc of descriptions) routes.push(createRoute(desc));

	return resolveContext.bind(null, routes);
}
