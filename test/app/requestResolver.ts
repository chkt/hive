import * as assert from 'assert';
import { describe, it } from 'mocha';
import { IncomingMessage, ServerResponse } from 'http';

import { createState } from '@chkt/states/dist/state';
import { bindContextToState, contextToState } from '@chkt/states/dist/traverse';
import { createTransitionMap } from '@chkt/states/dist/create';
import { modify } from '@chkt/states/dist/modify';

import { Injector } from '../../source/inject/injector';
import { createHttpContext, HttpContext } from '../../source/io/context';
import { Controller, ControllerContext } from '../../source/controller/controller';
import { getResolver } from '../../source/app/requestResolver';
import { AppCommonProvider } from '../../source/app/app';
import { Logger } from "@chkt/onceupon/dist";


function mockCommonProvider(msgs:string[] = []) : AppCommonProvider {
	const logger:Partial<Logger> = {
		failure(reason) {
			msgs.push(reason instanceof Error ? reason.message : reason);

			return this as Logger;
		}
	};

	return {
		logger : logger as Logger,
		time : {
			now() { return 0; }
		}
	};
}

function mockInjector(provider:AppCommonProvider) : Injector<AppCommonProvider> {
	return {
		get(id) {
			if (id in provider) return provider[id];

			throw new Error();
		}
	}
}

function mockIncomingMessage(method:string = 'GET', url:string = '/foo') : IncomingMessage {
	return Object.create(IncomingMessage.prototype, {
		method : { value : method },
		url : { value : url }
	});
}

function mockServerResponse(messages:object = {}) : ServerResponse {
	return Object.create(ServerResponse.prototype, {
		writeHead : { value(code:number, message:string, headers:object) {
			Object.assign(messages, { code, message, headers });

			return this;
		} },
		write : { value : (body:Buffer) => {
			Object.assign(messages, { body : body.toString() });
		} },
		end : { value : () => {
			Object.assign(messages, { ended : true });
		} }
	});
}

function mockController(resolve?:contextToState<ControllerContext>) : Controller {
	if (resolve === undefined) resolve = context => Promise.resolve(createState('foo', context));

	return {
		resolve,
		actions : {},
		selectedAction : ''
	};
}

function mockControllerContext(context:HttpContext, controller:Controller) : ControllerContext {
	return {
		...context,
		params : { foo : 'bar' },
		controller,
		view : { baz : 'qux' }
	};
}

function get500Messages() {
	return {
		body : '500 - Internal Server Error',
		code : 500,
		ended : true,
		headers : {
			'Content-Length' : '27',
			'Content-Type' : 'text/plain; charset=utf-8'
		},
		message : 'Internal Server Error'
	};
}


describe('resolver', () => {
	it('should resolve a routed request', async () => {
		const messages = {};
		const controller = mockController();
		const request = mockIncomingMessage();
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(modify(getResolver(mockInjector(mockCommonProvider())), {
			route : {
				transform : (context, next) => Promise.resolve(next.default(mockControllerContext(context, controller))),
				targets : [{ id : 'after_route' }]
			}
		})), 'before_route');

		assert.deepStrictEqual(await resolve(createHttpContext(123, request, reply)), {
			id : 'after_send',
			path : [ 'before_route', 'route', 'after_route', 'controller', 'send' ],
			context : {
				timestamp : 123,
				request,
				reply,
				attributes : {},
				params : { foo : 'bar' },
				controller,
				view : { baz : 'qux' }
			}
		});

		assert.deepStrictEqual(messages, {
			ended : true
		});
	});

	it('should handle routing errors', async () => {
		const messages = {};
		const request = mockIncomingMessage('POST', '/bad');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(modify(getResolver(mockInjector(mockCommonProvider())), {
			route : {
				transform : (context, next) => Promise.resolve(next.default(context)),
				targets : [{ id : 'route_error' }]
			}
		})), 'before_route');

		assert.deepStrictEqual(await resolve(createHttpContext(123, request, reply)), {
			id : 'after_send',
			path : ['before_route', 'route', 'route_error', 'error', 'log', 'send' ],
			context : {
				timestamp : 123,
				request,
				reply,
				attributes : {},
				error : 'bad route POST /bad'
			}
		});

		assert.deepStrictEqual(messages, get500Messages());
	});

	it('should handle missing routes', async () => {
		const messages = {};
		const request = mockIncomingMessage('POST', '/missing');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(modify(getResolver(mockInjector(mockCommonProvider())), {
			route : {
				transform : (context, next) => Promise.resolve(next.default(context)),
				targets : [{ id : 'no_route'}]
			}
		})), 'before_route');

		assert.deepStrictEqual(await resolve(createHttpContext(123, request, reply)), {
			id : 'after_send',
			path : ['before_route', 'route', 'no_route', 'log', 'send'],
			context : {
				timestamp : 123,
				request,
				reply,
				error : 'no route POST /missing',
				attributes : {}
			}
		});

		assert.deepStrictEqual(messages, {
			body : '404 - Not Found',
			code : 404,
			ended : true,
			headers : {
				'Content-Length' : '15',
				'Content-Type' : 'text/plain; charset=utf-8'
			},
			message : 'Not Found'
		});
	});

	it ('should handle controller error contexts', async () => {
		const messages = {};
		const request = mockIncomingMessage();
		const reply = mockServerResponse(messages);
		const controller = mockController(context => Promise.resolve({
			id : 'foo',
			path : [],
			context,
			error : new Error('bang')
		}));

		const resolve = bindContextToState(createTransitionMap(modify(getResolver(mockInjector(mockCommonProvider())), {
			route : {
				transform : (context, next) => Promise.resolve(next.default(mockControllerContext(context, controller))),
				targets : [{ id : 'after_route' }]
			}
		})), 'before_route');

		assert.deepStrictEqual(await resolve(createHttpContext(123, request, reply)), {
			id : 'after_send',
			path : ['before_route', 'route', 'after_route', 'controller', 'error', 'log', 'send'],
			context : {
				timestamp : 123,
				request,
				reply,
				attributes : {},
				error : 'bang',
				params : { foo : 'bar' },
				controller,
				view : { baz : 'qux' }
			}
		});

		assert.deepStrictEqual(messages, get500Messages());
	});

	it('should handle missing controllers', async () => {
		const messages = {};
		const request = mockIncomingMessage();
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(getResolver(mockInjector(mockCommonProvider()))), 'before_route');

		assert.deepStrictEqual(await resolve(createHttpContext(123, request, reply)), {
			id : 'after_send',
			path : ['before_route', 'route', 'after_route', 'controller', 'no_controller', 'error', 'log', 'send'],
			context : {
				timestamp : 123,
				request,
				reply,
				attributes : {},
				error : 'no controller GET /foo'
			}
		});

		assert.deepStrictEqual(messages, get500Messages());
	});
});
