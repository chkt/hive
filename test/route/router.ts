import * as assert from 'assert';
import { describe, it } from 'mocha';

import { State } from "@chkt/states/dist/state";

import { Controller, ControllerContext } from "../../source/controller/controller";
import { createRouteMatch, createRouter, RouteParams } from "../../source/route/route";
import { HttpContext } from "../../source/io/context";


function mockContext(url:string) : HttpContext {
	const res = { request : { url }};

	return res as HttpContext;
}

function mockController() : Controller {
	return {
		resolve : async (context:ControllerContext) : Promise<State<ControllerContext>> => {
			const state = { context, id : 'foo' };

			return state as State<ControllerContext>;
		},
		actions : {},
		selectedAction : ''
	};
}

function mockControllerContext(controller:Controller, url:string, params:RouteParams = {}) : ControllerContext {
	const res = {
		request : { url },
		attributes : {},
		controller,
		params,
		view : {}
	};

	return res as ControllerContext;
}


describe('createRouter', () => {
	it('creates a basic routeResolver', () => {
		const path = '/path/to/string';
		const controller = mockController();
		const router = createRouter([
			{ path, resolve : data => createRouteMatch(controller, data.params) }
		]);

		assert.deepStrictEqual(
			router(mockContext(path)),
			mockControllerContext(controller, path)
		);

		assert.throws(() => {
			router(mockContext('/'));
		}, new Error('no route match'));
	});

	it('should create a routeResolver with catchall routes', () => {
		const path = '/path/to/string';
		const controller = mockController();
		const router = createRouter([
			{ path : '/:foo*', resolve : data => createRouteMatch(controller, data.params) }
		]);

		assert.deepStrictEqual(
			router(mockContext(path)),
			mockControllerContext(controller, path, { foo : path.slice(1) })
		);
	});

	it('should create a routeResolver with named segments', () => {
		const path = '/foo/to/baz';
		const controller = mockController();
		const router = createRouter([
			{ path : '/foo/:bar/baz', resolve : data => createRouteMatch(controller, data.params) },
		]);

		assert.deepStrictEqual(
			router(mockContext(path)),
			mockControllerContext(controller, path, { bar : 'to' })
		);
	});

	it('should create a routeResolver parsing query params', () => {
		const path = '/path/to/file?a=1&b=2';
		const controller = mockController();
		const router = createRouter([
			{ path : '/path/to/file', resolve : data => createRouteMatch(controller, data.params) }
		]);

		assert.deepStrictEqual(
			router(mockContext(path)),
			mockControllerContext(controller, path, { a : '1', b : '2' })
		);
	});

	it ('should create a routeResolver prioritizing path segments', () => {
		const path = '/path/to/foo?bar=1';
		const controller = mockController();
		const router = createRouter([
			{ path : '/path/to/:bar', resolve : data => createRouteMatch(controller, data.params) }
		]);

		assert.deepStrictEqual(
			router(mockContext(path)),
			mockControllerContext(controller, path, { bar : 'foo' })
		);
	});
});
