import * as assert from 'assert';
import { describe, it } from 'mocha';

import {
	decodeAcceptCharsetHeader,
	decodeAcceptHeader, decodeContentTypeHeader,
	decodeHeaderListHeader,
	encodeHeaderListHeader
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

describe('encodeHeaderListHeader', () => {
	it('should return the list header of tokens', () => {
		assert.strictEqual(encodeHeaderListHeader(['Foo', 'Bar', 'Baz']), 'Foo, Bar, Baz');
	});
});

describe('decodeContentTypeHeader', () => {
	it('should return the media type of content type', () => {
		assert.deepStrictEqual(decodeContentTypeHeader('text/plain; charset=us-ascii'), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { charset : 'us-ascii' }
		});
		assert.deepStrictEqual(decodeContentTypeHeader('text/html; charset=iso-8859-1'), {
			type : 'text/html',
			top : 'text',
			sub : 'html',
			params : { charset : 'iso-8859-1' }
		});
		assert.deepStrictEqual(decodeContentTypeHeader('application/json'), {
			type : 'application/json',
			top : 'application',
			sub : 'json',
			params : {}
		});
	});
});

describe('decodeAcceptHeader', () => {
	it('should return a sorted list of mime types', () => {
		assert.deepStrictEqual(decodeAcceptHeader(' */*;q=0.9 , model/*;q=0.9 , model/baz;q=0.9 , model/qux;q=0.9, model/bar '), [
			{ token : 'model/bar', data : { type : 'model/bar', top : 'model', sub : 'bar', params : {}}, q : 1.0 },
			{ token : 'model/baz', data : { type : 'model/baz', top : 'model', sub : 'baz', params : {}}, q : 0.9 },
			{ token : 'model/qux', data : { type : 'model/qux', top : 'model', sub : 'qux', params : {}}, q : 0.9 },
			{ token : 'model/*'  , data : { type : 'model/*'  , top : 'model', sub : '*'  , params : {}}, q : 0.9 },
			{ token : '*/*'      , data : { type : '*/*'      , top : '*'    , sub : '*'  , params : {}}, q : 0.9 },
		])
	});

	it('should return an empty list for empty headers', () => {
		assert.deepStrictEqual(decodeAcceptHeader(''), []);
	});

	it('should throw for malformed headers', () => {
		assert.throws(() => decodeAcceptHeader('foo/bar;x'), new Error('\'foo/bar;x\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;baz=qux'), new Error('\'foo/bar;baz=qux\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;q'), new Error('\'foo/bar;q\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;q='), new Error('\'foo/bar;q=\' not a preference header'));
		assert.throws(() => decodeAcceptHeader('foo/bar;q=baz'), new Error('\'foo/bar;q=baz\' not a preference header'));
	});
});

describe('decodeAcceptCharsetHeader', () => {
	it('should return a sorted list of charsets', () => {
		assert.deepStrictEqual(decodeAcceptCharsetHeader('*;q=0.9, foo;q=0.9, bar;q=0.9, baz'), [
			{ token : 'baz', data : 'baz', q : 1.0 },
			{ token : 'foo', data : 'foo', q : 0.9 },
			{ token : 'bar', data : 'bar', q : 0.9 },
			{ token : '*'  , data : '*'  , q : 0.9 }
		]);
	});

	it('should return an empty list for empty headers', () => {
		assert.deepStrictEqual(decodeAcceptCharsetHeader(''), []);
	});

	it('should throw for malformed headers', () => {
		assert.throws(() => decodeAcceptCharsetHeader('foo;bar'), new Error('\'foo;bar\' not a preference header'));
		assert.throws(() => decodeAcceptCharsetHeader('foo;bar=baz'), new Error('\'foo;bar=baz\' not a preference header'));
		assert.throws(() => decodeAcceptCharsetHeader('foo;q'), new Error('\'foo;q\' not a preference header'));
		assert.throws(() => decodeAcceptCharsetHeader('foo;q='), new Error('\'foo;q=\' not a preference header'));
		assert.throws(() => decodeAcceptCharsetHeader('foo;q=baz'), new Error('\'foo;q=baz\' not a preference header'));
	});
});
