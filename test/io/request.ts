import * as assert from 'assert';
import { describe, it } from 'mocha';

import { mime_encoding, mime_type } from '../../source/io/mimeType';
import { decodeContentType, decodeListHeader, encodeContentType, encodeListHeader } from '../../source/io/request';


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
