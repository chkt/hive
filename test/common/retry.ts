import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createSignal } from '../../source/common/signal';
import { reportAbort, ReportData, reportToString, retry } from '../../source/common/retry';


function delay(ms:number = 0) : Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

function reportData(msg:string[], ret:boolean, data:ReportData) : boolean {
	msg.push(String(data.reason));
	msg.push(ret ? reportToString(data) : reportAbort(data));

	return ret;
}


describe('retry', () => {
	it ('should perform the specified number of retries', async () => {
		const msg:string[] = [];
		const start = Date.now();

		try {
			await retry({
				action: () => Promise.reject(new Error('bang')),
				report: reportData.bind(null, msg, true),
				maxWait : 600,
				maxAttempts : 5
			});

			assert.fail();
		}
		catch (err) {
			msg.push(String(err));

			assert.deepStrictEqual(msg, [
				'Error: bang',
				'retry attempt 1/5, next in 37ms',
				'Error: bang',
				'retry attempt 2/5, next in 113ms',
				'Error: bang',
				'retry attempt 3/5, next in 187ms',
				'Error: bang',
				'retry attempt 4/5, next in 263ms',
				'Error: bang'
			]);

			assert(Date.now() - start >= 600);
		}
	});

	it('should abort on success', async () => {
		const msg:string[] = [];
		let res:string = 'bar';
		const start = Date.now();

		try {
			res = await retry({
				action : () => Promise.resolve('foo'),
				report : reportData.bind(null, msg, false),
				maxWait : 600,
				maxAttempts : 5
			});
		}
		catch (err) {
			assert.fail();
		}

		assert.deepStrictEqual(msg, []);
		assert.strictEqual(res, 'foo');
		assert(Date.now() - start < 37);
	});

	it('should abort on returning false in reporter', async () => {
		const msg:string[] = [];
		const start = Date.now();

		try {
			await retry({
				action : () => Promise.reject(new Error('bang')),
				report : data => reportData(msg, data.attempt !== 3, data),
				maxWait : 600,
				maxAttempts : 5
			});

			assert.fail();
		}
		catch (err) {
			const diff = Date.now() - start;

			msg.push(String(err));

			assert.deepStrictEqual(msg, [
				'Error: bang',
				'retry attempt 1/5, next in 37ms',
				'Error: bang',
				'retry attempt 2/5, next in 113ms',
				'Error: bang',
				'retry attempt 3/5, aborting',
				'Error: bang'
			]);

			assert(diff >= 150 && diff < 337);
		}
	});

	it('should abort on catching reporter errors', async () => {
		const msg:string[] = [];
		const start = Date.now();

		try {
			await retry({
				action : () => Promise.reject(new Error('bang')),
				report : data => {
					if (data.attempt !== 3) reportData(msg, true, data);
					else throw new Error('kaboom');

					return true;
				},
				maxWait : 600,
				maxAttempts : 5
			});

			assert.fail();
		}
		catch (err) {
			const diff = Date.now() - start;

			msg.push(String(err));

			assert.deepStrictEqual(msg, [
				'Error: bang',
				'retry attempt 1/5, next in 37ms',
				'Error: bang',
				'retry attempt 2/5, next in 113ms',
				'Error: kaboom'
			]);

			assert(diff >= 150 && diff < 337);
		}
	});

	it('should delegate abort signal during retry', async () => {
		const msg:string[] = [];
		const signal = createSignal();
		const start = Date.now();

		retry({
			action : abort => new Promise(resolve => {
				delay(6000).then(resolve.bind(null, 'foo'));
				abort.onSignal(async () => resolve('bar'));
			}),
			report : reportData.bind(null, msg, true),
			abort : signal.receiver,
			maxWait : 6000,
			maxAttempts : 2
		})
			.then(value => msg.push(value as string))
			.catch(() => assert.fail());


		await delay(100);
		await signal.send();
		await delay();

		assert.deepStrictEqual(msg, [ 'bar' ]);
		assert(Date.now() - start < 120);
	});

	it('should abort on abort signal while waiting', async () => {
		const msg:string[] = [];
		const signal = createSignal();
		const start = Date.now();

		retry({
			action : abort => {
				abort.onSignal(async () => void msg.push('aborted action'));

				return Promise.reject('bang');
			},
			report : reportData.bind(null, msg, true),
			abort : signal.receiver,
			maxWait : 600,
			maxAttempts : 2
		})
			.then(value => msg.push(value as string))
			.catch(reason => msg.push(reason as string));

		await delay();
		await signal.send();
		await delay();

		assert.deepStrictEqual(msg, [
			'bang',
			'retry attempt 1/2, next in 600ms',
			'bang'
		]);
		assert(Date.now() - start < 600);
	});

	it('should abort on abort signal after retry', async () => {
		const msg:string[] = [];
		const signal = createSignal();

		retry({
			action : async () => {
				await delay(100);

				throw new Error('foo');
			},
			report : reportData.bind(null, msg, true),
			abort : signal.receiver,
			maxWait : 6000,
			maxAttempts : 2
		})
			.then(
				value => msg.push(String(value)),
				reason => msg.push(String(reason))
			);

		await signal.send();
		await delay(100);

		assert.deepStrictEqual(msg, [
			'Error: foo'
		]);
	});
});
