import * as assert from 'assert';
import { describe, it } from 'mocha';

import { unlink, writeFile } from 'fs';
import { Config } from '../../source/config/config';
import { createFileConfig } from '../../source/config/file';


describe('createFileConfig', () => {
	const path = './test/config.json';

	beforeEach(done => {
		writeFile(path, Buffer.from(JSON.stringify({
			foo : { value : 'bar' }
		})), done);
	});

	afterEach(done => {
		unlink(path, done);
	});

	it('should return a Config', async () => {
		const config = await createFileConfig(path);

		assert.strictEqual(config.hasValue('foo'), true);
		assert.strictEqual(config.isReadable('foo'), true);
		assert.strictEqual(config.getValue('foo'), 'bar');
	});

	it('should update the Config on file changes', function(done) {
		this.timeout(11000);

		const config:Promise<Config> = createFileConfig(path, {}, async cfg => {
			assert.strictEqual((await config).getValue('foo'), 'bar');
			assert.strictEqual((await cfg).getValue('foo'), 'baz');

			done();
		})
			.then(async cfg => {
				assert.strictEqual((await cfg).getValue('foo'), 'bar');

				return cfg;
			})
			.then(cfg => new Promise(resolve => {
				setTimeout(() => resolve(cfg), 1000);
			}) as Promise<Config>)
			.then(cfg => {
				writeFile(path, Buffer.from(JSON.stringify({
					foo : { value : 'baz' }
				})), () => undefined);

				return cfg;
			});
	});
});
