import * as assert from 'assert';
import { describe, it } from 'mocha';

import { isJsonConform } from '../../../source/common/base/Json';


describe('isJsonConform', () => {
	it('should return true if value is JsonConform', () => {
		assert.strictEqual(isJsonConform(null), true);
		assert.strictEqual(isJsonConform(false), true);
		assert.strictEqual(isJsonConform(true), true);
		assert.strictEqual(isJsonConform(0), true);
		assert.strictEqual(isJsonConform(1), true);
		assert.strictEqual(isJsonConform(-1), true);
		assert.strictEqual(isJsonConform(Number.MAX_SAFE_INTEGER), true);
		assert.strictEqual(isJsonConform(Number.MIN_SAFE_INTEGER), true);
		assert.strictEqual(isJsonConform(Number.MIN_VALUE), true);
		assert.strictEqual(isJsonConform(-Number.MIN_VALUE), true);
		assert.strictEqual(isJsonConform(Number.MAX_VALUE), true);
		assert.strictEqual(isJsonConform(-Number.MAX_VALUE), true);
		assert.strictEqual(isJsonConform(''), true);
		assert.strictEqual(isJsonConform('foo'), true);
		assert.strictEqual(isJsonConform('foo\nbar'), true);
		assert.strictEqual(isJsonConform({}), true);
		assert.strictEqual(isJsonConform({ foo : null, bar : true, baz : 1, quux : 'foo' }), true);
		assert.strictEqual(isJsonConform([]), true);
		assert.strictEqual(isJsonConform([ null, true, 1, 'foo' ]), true);
		assert.strictEqual(isJsonConform({ foo : [ null, true, 1, 'foo' ] }), true);
		assert.strictEqual(isJsonConform([{ foo : null}, { bar : true }, { baz : 1 }, { qux : 'foo' }]), true);
		assert.strictEqual(isJsonConform({ toJson : (key:string) => key }), true);
	});

	it('should return false if value is not JsonConform', () => {
		assert.strictEqual(isJsonConform(undefined), false);
		assert.strictEqual(isJsonConform(BigInt(1)), false);
		assert.strictEqual(isJsonConform(Symbol()), false);
		assert.strictEqual(isJsonConform(/^.*$/), false);
		assert.strictEqual(isJsonConform([ undefined ]), false);
		assert.strictEqual(isJsonConform({ foo : undefined }), false);
		assert.strictEqual(isJsonConform({ foo : () => undefined }), false);
		assert.strictEqual(isJsonConform({ toJSON : (key:string) => key }), false);
	});
});
