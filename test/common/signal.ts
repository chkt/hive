import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createSignal } from '../../source/common/signal';


async function delay(ms:number = 0) : Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

describe('createSignal', () => {
	it('should send a signal to handler', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async handler => {
			msgs.push(`received level 0, ${ handler.numReceived() }`);
		});

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'sending, 0',
			'received level 0, 1',
			'sent, 1'
		]);
	});

	it('should send a signal along handler chain', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async handler => {
			msgs.push(`received level 0, ${ handler.numReceived() }`);
		});

		msgs.push(`level 0, ${ signal.receiver.numReceived() }`);

		new Promise<void>(async resolve => {
			const receiver = signal.receiver.extend().onSignal(async () => {
				msgs.push(`received level 1, ${ receiver.numReceived() }`);
				resolve();
			});

			msgs.push(`level 1, ${ receiver.numReceived() }`);

			await new Promise<void>(resolve2 => {
				const receiver2 = receiver.extend().onSignal(async () => {
					msgs.push(`received level 2, ${ receiver2.numReceived() }`);
					resolve2();
				});

				msgs.push(`level 2, ${ receiver.numReceived() }`);
			});

			msgs.push('resolved p2');
		})
			.then(() => msgs.push('resolved p1'));

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'level 0, 0',
			'level 1, 0',
			'level 2, 0',
			'sending, 0',
			'received level 2, 1',
			'resolved p2',
			'received level 1, 1',
			'resolved p1',
			'received level 0, 1',
			'sent, 1'
		]);
	});

	it('should handle ephemeral handler chains', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async () => {
			msgs.push(`received level 0, ${ signal.receiver.numReceived() }`);
		});

		msgs.push(`level 0, ${ signal.receiver.numReceived() }`);

		signal.receiver
			.extendWhile(receiver => new Promise(resolve => {
				receiver.onSignal(async () => {
					msgs.push(`received level 1, ${ receiver.numReceived() }`)
					resolve('foo');
				});

				msgs.push(`level 1, ${ receiver.numReceived() }`);

				receiver
					.extendWhile(async receiver2 => {
						receiver2.onSignal(async () => {
							msgs.push(`received level 2, ${ receiver2.numReceived() }`);
						});

						msgs.push(`level 2, ${ receiver2.numReceived() }`);

						return 'bar';
					})
					.then(value => msgs.push(`resolved p2 ${ value }`));
			}))
			.then(value => msgs.push(`resolved p1 ${ value }`));

		await delay();

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'level 0, 0',
			'level 1, 0',
			'level 2, 0',
			'resolved p2 bar',
			'sending, 0',
			'received level 1, 1',
			'received level 0, 1',
			'resolved p1 foo',
			'sent, 1'
		]);
	});

	it('should handle ephemeral handler chains with rejected values', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async () => {
			msgs.push(`received level 0, ${ signal.receiver.numReceived() }`);
		});

		msgs.push(`level 0, ${ signal.receiver.numReceived() }`);

		signal.receiver
			.extendWhile(receiver => new Promise(resolve => {
				receiver.onSignal(async () => {
					msgs.push(`received level 1, ${ receiver.numReceived() }`)
					resolve('foo');
				});

				msgs.push(`level 1, ${ receiver.numReceived() }`);

				receiver
					.extendWhile(async receiver2 => {
						receiver2.onSignal(async () => {
							msgs.push(`received level 2, ${ receiver2.numReceived() }`);
						});

						msgs.push(`level 2, ${ receiver2.numReceived() }`);

						throw new Error('bar');
					})
					.then(
						value => msgs.push(`resolved p2 ${ value }`),
						reason => msgs.push(`rejected p2 ${ String(reason) }`)
					);
			}))
			.then(value => msgs.push(`resolved p1 ${ value }`));

		await delay();

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'level 0, 0',
			'level 1, 0',
			'level 2, 0',
			'rejected p2 Error: bar',
			'sending, 0',
			'received level 1, 1',
			'received level 0, 1',
			'resolved p1 foo',
			'sent, 1'
		]);
	});

	it('should handle delegated handler chains', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async handler => {
			msgs.push(`received level 0, ${ handler.numReceived() }`);
		});

		msgs.push(`level 0, ${ signal.receiver.numReceived() }`);

		new Promise(async resolve => {
			const receiver = signal.receiver.delegate().onSignal(async () => {
				msgs.push(`received level 1, ${ receiver.numReceived() }`);
				resolve('baz');
			});

			msgs.push(`level 1, ${ receiver.numReceived() }`);

			const value2 = await new Promise(resolve2 => {
				const receiver2 = receiver.delegate().onSignal(async () => {
					msgs.push(`received level 2, ${ receiver2.numReceived() }`);
					resolve2('foo');
				});

				msgs.push(`level 2, ${ receiver.numReceived() }`);
			});

			msgs.push(`resolved p2 ${ value2 }`);

			resolve('bar');
		})
			.then(value => msgs.push(`resolved p1 ${ value }`));

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'level 0, 0',
			'level 1, 0',
			'level 2, 0',
			'sending, 0',
			'received level 2, 1',
			'resolved p2 foo',
			'resolved p1 bar',
			'sent, 1'
		]);
	});

	it('should handle ephemeral delegated handler chains', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async () => {
			msgs.push(`received level 0, ${ signal.receiver.numReceived() }`);
		});

		msgs.push(`level 0, ${ signal.receiver.numReceived() }`);

		signal.receiver
			.delegateWhile(receiver => new Promise(resolve => {
				receiver.onSignal(async () => {
					msgs.push(`received level 1, ${ receiver.numReceived() }`)
					resolve('foo');
				});

				msgs.push(`level 1, ${ receiver.numReceived() }`);

				receiver
					.delegateWhile(async receiver2 => {
						receiver2.onSignal(async () => {
							msgs.push(`received level 2, ${ receiver2.numReceived() }`);
						});

						msgs.push(`level 2, ${ receiver2.numReceived() }`);

						return 'bar';
					})
					.then(value => msgs.push(`resolved p2 ${ value }`));
			}))
			.then(value => msgs.push(`resolved p1 ${ value }`));

		await delay();

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'level 0, 0',
			'level 1, 0',
			'level 2, 0',
			'resolved p2 bar',
			'sending, 0',
			'received level 1, 1',
			'resolved p1 foo',
			'sent, 1'
		]);
	});

	it('should handle ephemeral delegated handler chains with rejected values', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver.onSignal(async () => {
			msgs.push(`received level 0, ${ signal.receiver.numReceived() }`);
		});

		msgs.push(`level 0, ${ signal.receiver.numReceived() }`);

		signal.receiver
			.delegateWhile(receiver => new Promise(resolve => {
				receiver.onSignal(async () => {
					msgs.push(`received level 1, ${ receiver.numReceived() }`)
					resolve('foo');
				});

				msgs.push(`level 1, ${ receiver.numReceived() }`);

				receiver
					.delegateWhile(async receiver2 => {
						receiver2.onSignal(async () => {
							msgs.push(`received level 2, ${ receiver2.numReceived() }`);
						});

						msgs.push(`level 2, ${ receiver2.numReceived() }`);

						throw new Error('bar');
					})
					.then(
						value => msgs.push(`resolved p2 ${ value }`),
						reason => msgs.push(`rejected p2 ${ String(reason) }`)
					);
			}))
			.then(value => msgs.push(`resolved p1 ${ value }`));

		await delay();

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'level 0, 0',
			'level 1, 0',
			'level 2, 0',
			'rejected p2 Error: bar',
			'sending, 0',
			'received level 1, 1',
			'resolved p1 foo',
			'sent, 1'
		]);
	});

	it('should propagate signals irrespective of handling errors', async () => {
		const msgs:string[] = [];
		const signal = createSignal();

		signal.receiver
			.onSignal(async handler => {
				msgs.push(`received level 0, ${ handler.numReceived() }`);
			})
			.extend()
			.onSignal(handler => {
				msgs.push(`received level 1, ${ handler.numReceived() }`);

				throw new Error()
			});

		msgs.push(`sending, ${ signal.receiver.numReceived() }`);

		await signal.send();

		msgs.push(`sent, ${ signal.receiver.numReceived() }`);

		assert.deepStrictEqual(msgs, [
			'sending, 0',
			'received level 1, 1',
			'received level 0, 1',
			'sent, 1'
		]);
	});
});
