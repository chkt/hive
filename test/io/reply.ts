import * as assert from 'assert';
import { describe, it } from 'mocha';

import Dict = NodeJS.Dict;
import { ServerResponse } from 'http';
import { mime_encoding, mime_type } from '../../source/io/mimeType';
import { http_reply_code } from "../../source/io/http";
import { getHeaders, setHeaders, setResponseStatus } from '../../source/io/reply';


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


describe('getHeaders', () => {
	it ('should return a dictionary containing the content-type and content-length header', () => {
		const buffer = Buffer.from('foobarbaz');

		assert.deepStrictEqual(getHeaders(buffer, mime_type.text, mime_encoding.utf8), {
			'Content-Type' : 'text/plain; charset=utf-8',
			'Content-Length' : '9'
		});
	});
});

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

		setResponseStatus(rep, http_reply_code.empty, headers);

		assert.strictEqual(rep.statusCode, 204);
		assert.strictEqual(rep.statusMessage, 'No Content');
		assert.deepStrictEqual(rep.headers, headers);
	});
})
