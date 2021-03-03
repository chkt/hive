import * as assert from 'assert';
import { describe, it } from 'mocha';

import Dict = NodeJS.Dict;
import { ServerResponse } from 'http';
import { httpResponseCode } from '../../source/io/http';
import { setHeaders, setResponseStatus } from '../../source/io/reply';


interface ResponseMock {
	headers : Dict<string|number|string[]>;
}


function mockResponse() : ServerResponse & ResponseMock {
	const rep:Partial<ServerResponse> & ResponseMock = {
		headers : {},
		setHeader(this:ResponseMock, name:string, value:string|number|string[]) {
			this.headers[name] = value;
		}
	};

	return rep as ServerResponse & ResponseMock;
}


describe('setHeaders', () => {
	it('should set the supplied headers', () => {
		const rep = mockResponse();
		const headers = { foo : 'bar', baz : 'qux' };

		setHeaders(rep, headers);

		assert.deepStrictEqual(rep.headers, headers);
	});
});

describe('setResponseStatus', () => {
	it('should set the statusCode and -Message', () => {
		const rep = mockResponse();
		const headers = { foo : 'bar', baz : 'qux' };

		setResponseStatus(rep, httpResponseCode.empty, headers);

		assert.strictEqual(rep.statusCode, 204);
		assert.strictEqual(rep.statusMessage, 'No Content');
		assert.deepStrictEqual(rep.headers, headers);
	});
})
