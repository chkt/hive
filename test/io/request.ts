import * as assert from 'assert';
import { describe, it } from 'mocha';

import { mime_encoding, mime_type } from '../../source/io/mimeType';
import { http_request_header } from '../../source/io/http';
import {
	decodeContentType,
	decodeListHeader,
	encodeContentHeaders,
	encodeContentType,
	encodeListHeader
} from '../../source/io/request';


describe('decodeListHeader', () => {
	it ('should return the separate tokens of list headers', () => {
		assert.deepStrictEqual(decodeListHeader(' FOO, Bar,Foo-bar ,  foo-Baz  , fOO-qUX '), [
			'Foo',
			'Bar',
			'Foo-Bar',
			'Foo-Baz',
			'Foo-Qux'
		]);
	});
});

describe('encodeListHeader', () => {
	it('should return the list header of tokens', () => {
		assert.strictEqual(encodeListHeader(['Foo', 'Bar', 'Baz']), 'Foo, Bar, Baz');
	});
});

describe('encodeContentType', () => {
	it('should return the content type header content', () => {
		assert.strictEqual(encodeContentType(mime_type.bytes), 'application/octet-stream');
		assert.strictEqual(encodeContentType(mime_type.text, mime_encoding.utf8), 'text/plain; charset=utf-8');
	});
})

describe('decodeContentType', () => {
	it('should return the decoded content type header', () => {
		assert.deepStrictEqual(decodeContentType('application/octet-stream'), [ mime_type.bytes, mime_encoding.utf8 ]);
		assert.deepStrictEqual(decodeContentType('text/plain; charset=utf-8'), [ mime_type.text, mime_encoding.utf8 ]);
	});
});

describe('encodeContentHeaders', () => {
	it('should return the headers representing the supplied mime content', () => {
		assert.deepStrictEqual(encodeContentHeaders(Buffer.alloc(128), mime_type.bytes), {
			[ http_request_header.content_type ] : 'application/octet-stream',
			[ http_request_header.content_length ] : '128'
		});
		assert.deepStrictEqual(encodeContentHeaders(Buffer.from('foobarbazqux'), mime_type.text, mime_encoding.utf8), {
			[ http_request_header.content_type ] : 'text/plain; charset=utf-8',
			[ http_request_header.content_length ] : '12'
		});
	});
});
