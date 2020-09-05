import * as assert from 'assert';
import { describe, it } from 'mocha';

import { Socket } from 'net';
import { IncomingMessage, ServerResponse } from 'http';
import {
	createDataContext,
	createErrorContext,
	createHttpBodyContext,
	createHttpContext,
	isDataContext,
	isErrorContext,
	isHttpBodyContext,
	isHttpContext
} from '../../source/io/context';


describe('isDataContext', () => {
	it('should return true if Context is a DataContext', () => {
		assert.strictEqual(isDataContext({}), false);
		assert.strictEqual(isDataContext({ data : undefined }), false);
		assert.strictEqual(isDataContext({ data : null }), false);
		assert.strictEqual(isDataContext({ data : {} }), true);
	});
});

describe('isHttpContext', () => {
	it('should return true if Context is a HttpContext', () => {
		const request = new IncomingMessage(new Socket());
		const reply = new ServerResponse(request);

		assert.strictEqual(isHttpContext({}), false);
		assert.strictEqual(isHttpContext({
			timestamp : 0,
			request : null,
			response : null,
			attributes : {}
		}), false);
		assert.strictEqual(isHttpContext({
			timestamp : 0,
			request,
			reply,
			attributes : {}
		}), true);
	});
});

describe('isHttpBodyContext', () => {
	it('should return if HttpContext is a HttpBodyContext', () => {
		const request = new IncomingMessage(new Socket());
		const reply = new ServerResponse(request);

		assert.strictEqual(isHttpBodyContext({
			timestamp : 0,
			request,
			reply,
			attributes : {}
		}), false);
		assert.strictEqual(isHttpBodyContext({
			timestamp : 0,
			request,
			requestBody : {},
			reply,
			attributes : {}
		}), true);
	});
});

describe('isErrorContext', () => {
	it('should return true if Context is an ErrorContext', () => {
		assert.strictEqual(isErrorContext({}), false);
		assert.strictEqual(isErrorContext({ error : undefined }), false);
		assert.strictEqual(isErrorContext({ error : 'foo' }), true);
	});
});

describe('createDataContext', () => {
	it('should create a DataContext', () => {
		assert.deepStrictEqual(createDataContext({}, { foo : 'bar' }), { data : { foo : 'bar'}});
		assert.deepStrictEqual(createDataContext({ baz : 'qux'}, { foo : 'bar'}), {
			baz : 'qux',
			data : { foo : 'bar'}
		});
	});
});

describe('createHttpContext', () => {
	it('should create a HttpContext', () => {
		const request = new IncomingMessage(new Socket());
		const reply = new ServerResponse(request);
		const attributes = { foo : 'bar' };

		assert.deepStrictEqual(createHttpContext(0, request, reply, attributes), {
			timestamp : 0,
			request,
			reply,
			attributes
		});
	});
});

describe('createHttpBodyContext', () => {
	it('should create a HttpBodyContext', () => {
		const request = new IncomingMessage(new Socket());
		const reply = new ServerResponse(request);
		const attributes = { foo : 'bar' };
		const body = { baz : 'qux' };

		assert.deepStrictEqual(createHttpBodyContext({ timestamp : 0, request, reply, attributes }, body), {
			timestamp : 0,
			request,
			requestBody : body,
			reply,
			attributes
		});
		assert.deepStrictEqual(createHttpBodyContext({ timestamp : 0, request, reply, attributes, bang : false }, body), {
			timestamp : 0,
			request,
			requestBody : body,
			reply,
			attributes,
			bang : false
		});
	});
});

describe('createErrorContext', () => {
	it('should create an ErrorContext', () => {
		assert.deepStrictEqual(createErrorContext({}, 'bang'), {
			error : 'bang'
		});
		assert.deepStrictEqual(createErrorContext({ foo : 'bar' }, 'bang'), {
			foo : 'bar',
			error : 'bang'
		});
	});
});
