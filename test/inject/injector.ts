import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createInjector } from '../../source/inject/injector';


describe('createInjector', () => {
	it('should return an injector', () => {
		const injector = createInjector({});

		assert.strictEqual(typeof injector, 'object');
		assert.notStrictEqual(injector, null);
		assert('get' in injector);
		assert.strictEqual(typeof injector.get, 'function');
	});

	it('should fail when supplying targets with circular dependencies', () => {
		assert.throws(() => {
			createInjector({
				foo : { dependencies : [{ id : 'bar' }], factory : () => 'foo' },
				bar : { dependencies : [{ id : 'foo' }], factory : () => 'bar' }
			});
		}, new Error("looped injector dependency 'foo'"));
	});
});

describe('get', () => {
	it('should return available targets', () => {
		const injector = createInjector({
			foo : { dependencies : [], factory : () => 'baz' },
			bar : { dependencies : [{ id : 'foo' }], factory : ([ foo ]) => `${ foo }qux` }
		});

		assert.strictEqual(injector.get('foo'), 'baz');
		assert.strictEqual(injector.get('bar'), 'bazqux');
	});

	it('should fail when forcing undefined targets', () => {
		const injector = createInjector({});

		assert.throws(() => {
			// @ts-ignore
			injector.get('foo');
		}, new Error("bad injector target 'foo'"));
	});
});
