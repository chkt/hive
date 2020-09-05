import * as assert from 'assert';
import { describe } from 'mocha';

import Dict = NodeJS.Dict;
import { IncomingMessage, ServerResponse } from 'http';
import { Switch } from '@chkt/states/dist/state';
import { http_method } from '../../source/io/http';
import { ControllerContext } from '../../source/controller/controller';
import { CorsOrigins, filterCorsOrigin, filterMethod, replyCorsPreflight } from '../../source/controller/corsTransforms';


interface MockReply {
	headers : Dict<string|number|string[]>;
}


function mockRequest(method:http_method = http_method.get, headers:Dict<string> = {}) : IncomingMessage {
	const req:Partial<IncomingMessage> = {
		method,
		headers
	};

	return req as IncomingMessage;
}

function mockReply(headers:Dict<string|number|string[]> = {}) : ServerResponse & MockReply {
	const rep:Partial<ServerResponse> & MockReply = {
		headers,
		setHeader(this:MockReply, name, value) {
			this.headers[name] = value;
		}
	};

	return rep as ServerResponse & MockReply;
}

function mockContext(request:IncomingMessage, reply:ServerResponse) : ControllerContext {
	const ctx:Partial<ControllerContext> = {
		request,
		reply
	};

	return ctx as ControllerContext;
}

function mockSwitch() : Switch<ControllerContext> {
	const next:Partial<Switch<ControllerContext>> = {
		success : context => ({ id : 'success', context }),
		default : context => ({ id : 'default', context }),
		failure : context => ({ id : 'failure', context })
	};

	return next as Switch<ControllerContext>;
}


describe('filterMethod', () => {
	it('should return a success state for context matching method', async () => {
		const context = mockContext(mockRequest(), mockReply());
		const next = mockSwitch();

		assert.deepStrictEqual(await filterMethod(http_method.get, context, next), { id : 'success', context });
		assert.deepStrictEqual(await filterMethod(http_method.options, context, next), { id : 'failure', context });
	});
});

describe('filterCorsOrigin', () => {
	it ('should attach an Access-Control-Allow-Origin header if in config', async () => {
		const requestHeaders:Dict<string> = {};
		const replyHeaders:Dict<string> = {};
		const context = mockContext(mockRequest(http_method.get, requestHeaders), mockReply(replyHeaders));
		const next = mockSwitch();
		const sites:CorsOrigins = [{
			origin : 'http://bar',
			allowedMethods : [],
			allowedHeaders : [],
		}];

		requestHeaders.origin = 'http://foo';

		assert.deepStrictEqual(await filterCorsOrigin(sites, context, next), { id : 'default', context });
		assert.deepStrictEqual(replyHeaders, {});

		requestHeaders.origin = 'http://bar';

		assert.deepStrictEqual(await filterCorsOrigin(sites, context, next), { id : 'default', context });
		assert.deepStrictEqual(replyHeaders, { 'Access-Control-Allow-Origin' : 'http://bar' });
	});
});

describe('replyCorsPreflight', () => {
	it ('should attach cors headers if request matches config', async () => {
		const next = mockSwitch();
		const sites:CorsOrigins = [{
			origin : 'http://foo',
			allowedMethods : [ http_method.post, http_method.put ],
			allowedHeaders : [ 'Accept', 'Content-Type' ],
			maxAge : 1234
		}];

		let reply = mockReply();
		let context = mockContext(mockRequest(http_method.options), reply);

		assert.deepStrictEqual(await replyCorsPreflight(sites, context, next), { id : 'default', context });
		assert.strictEqual(reply.statusCode, 200);
		assert.strictEqual(reply.statusMessage, 'Ok');
		assert.deepStrictEqual(reply.headers, {});

		reply = mockReply();
		context = mockContext(mockRequest(http_method.options, {
			origin : 'http://foo'
		}), reply);

		assert.deepStrictEqual(await replyCorsPreflight(sites, context, next), { id : 'default', context });
		assert.strictEqual(reply.statusCode, 200);
		assert.strictEqual(reply.statusMessage, 'Ok');
		assert.deepStrictEqual(reply.headers, {
			'Access-Control-Allow-Origin' : 'http://foo',
			'Access-Control-Allow-Methods' : '',
			'Access-Control-Allow-Headers' : '',
			'Access-Control-Max-Age' : '1234',
			'Vary' : 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
		});

		reply = mockReply();
		context = mockContext(mockRequest(http_method.options, {
			origin : 'http://foo',
			'access-control-request-method' : http_method.post,
			'access-control-request-headers' : 'Accept, Content-Type, Authorization'
		}), reply);

		assert.deepStrictEqual(await replyCorsPreflight(sites, context, next), { id : 'default', context });
		assert.strictEqual(reply.statusCode, 200);
		assert.strictEqual(reply.statusMessage, 'Ok');
		assert.deepStrictEqual(reply.headers, {
			'Access-Control-Allow-Origin' : 'http://foo',
			'Access-Control-Allow-Methods' : http_method.post,
			'Access-Control-Allow-Headers' : 'Content-Type',
			'Access-Control-Max-Age' : '1234',
			'Vary' : 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
		});
	});


});
