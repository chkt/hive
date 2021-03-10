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
	it('should return a sorted list of media types', () => {
		assert.deepStrictEqual(decodeAcceptHeader(' */*;q=0.9 , model/*;q=0.9 , model/baz;q=0.9 , model/qux;q=0.9, model/bar '), [
			{ token : 'model/bar', data : { type : 'model/bar', top : 'model', sub : 'bar', params : {}}, q : 1.0 },
			{ token : 'model/baz;q=0.9', data : { type : 'model/baz', top : 'model', sub : 'baz', params : {}}, q : 0.9 },
			{ token : 'model/qux;q=0.9', data : { type : 'model/qux', top : 'model', sub : 'qux', params : {}}, q : 0.9 },
			{ token : 'model/*;q=0.9', data : { type : 'model/*'  , top : 'model', sub : '*'  , params : {}}, q : 0.9 },
			{ token : '*/*;q=0.9', data : { type : '*/*'      , top : '*'    , sub : '*'  , params : {}}, q : 0.9 },
		]);
	});

	it('should return a sorted list of media types with arbitrary parameters', () => {
		assert.deepStrictEqual(decodeAcceptHeader('model/foo;v=1;q=0.9,model/bar;v=2,model/bar;v=2;foo=bar,model/baz;q=1;v=3'), [
			{ token : 'model/bar;v=2;foo=bar', data : { type : 'model/bar', top : 'model', sub : 'bar', params : { v : '2', foo : 'bar'}}, q : 1.0 },
			{ token : 'model/bar;v=2', data : { type : 'model/bar', top : 'model', sub : 'bar', params : { v : '2' }}, q : 1.0 },
			{ token : 'model/baz;q=1;v=3', data : { type : 'model/baz', top : 'model', sub : 'baz', params : {v : '3'}}, q : 1.0 },
			{ token : 'model/foo;v=1;q=0.9', data : { type : 'model/foo', top : 'model', sub : 'foo', params : { v : '1' }}, q : 0.9 }
		]);
	});

	it('should return an empty list for empty headers', () => {
		assert.deepStrictEqual(decodeAcceptHeader(''), []);
	});

	it('should gracefully handle malformed q parameters', () => {
		assert.deepStrictEqual(decodeAcceptHeader('model/foo;q,model/bar;q=,model/baz;q=0,model/qux;q=-1;,model/fra;q=5,model/fru;q=bang'), [
			{ token : 'model/fra;q=5', data : { type : 'model/fra', top : 'model', sub : 'fra', params : {}}, q : 1.0 },
			{ token : 'model/baz;q=0', data : { type : 'model/baz', top : 'model', sub : 'baz', params : {}}, q : 0.0 }
		]);
	});

	it('should gracefully handle mangled media types', () => {
		assert.deepStrictEqual(decodeAcceptHeader(';q,;q=,;q=0.9'), [
			{ token : ';q=0.9', data : { type : 'application/octet-stream', top : 'application', sub : 'octet-stream', params : {}}, q : 0.9 }
		]);
	});
});

describe('decodeAcceptCharsetHeader', () => {
	it('should return a sorted list of charsets', () => {
		assert.deepStrictEqual(decodeAcceptCharsetHeader('*;q=0.9, foo;q=0.9, bar;q=0.9, baz'), [
			{ token : 'baz', data : 'baz', q : 1.0 },
			{ token : 'foo;q=0.9', data : 'foo', q : 0.9 },
			{ token : 'bar;q=0.9', data : 'bar', q : 0.9 },
			{ token : '*;q=0.9', data : '*'  , q : 0.9 }
		]);
	});

	it('should return an empty list for empty headers', () => {
		assert.deepStrictEqual(decodeAcceptCharsetHeader(''), []);
	});

	it('should gracefully handle malformed q parameters', () => {
		assert.deepStrictEqual(decodeAcceptCharsetHeader('foo;q,bar;q=,baz;q=0,qux;q=-1,fra;q=5,fru;q=bang'), [
			{ token : 'fra;q=5', data : 'fra', q : 1.0 },
			{ token : 'baz;q=0', data : 'baz', q : 0.0 }
		]);
	});

	it('should gracefully handle mangled charsets', () => {
		assert.deepStrictEqual(decodeAcceptCharsetHeader(';q,;q=,;q=0.9'), []);
	});
});
