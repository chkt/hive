import * as assert from 'assert';
import { describe, it } from 'mocha';

import Dict = NodeJS.Dict;
import { IncomingMessage } from 'http';
import { Switch } from '@chkt/states';
import { HttpMethod } from '../../source/io/http';
import {
	filterRequestAccept,
	filterRequestAcceptCharset,
	filterRequestMethod,
	filterRequestMethods
} from '../../source/io/requestTransforms';
import { ControllerContext } from '../../source/controller/controller';


function mockRequest(method:HttpMethod = 'GET', headers:Dict<string> = {}) : IncomingMessage {
	const req:Partial<IncomingMessage> = {
		method,
		headers
	};

	return req as IncomingMessage;
}

function mockContext(request:IncomingMessage) : ControllerContext {
	const ctx:Partial<ControllerContext> = {
		request
	};

	return ctx as ControllerContext;
}

function mockSwitch() : Switch<ControllerContext> {
	const res = {
		success : (context:ControllerContext) => ({ id : 'success', context }),
		default : (context:ControllerContext) => ({ id : 'default', context }),
		failure : (context:ControllerContext) => ({ id : 'failure', context }),
		named : (name:string, context:ControllerContext) => ({ id : `name-${ name }`, context })
	};

	return res as Switch<ControllerContext>;
}


describe('filterRequestMethod', () => {
	it('should return a success state for context matching method', async () => {
		const context = mockContext(mockRequest());
		const next = mockSwitch();

		assert.deepStrictEqual(await filterRequestMethod('GET', context, next), { id : 'success', context });
		assert.deepStrictEqual(await filterRequestMethod('OPTIONS', context, next), { id : 'failure', context });
	});
});

describe('filterRequestMethods', () => {
	it('should return a named state for request methods matching map', async () => {
		const context = mockContext(mockRequest('POST'));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestMethods([
				{ method : 'GET', target : 'foo' },
				{ method : 'POST', target : 'bar' }
			], context, next),
			{ id : 'name-bar', context }
		);
	});

	it('should return the failure state for mismatched methods', async () => {
		const context = mockContext(mockRequest('POST'));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestMethods([
				{ method : 'GET', target : 'foo' },
			], context, next),
			{ id : 'failure', context }
		);
	});
});

describe('filterRequestAccept', () => {
	it('should return a named state for accept headers matching map', async () => {
		const context = mockContext(mockRequest('GET', {
			accept : ' */*;q=0.8 , model/*;q=0.8 , model/bar;q=0.8, model/baz;q=0.8 , model/foo '
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAccept([
				{ type : { type : 'model/foo', top : 'model', sub : 'foo', params : {}}, target : 'foo' },
				{ type : { type : 'model/bar', top : 'model', sub : 'bar', params : {}}, target : 'bar' },
				{ type : { type : 'model/baz', top : 'model', sub : 'baz', params : {}}, target : 'baz' },
				{ type : { type : 'model/qux', top : 'model', sub : 'qux', params : {}}, target : 'qux' },
				{ type : { type : 'model/fro', top : 'model', sub : 'fro', params : {}}, target : 'fro' }
			], context, next),
			{ id : 'name-foo', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ type : { type : 'model/bar', top : 'model', sub : 'bar', params : {}}, target : 'bar' },
				{ type : { type : 'model/baz', top : 'model', sub : 'baz', params : {}}, target : 'baz' },
				{ type : { type : 'model/qux', top : 'model', sub : 'qux', params : {}}, target : 'qux' },
				{ type : { type : 'model/fro', top : 'model', sub : 'fro', params : {}}, target : 'fro' }
			], context, next),
			{ id : 'name-bar', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ type : { type : 'model/baz', top : 'model', sub : 'baz', params : {}}, target : 'baz' },
				{ type : { type : 'model/qux', top : 'model', sub : 'qux', params : {}}, target : 'qux' },
				{ type : { type : 'model/fro', top : 'model', sub : 'fro', params : {}}, target : 'fro' }
			], context, next),
			{ id : 'name-baz', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ type : { type : 'model/qux', top : 'model', sub : 'qux', params : {}}, target : 'qux' },
				{ type : { type : 'model/fro', top : 'model', sub : 'fro', params : {}}, target : 'fro' }
			], context, next),
			{ id : 'name-qux', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ type : { type : 'model/fro', top : 'model', sub : 'fro', params : {}}, target : 'fro' }
			], context, next),
			{ id : 'name-fro', context }
		);
	});

	it('should return the failure state for mismatched headers', async () => {
		const context = mockContext(mockRequest('GET', {
			accept : 'model/foo'
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAccept([
				{ type : { type : 'model/bar', top : 'model', sub : 'bar', params : {}}, target : 'bar' },
			], context, next),
			{ id : 'failure', context }
		);
	});

	it('should return the failure state for malformed headers', async () => {
		const context = mockContext(mockRequest('GET', {
			accept : 'foo/bar;baz'
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAccept([], context, next),
			{ id : 'failure', context }
		)
	});
});

describe('filterRequestAcceptEncoding', () => {
	it('should return a named state for accept-charset headers matching map', async () => {
		const context = mockContext(mockRequest('GET', {
			['accept-charset'] : ' *;q=0.9, bar;q=0.9, baz;q=0.9, foo '
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAcceptCharset([
				{ charset : 'foo', target : 'foo' },
				{ charset : 'bar', target : 'bar' },
				{ charset : 'baz', target : 'baz' },
				{ charset : 'qux', target : 'qux' }
			], context, next),
			{ id : 'name-foo', context }
		);
		assert.deepStrictEqual(
			await filterRequestAcceptCharset([
				{ charset : 'bar', target : 'bar' },
				{ charset : 'baz', target : 'baz' },
				{ charset : 'qux', target : 'qux' }
			], context, next),
			{ id : 'name-bar', context }
		);
		assert.deepStrictEqual(
			await filterRequestAcceptCharset([
				{ charset : 'baz', target : 'baz' },
				{ charset : 'qux', target : 'qux' }
			], context, next),
			{ id : 'name-baz', context }
		);
		assert.deepStrictEqual(
			await filterRequestAcceptCharset([
				{ charset : 'qux', target : 'qux' }
			], context, next),
			{ id : 'name-qux', context }
		);
	});

	it('should return the failure state for unmatched headers', async () => {
		const context = mockContext(mockRequest('GET', {
			['accept-charset'] : 'foo'
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAcceptCharset([
				{ charset : 'bar', target : 'bar' }
			], context, next),
			{ id : 'failure', context }
		);
	});

	it('should return the failure state for malformed headers', async () => {
		const context = mockContext(mockRequest('GET', {
			['accept-charset'] : 'foo;bar'
		}))
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAcceptCharset([], context, next),
			{ id : 'failure', context }
		);
	});
});
