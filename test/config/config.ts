import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createCipheriv, randomBytes } from 'crypto';
import { createConfig, scheme } from '../../source/config/config';


describe('hasValue', () => {
	it('should return true if the underlying data has a value', () => {
		const config = createConfig({
			foo : { value : 'bar' },
			bar : { value : 'baz', keyName : 'qux' }
		});

		assert(config.hasValue('foo'));
		assert(config.hasValue('bar'));
		assert(!config.hasValue('baz'));
	});
});

describe('isReadable', () => {
	it('should return false if a key does not exist', () => {
		const config = createConfig({});

		assert(!config.isReadable('foo'));
	});

	it('should return true if a key is plaintext encoded', () => {
		const config = createConfig({
			foo : { value : 'bar' },
		});

		assert(config.isReadable('foo'));
	});

	it('should return false if a key is encrypted and no keyName exists', () => {
		const config = createConfig({
			foo : { value : 'bar', keyName : 'baz' }
		});

		assert(!config.isReadable('foo'));
	});

	it('should return true if a keyName is encrypted and a keyName exists', () => {
		const config = createConfig({
			foo : { value : 'bar', keyName : 'baz' }
		}, {
			baz : { scheme : scheme.aes256, key : 'qux' }
		});

		assert(config.isReadable('foo'));
	});
});

describe('getValue', () => {
	it('should return an existing plaintext value', () => {
		const config = createConfig({
			foo : { value : 'bar' }
		});

		assert.strictEqual(config.getValue('foo'), 'bar');
	})

	it('should return an existing encrypted value', () => {
		const key = randomBytes(32);
		const iv = randomBytes(16);

		const cipher = createCipheriv(scheme.aes256, key, iv);
		const encrypted = `${
			iv.toString('hex') }:${
			cipher.update('bar', 'utf8', 'hex') }${
			cipher.final('hex') }`;

		const config = createConfig({
			baz : { value : encrypted, keyName : 'qux' }
		}, {
			qux : { scheme : scheme.aes256, key : key.toString('hex') }
		})

		assert.strictEqual(config.getValue('baz'), 'bar');
	});

	it('should fail for nonexisting items', () => {
		const config = createConfig({});

		assert.throws(() => {
			config.getValue('foo');
		}, new Error('no value \'foo\''));
	});

	it('should fail for encrypted items with missing or malformed encryption keys', () => {
		const config = createConfig({
			foo : { value : 'foo', keyName : 'bar' },
			baz : { value : '11223344556677889900aabbccddeeff:baz', keyName : 'qux' }
		}, {
			qux : { scheme : scheme.aes256, key : randomBytes(31).toString('hex') }
		});

		assert.throws(() => {
			config.getValue('foo');
		}, new Error(`missing key 'foo'`));

		assert.throws(() => {
			config.getValue('baz');
		}, new Error(`malformed key 'baz'`));
	});

	it('should fail for encrypted items with missing or malformed initialization vectors', () => {
		const key = randomBytes(32);

		const config = createConfig({
			foo : { value : '11223344556677889900aabbccddee:bar', keyName : 'baz' },
			bar : { value : 'qux', keyName : 'baz' }
		}, {
			baz : { scheme : scheme.aes256, key : key.toString('hex') }
		});

		assert.throws(() => {
			config.getValue('foo');
		}, new Error(`malformed iv 'foo'`));

		assert.throws(() => {
			config.getValue('bar');
		}, new Error(`missing iv 'bar'`));
	});
});
