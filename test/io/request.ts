import * as assert from 'assert';
import { describe, it } from 'mocha';

import { mime_encoding, mime_type } from '../../source/io/mimeType';
import { http_request_header } from '../../source/io/http';
import {
	decodeAcceptHeader,
	decodeContentType,
	decodeHeaderListHeader,
	encodeContentHeaders,
	encodeContentType,
	encodeListHeader
} from '../../source/io/request';


describe('decodeHeaderListHeader', () => {
	it ('should return the separate tokens of list headers', () => {
		assert.deepStrictEqual(decodeHeaderListHeader(' FOO, Bar,Foo-bar ,  foo-Baz  , fOO-qUX '), [
			'Foo',
			'Bar',
			'Foo-Bar',
			'Foo-Baz',
			'Foo-Qux'
		]);
	});
});

describe('decodePreferenceHeader', () => {
	it('should return a sorted list of mime types', () => {
		assert.deepStrictEqual(decodeAcceptHeader(' */*;q=0.9 , foo/*;q=0.9 , foo/baz;q=0.9 , foo/qux;q=0.9, foo/bar '), [
			{ token : 'foo/bar', data : { topType : 'foo', subType : 'bar' }, q : 1.0 },
			{ token : 'foo/baz', data : { topType : 'foo', subType : 'baz'}, q : 0.9 },
			{ token : 'foo/qux', data : { topType : 'foo', subType : 'qux'}, q : 0.9 },
			{ token : 'foo/*', data : { topType : 'foo', subType : '*'}, q : 0.9 },
			{ token : '*/*', data : { topType : '*', subType : '*' }, q : 0.9 },
		])
	});

	it('should return an empty list for empty headers', () => {
		assert.deepStrictEqual(decodeAcceptHeader(''), []);
	});

	it('should throw for malformed headers', () => {
		assert.throws(() => decodeAcceptHeader('*'), new Error('\'*\' not a mime type'));
		assert.throws(() => decodeAcceptHeader('foo'), new Error('\'foo\' not a mime type'));
		assert.throws(() => decodeAcceptHeader('foo/'), new Error('\'foo/\' not a mime type'));
		assert.throws(() => decodeAcceptHeader('foo/bar, baz'), new Error('\'baz\' not a mime type'));
		assert.throws(() => decodeAcceptHeader('foo/bar;x'), new Error('\'foo/bar;x\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;baz=qux'), new Error('\'foo/bar;baz=qux\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;q'), new Error('\'foo/bar;q\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;q='), new Error('\'foo/bar;q=\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;q=baz'), new Error('\'foo/bar;q=baz\' not a preference header'));
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
