import * as assert from 'assert';
import { describe, it } from 'mocha';

import { capitalizeHeaderName, isListHeader } from '../../source/io/http';


describe('isListHeader', () => {
	it('should return true if header is a list header', () => {
		assert.strictEqual(isListHeader('Accept'), true);
		assert.strictEqual(isListHeader('Accept-Charset'), true);
		assert.strictEqual(isListHeader('Accept-Language'), true);
		assert.strictEqual(isListHeader('Access-Control-Allow-Headers'), true);
		assert.strictEqual(isListHeader('Access-Control-Allow-Methods'), true);
		assert.strictEqual(isListHeader('Access-Control-Allow-Origin'), false);
		assert.strictEqual(isListHeader('Access-Control-Max-Age'), false);
		assert.strictEqual(isListHeader('Access-Control-Request-Headers'), true);
		assert.strictEqual(isListHeader('Access-Control-Request-Method'), false);
		assert.strictEqual(isListHeader('Allow'), true);
		assert.strictEqual(isListHeader('Authorization'), false);
		assert.strictEqual(isListHeader('Content-Language'), false);
		assert.strictEqual(isListHeader('Content-Length'), false);
		assert.strictEqual(isListHeader('Content-Type'), false);
		assert.strictEqual(isListHeader('Location'), false);
		assert.strictEqual(isListHeader('Origin'), false);
		assert.strictEqual(isListHeader('User-Agent'), false);
		assert.strictEqual(isListHeader('Vary'), true);
		assert.strictEqual(isListHeader('X-Forwarded-For'), true);

	});
});

describe('capitalizeHeaderName', () => {
	it('should return a http capitalized version of header', () => {
		assert.strictEqual(capitalizeHeaderName(''), '');
		assert.strictEqual(capitalizeHeaderName('foo'), 'Foo');
		assert.strictEqual(capitalizeHeaderName('FOO'), 'Foo');
		assert.strictEqual(capitalizeHeaderName('fOo'), 'Foo');
		assert.strictEqual(capitalizeHeaderName('foo-bar'), 'Foo-Bar');
		assert.strictEqual(capitalizeHeaderName('FOO-BAR'), 'Foo-Bar');
		assert.strictEqual(capitalizeHeaderName('fOo-BaR'), 'Foo-Bar');
		assert.strictEqual(capitalizeHeaderName('foo-bar-baz'), 'Foo-Bar-Baz');
		assert.strictEqual(capitalizeHeaderName('FOO-BAR-BAZ'), 'Foo-Bar-Baz');
		assert.strictEqual(capitalizeHeaderName('fOo-BaR-bAZ'), 'Foo-Bar-Baz');
	});

	it('should return http capitalized versions of degenerate headers', () => {
		assert.strictEqual(capitalizeHeaderName('-foo-bar-'), '-Foo-Bar-');
		assert.strictEqual(capitalizeHeaderName('--foo--bar--'), '--Foo--Bar--');
		assert.strictEqual(capitalizeHeaderName('---'), '---');
	});
});
