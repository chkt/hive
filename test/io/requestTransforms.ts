import * as assert from 'assert';
import { describe, it } from 'mocha';
import { IncomingMessage } from 'http';
import { Switch } from '@chkt/states';
import { http_method } from '../../source/io/http';
import { filterRequestAccept, filterRequestMethod } from '../../source/io/requestTransforms';
import { ControllerContext } from '../../source/controller/controller';
import Dict = NodeJS.Dict;


function mockRequest(method:http_method = http_method.get, headers:Dict<string> = {}) : IncomingMessage {
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
	return {
		success : context => ({ id : 'success', context }),
		default : context => ({ id : 'default', context }),
		failure : context => ({ id : 'failure', context }),
		named : (name, context) => ({ id : `name-${ name }`, context })
	};
}


describe('filterRequestMethod', () => {
	it('should return a success state for context matching method', async () => {
		const context = mockContext(mockRequest());
		const next = mockSwitch();

		assert.deepStrictEqual(await filterRequestMethod(http_method.get, context, next), { id : 'success', context });
		assert.deepStrictEqual(await filterRequestMethod(http_method.options, context, next), { id : 'failure', context });
	});
});

describe('filterRequestAccept', () => {
	it('should return a named state for accept headers matching map', async () => {
		const context = mockContext(mockRequest(http_method.get, {
			accept : ' */*;q=0.8 , foo/*;q=0.8 , foo/baz;q=0.8, foo/qux;q=0.8 , foo/bar '
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAccept([
				{ topType : 'foo', subType : 'bar', target : 'bar' },
				{ topType : 'foo', subType : 'baz', target : 'baz' },
				{ topType : 'foo', subType : 'qux', target : 'qux' },
				{ topType : 'foo', subType : 'fuz', target : 'fuz' },
				{ topType : 'far', subType : 'fro', target : 'fro' }
			], context, next),
			{ id : 'name-bar', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ topType : 'foo', subType : 'baz', target : 'baz' },
				{ topType : 'foo', subType : 'qux', target : 'qux' },
				{ topType : 'foo', subType : 'fuz', target : 'fuz' },
				{ topType : 'far', subType : 'fro', target : 'fro' }
			], context, next),
			{ id : 'name-baz', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ topType : 'foo', subType : 'qux', target : 'qux' },
				{ topType : 'foo', subType : 'fuz', target : 'fuz' },
				{ topType : 'far', subType : 'fro', target : 'fro' }
			], context, next),
			{ id : 'name-qux', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ topType : 'foo', subType : 'fuz', target : 'fuz' },
				{ topType : 'far', subType : 'fro', target : 'fro' }
			], context, next),
			{ id : 'name-fuz', context }
		);
		assert.deepStrictEqual(
			await filterRequestAccept([
				{ topType : 'far', subType : 'fro', target : 'fro' }
			], context, next),
			{ id : 'name-fro', context }
		);
	});

	it('should return the failure state for mismatched headers', async () => {
		const context = mockContext(mockRequest(http_method.get, {
			accept : 'foo/bar'
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAccept([
				{ topType : 'foo', subType : 'baz', target : 'baz' }
			], context, next),
			{ id : 'failure', context }
		);
	});

	it('should return the failure state for malformed headers', async () => {
		const context = mockContext(mockRequest(http_method.get, {
			accept : 'foo/bar;baz'
		}));
		const next = mockSwitch();

		assert.deepStrictEqual(
			await filterRequestAccept([], context, next),
			{ id : 'failure', context }
		)
	});
});
