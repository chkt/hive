import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createMediaType, parseMediaType } from '../../source/io/media';


describe('parseMediaType', () => {
	it('should parse basic top types', () => {
		assert.deepStrictEqual(parseMediaType('application/octet-stream'), {
			type : 'application/octet-stream',
			top : 'application',
			sub : 'octet-stream',
			params : {}
		});
		assert.deepStrictEqual(parseMediaType('audio/aac'), {
			type : 'audio/aac',
			top : 'audio',
			sub : 'aac',
			params : {}
		});
		assert.deepStrictEqual(parseMediaType('font/woff2'), {
			type : 'font/woff2',
			top : 'font',
			sub : 'woff2',
			params : {}
		});
		assert.deepStrictEqual(parseMediaType('image/svg+xml'), {
			type : 'image/svg+xml',
			top : 'image',
			sub : 'svg+xml',
			params : {}
		});
		assert.deepStrictEqual(parseMediaType('message/delivery-status'), {
			type : 'message/delivery-status',
			top : 'message',
			sub : 'delivery-status',
			params : {}
		});
		assert.deepStrictEqual(parseMediaType('model/stl'), {
			type : 'model/stl',
			top : 'model',
			sub : 'stl',
			params : {}
		});
		assert.deepStrictEqual(parseMediaType('video/H264'), {
			type : 'video/H264',
			top : 'video',
			sub : 'H264',
			params : {}
		});
	});

	it('should pass params to basic top types', () => {
		assert.deepStrictEqual(parseMediaType('application/json', { charset : 'utf-8'}), {
			type : 'application/json',
			top : 'application',
			sub : 'json',
			params : { charset : 'utf-8' }
		});
	});

	it('should parse multipart top types', () => {
		assert.deepStrictEqual(parseMediaType('multipart/form-data'), {
			type : 'multipart/form-data',
			top : 'multipart',
			sub : 'form-data',
			params : { boundary : '' }
		});
		assert.deepStrictEqual(parseMediaType('multipart/form-data', { foo : 'bar' }), {
			type : 'multipart/form-data',
			top : 'multipart',
			sub : 'form-data',
			params : { foo : 'bar', boundary : '' }
		});
		assert.deepStrictEqual(parseMediaType('multipart/form-data', { foo : 'bar', boundary : 'baz' }), {
			type : 'multipart/form-data',
			top : 'multipart',
			sub : 'form-data',
			params : { foo : 'bar', boundary : 'baz' }
		});
	});

	it('should parse text top types', () => {
		assert.deepStrictEqual(parseMediaType('text/plain'), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { charset : 'us-ascii' }
		});
		assert.deepStrictEqual(parseMediaType('text/plain', { foo : 'bar' }), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { foo : 'bar', charset : 'us-ascii' }
		});
		assert.deepStrictEqual(parseMediaType('text/plain', { foo : 'bar', charset : 'baz' }), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { foo : 'bar', charset : 'baz' }
		});
	});

	it('should parse wildcard top type', () => {
		assert.deepStrictEqual(parseMediaType('*/*', { foo : 'bar' }), {
			type : '*/*',
			top : '*',
			sub : '*',
			params : { foo : 'bar' }
		});
	});

	it('should parse malformed types as application/octet-stream', () => {
		assert.deepStrictEqual(parseMediaType('video'), {
			type : 'application/octet-stream',
			top : 'application',
			sub : 'octet-stream',
			params : {}
		});

		assert.deepStrictEqual(parseMediaType('video/'), {
			type : 'application/octet-stream',
			top : 'application',
			sub : 'octet-stream',
			params : {}
		});
	});

	it('should parse malformed text types as text/plain', () => {
		assert.deepStrictEqual(parseMediaType('text'), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { charset : 'us-ascii' }
		});
		assert.deepStrictEqual(parseMediaType('text/'), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { charset : 'us-ascii' }
		});
	});

	it('should parse malformed wildcard types as */*', () => {
		assert.deepStrictEqual(parseMediaType('*', { foo : 'bar' }), {
			type : '*/*',
			top : '*',
			sub : '*',
			params : { foo : 'bar' }
		});
		assert.deepStrictEqual(parseMediaType('*/', { foo : 'bar' }), {
			type : '*/*',
			top : '*',
			sub : '*',
			params : { foo : 'bar' }
		});
	});

	it('should parse invalid top types as application/octet-stream', () => {
		assert.deepStrictEqual(parseMediaType('example/example', { foo : 'bar' }), {
			type : 'application/octet-stream',
			top : 'application',
			sub : 'octet-stream',
			params : { foo : 'bar' }
		});
	});

	it('should parse non-wildcard subtypes for wildcard top type as */*', () => {
		assert.deepStrictEqual(parseMediaType('*/example', { foo : 'bar' }), {
			type : '*/*',
			top : '*',
			sub : '*',
			params : { foo : 'bar' }
		});
	});
});

describe('createMediaType', () => {
	it('should create basic media types', () => {
		assert.deepStrictEqual(createMediaType('application', 'octet-stream'), {
			type : 'application/octet-stream',
			top : 'application',
			sub : 'octet-stream',
			params : {}
		});
		assert.deepStrictEqual(createMediaType('audio', 'acc'), {
			type : 'audio/acc',
			top : 'audio',
			sub : 'acc',
			params : {}
		});
		assert.deepStrictEqual(createMediaType('font', 'woff2'), {
			type : 'font/woff2',
			top : 'font',
			sub : 'woff2',
			params : {}
		});
		assert.deepStrictEqual(createMediaType('image', 'svg+xml'), {
			type : 'image/svg+xml',
			top : 'image',
			sub : 'svg+xml',
			params : {}
		});
		assert.deepStrictEqual(createMediaType('message', 'delivery-status'), {
			type : 'message/delivery-status',
			top : 'message',
			sub : 'delivery-status',
			params : {}
		});
		assert.deepStrictEqual(createMediaType('model', 'stl'), {
			type : 'model/stl',
			top : 'model',
			sub : 'stl',
			params : {}
		});
		assert.deepStrictEqual(createMediaType('video', 'H264'), {
			type : 'video/H264',
			top : 'video',
			sub : 'H264',
			params : {}
		});
	});

	it('should pass params to basic media types', () => {
		assert.deepStrictEqual(createMediaType('application', 'octet-stream', { foo : 'bar' }), {
			type : 'application/octet-stream',
			top : 'application',
			sub : 'octet-stream',
			params : { foo : 'bar' }
		});
	});

	it('should create multipart media types', () => {
		assert.deepStrictEqual(createMediaType('multipart', 'form-data', { boundary : 'baz' }), {
			type : 'multipart/form-data',
			top : 'multipart',
			sub : 'form-data',
			params : { boundary : 'baz' }
		});
		assert.deepStrictEqual(createMediaType('multipart', 'form-data', { foo : 'bar', boundary : 'baz' }), {
			type : 'multipart/form-data',
			top : 'multipart',
			sub : 'form-data',
			params : { foo : 'bar', boundary : 'baz' }
		});
	});

	it('should create text media type', () => {
		assert.deepStrictEqual(createMediaType('text', 'plain', { charset : 'baz' }), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { charset : 'baz' }
		});
		assert.deepStrictEqual(createMediaType('text', 'plain', { foo : 'bar', charset : 'baz'}), {
			type : 'text/plain',
			top : 'text',
			sub : 'plain',
			params : { foo : 'bar', charset : 'baz' }
		});
	});
});
