import * as assert from 'assert';
import { describe, it } from 'mocha';

import ProcessEnv = NodeJS.ProcessEnv;
import { getKey, hasKey } from '../../source/config/env';


function mockEnv<T>(env:ProcessEnv, fn:() => T) : T {
	const prev = process.env;

	process.env = env;

	const res = fn();

	process.env = prev;

	return res;
}


describe('hasKey', () => {
	it('should assert environment key existence', () => {
		mockEnv({
			'FOO' : 'bar'
		}, () => {
			assert(hasKey('FOO'));
			assert(!hasKey('BAR'));
		});
	});
});

describe('getKey', () => {
	it('should return an existing environment key', () => {
		mockEnv({
			'FOO' : 'bar'
		}, () => {
			assert.strictEqual(getKey('FOO'), 'bar');
			assert.strictEqual(getKey('BAR'), undefined);
		});
	});
});
