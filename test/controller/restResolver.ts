import * as assert from 'assert';
import { describe, it } from 'mocha';
import { IncomingMessage, ServerResponse } from 'http';

import { bindContextToState, contextToState, isErrorState } from "@chkt/states/dist/traverse";
import { createTransitionMap } from "@chkt/states/dist/create";
import { resolver, startId } from "../../source/controller/restResolver";
import { Hash } from "../../source/common/base/Hash";
import {
	ControllerActions,
	ControllerContext,
	createReturnReply,
	createReturnState,
	state_result_type
} from "../../source/controller/controller";
import { http_method, http_reply_code } from "../../source/io/http";


type cb = (cb?:Buffer|Error) => void;
interface ResponseMessages {
	code? : number;
	message? : string;
	headers? : Hash<string>;
	body? : string;
	ended? : boolean;
}

function mockIncomingMessage(
	method:string,
	url:string,
	headers:Hash<string> = {},
	body:string = ''
) {
	function setTimeout(timeout:number, cb:() => void) {
		return;
	}

	function on(type:string, cb:cb) : void {
		if (type === 'data') cb(Buffer.from(body));
		else if (type === 'end') cb();
	}

	return Object.create(IncomingMessage.prototype, {
		setTimeout : {value:setTimeout},
		method: {value: method},
		url: {value: url},
		headers: {value: headers},
		on: {value: on}
	});
}

function mockServerResponse(messages:ResponseMessages = {}) : ServerResponse {
	if (!('headers' in messages)) messages.headers = {};

	return Object.create(ServerResponse.prototype, {
		statusCode : { set : (code) : void => {
			messages.code = code;
		} },
		statusMessage : { set : (message) : void => {
			messages.message = message;
		} },
		setHeader : { value : (name:string, value:string) : void => {
			// @ts-ignore
			messages.headers[name] = value;
		} },
		writeHead : { value : (code:number, message:string, headers:object = {}) : void => {
			Object.assign(messages.headers, headers);
			Object.assign(messages, { code, message });
		} },
		write : { value : (body:Buffer) : void => {
			Object.assign(messages, { body : body.toString() });
		} },
		end : { value : () : void => {
			Object.assign(messages, { ended : true });
		} }
	});
}

function mockControllerContext(
	request:IncomingMessage,
	reply:ServerResponse,
	resolve:contextToState<ControllerContext>,
	params:Hash<string> = {},
	actions:ControllerActions = {}
) : ControllerContext {
	return {
		request,
		reply,
		attributes : {},
		params,
		controller : {
			resolve,
			actions,
			selectedAction : ''
		},
		view : {}
	};
}


describe('resolver', () => {
	it('should handle a list request', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.get, '/collection');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, {}, {
			list : async ctx => createReturnReply(http_reply_code.ok, {
				...ctx,
				// @ts-ignore
				view : [{ id : 'foo'}, { id : 'bar' }]
				// TODO: View should always be a JsonConformHash
			})
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'list' },
				view : [{ id : 'foo'}, { id : 'bar' }]
			}
		});

		assert.deepStrictEqual(messages, {
			code : 200,
			message : 'Ok',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '27'
			},
			body : '[{"id":"foo"},{"id":"bar"}]'
		});
	});

	it('should handle a read request', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.get, 'collection/1');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1' }, {
			read : async ctx => createReturnReply(http_reply_code.ok, {
				...ctx,
				view : { id : 'foo' }
			})
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'read' },
				view : { id : 'foo' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 200,
			message : 'Ok',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '12'
			},
			body : '{"id":"foo"}'
		});
	});

	it('should handle a create request', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.post, '/collection', {
			'content-type' : 'application/json; charset=utf-8',
			'content-length' : '12'
		}, '{"id":"foo"}');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, {}, {
			create : async ctx => createReturnReply(http_reply_code.created, {
				...ctx,
				view : { id : 'bar' }
			})
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'create' },
				payload : { id : "foo"}, // TODO: do not store data in arbitrary properties
				view : { id : "bar" }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 201,
			message : 'Created',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '12'
			},
			body : '{"id":"bar"}'
		});
	});

	it('should handle a update request', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.put, '/collection/1', {
			'content-type' : 'application/json; charset=utf-8',
			'content-length' : '12'
		}, '{"id":"foo"}');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1' }, {
			update : async ctx => createReturnReply(http_reply_code.ok, {
				...ctx,
				view : { id : 'bar' }
			})
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'update' },
				payload : { id : 'foo' },
				view : { id : 'bar' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 200,
			message : 'Ok',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '12'
			},
			body : '{"id":"bar"}'
		});
	});

	it('should handle a delete request', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.delete, '/collection/1');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1'}, {
			delete : async ctx => createReturnReply(http_reply_code.ok, ctx)
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'delete' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 200,
			message : 'Ok',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '2'
			},
			body : '{}'
		});
	});

	it('should handle invalid request methods', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.patch, '/collection/1', {
			'content-type' : 'application/json; charset=utf-8',
			'content-length' : '12'
		}, '{"id":"foo"}');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1'}, {
			list : async ctx => createReturnReply(200, ctx)
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context
		});

		assert.deepStrictEqual(messages, {
			code : 405,
			message : 'Method Not Allowed',
			headers : {
				'Content-Type' : 'text/plain; charset=utf-8',
				'Content-Length' : '24',
				'Allow' : 'GET, HEAD'
			},
			body : '405 - Method Not Allowed',
		});
		// TODO: reply mime should uniform
	});

	it('should handle invalid encodings', async () => {
		const messages = {};
		const request = mockIncomingMessage('PUT', '/collection/1', {
			'Content-Type' : 'text/plain; charset=utf-8',
			'Content-Length' : '3'
		}, 'foo');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1' });

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'update' },
				view : { status : 'Bad Request' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 400,
			message : 'Bad Request',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '24'
			},
			body : '{"status":"Bad Request"}'
		});
		// TODO: data wrapper encodings should be uniform
	});

	it('should handle decoding errors', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.put, '/collection/1', {
			'content-type' : 'application/json; charset=utf-8',
			'content-length' : '3'
		}, 'foo');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1'});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'update' },
				view : { status : 'Bad Request' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 400,
			message : 'Bad Request',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '24'
			},
			body : '{"status":"Bad Request"}'
		});
	});

	it('should handle the malformed signal_type', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.put, '/collection/1', {
			'content-type' : 'application/json; charset=utf-8',
			'content-length' : '12'
		}, '{"id":"foo"}');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1'}, {
			update : async ctx => createReturnState(state_result_type.malformed, ctx)
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'update' },
				payload : { id : 'foo' },
				view : { status : 'Bad Request' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 400,
			message : 'Bad Request',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '24'
			},
			body : '{"status":"Bad Request"}'
		});
	});

	it('should handle the not found signal_type', async () => {
		const messages = {};
		const request = mockIncomingMessage(http_method.get, '/collection/999999');
		const reply = mockServerResponse(messages);

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '999999'}, {
			read : async ctx => createReturnState(state_result_type.not_found, ctx)
		});

		assert.deepStrictEqual(await resolve(context), {
			id : 'end',
			context : {
				...context,
				controller : { ...context.controller, selectedAction : 'read' },
				view : { status : 'Not Found' }
			}
		});

		assert.deepStrictEqual(messages, {
			code : 404,
			message : 'Not Found',
			headers : {
				'Content-Type' : 'application/json; charset=utf-8',
				'Content-Length' : '22'
			},
			body : '{"status":"Not Found"}'
		});
	});

	it('should handle action errors', async () => {
		const request = mockIncomingMessage('GET', '/collection/1');
		const reply = mockServerResponse();

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1' }, {
			read : async ctx => { throw new Error('bang'); }
		});
		const state = await resolve(context);

		assert.strictEqual(state.id, 'action');
		assert.deepStrictEqual(state.context, {
			...context,
			controller : { ...context.controller, selectedAction : 'read' }
		});
		assert(isErrorState(state));
	});

	it('should handle encoding errors', async () => {
		const request = mockIncomingMessage('GET', '/collection/1');
		const reply = mockServerResponse();

		const resolve = bindContextToState(createTransitionMap(resolver), startId);
		const context = mockControllerContext(request, reply, resolve, { id : '1' }, {
			read : async ctx => createReturnReply(http_reply_code.ok, {
				...ctx,
				// @ts-ignore
				view : { id : 1n }
			})
		});
		const state = await resolve(context);

		assert.strictEqual(state.id, 'encode_json');
		assert.deepStrictEqual(state.context, {
			...context,
			controller : { ...context.controller, selectedAction : 'read' },
			// @ts-ignore
			view : { id : 1n}
		});
		assert(isErrorState(state));
	});
});
