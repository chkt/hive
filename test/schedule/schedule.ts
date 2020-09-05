import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createLogger, log_level } from '@chkt/onceupon';
import { tokensToString } from '@chkt/onceupon/dist/format';
import { Injector } from '../../source/inject/injector';
import { AppCommonProvider } from '../../source/app/app';
import { createSchedule } from '../../source/schedule/schedule';


function mockCommonProvider(msgs:string[] = []) : AppCommonProvider {
	const logger = createLogger({
		threshold : log_level.debug,
		time : () => {
			return Promise.resolve((Date.now() % 1000).toString().padStart(4, '0'));
		},
		handle : async data => {
			msgs.push(tokensToString(data.tokens))
		}
	});

	return {
		logger,
		time : {
			now() { return 0; }
		}
	};
}

function mockInjector(provider:AppCommonProvider) : Injector<AppCommonProvider> {
	return {
		get(id) {
			if (id in provider) return provider[id];

			throw new Error();
		}
	}
}

function delay(ms:number) : Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

function delayUntil(interval:number) : Promise<void> {
	return delay(interval - Date.now() % interval);
}

function assertMessages(
	actual:ReadonlyArray<string>,
	expected:ReadonlyArray<{ expr : RegExp, timing? : number, maxDelay? : number }>
) : void {
	for (let i = 0, l = Math.max(actual.length, expected.length); i < l; i += 1) {
		if (actual.length <= i) assert.fail(`missing message ${ i }: ${ expected[i].valueOf() }`);
		else if (expected.length <= i) assert.fail(`missing test ${ i }: "${ actual[i] }"`);
		else {
			const expect = expected[i];
			const match = actual[i].match(expect.expr);

			if (match === null) assert.fail(`no match ${ i }: "${ actual[i] }" - expected ${ expect.expr.toString() }`);
			else {
				const time = Number.parseInt(match.groups?.time ?? '0', 10);

				if (expect.timing !== undefined) {
					assert(
						time >= expect.timing,
						`too short delay: ${ actual[i] } - expected ${ expect.timing }`
					);

					if (expect.maxDelay !== undefined) {
						assert(
							time <= expect.timing + expect.maxDelay,
							`too long delay: ${ actual[i] } - expected ${ expect.timing + expect.maxDelay }`
						);
					}
				}
			}
		}
	}
}


describe('createSchedule', () => {
	it('should create a schedule', () => {
		const schedule = createSchedule({
			injector : mockInjector(mockCommonProvider()),
			handler : async () => undefined,
			maxCount : 0
		});

		assert.strictEqual(typeof schedule, 'object');
		assert('stop' in schedule);
		assert.strictEqual(typeof schedule.stop, 'function');
	});

	it('should run a task at a defined interval', async () => {
		const msgs:string[] = [];
		const injector = mockInjector(mockCommonProvider(msgs));

		await delayUntil(1000);

		createSchedule({
			name : 'foo',
			injector,
			handler : async context => void injector.get('logger').message(`task ${ context.name } ${ context.no }`, log_level.verbose),
			interval : 100,
			offset : 50,
			maxCount : 3
		});

		await delay(400);
		await injector.get('logger').settle();

		assertMessages(msgs, [
			{ expr : /^(?<time>\d{4}) notice\s{2}foo started$/ },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[1\/3]$/, timing : 50, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 0$/, timing : 50, maxDelay: 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-5]ms]$/, timing : 50, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[2\/3]$/, timing : 150, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 1$/, timing : 150, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-5]ms]$/, timing : 150, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[3\/3]$/, timing : 250, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 2$/, timing : 250, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-5]ms]$/, timing : 250, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) notice\s{2}foo stopped \[3\/3]$/, timing : 250, maxDelay : 5 }
		]);
	});

	it('should run a task and stop when told to', async () => {
		const msgs:string[] = [];
		const injector = mockInjector(mockCommonProvider(msgs));

		await delayUntil(1000);

		const schedule = createSchedule({
			name : 'foo',
			injector,
			handler : async context => void injector.get('logger').message(`task ${ context.name } ${ context.no }`, log_level.verbose),
			interval : 100,
			offset : 25
		});

		await delay(300);

		schedule.stop();

		await injector.get('logger').settle();

		assertMessages(msgs, [
			{ expr : /^(?<time>\d{4}) notice\s{2}foo started$/, timing : 0, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[1]$/, timing : 25, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 0$/, timing : 25, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-5]ms]$/, timing : 25, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[2]$/, timing : 125, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 1$/, timing : 125, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-5]ms]$/, timing : 125, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[3]$/, timing : 225, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 2$/, timing : 225, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-5]ms]$/, timing : 225, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) notice\s{2}foo stopped \[3]$/, timing : 300 }
		]);
	});

	it('should capture throwing handlers', async () => {
		const msgs:string[] = [];
		const injector = mockInjector(mockCommonProvider(msgs));

		await delayUntil(1000);

		createSchedule({
			name : 'foo',
			injector,
			handler : async context => {
				if (context.no === 0) throw new Error(`bang ${ context.name} ${ context.no }`);
				else injector.get('logger').message(`task ${ context.name } ${ context.no }`, log_level.verbose);
			},
			interval : 100,
			offset : 0,
			maxCount : 3
		});

		await delay(400);
		await injector.get('logger').settle();

		assertMessages(msgs, [
			{ expr : /^(?<time>\d{4}) notice\s{2}foo started$/, timing : 0, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[1\/3]$/, timing : 100, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) error\s{3}Error 'bang foo 0'/, timing : 100, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) warn\s{4}foo failed \[[0-4]ms]$/, timing : 100, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[2\/3]$/, timing : 200, maxDelay : 50 },
			{ expr : /^(?<time>\d{4}) verbose task foo 1$/, timing : 200, maxDelay : 50 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-4]ms]$/, timing : 200, maxDelay : 50 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo triggered \[3\/3]$/, timing : 300, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) verbose task foo 2$/, timing : 300, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) info\s{4}foo completed \[[0-4]ms]$/, timing : 300, maxDelay : 5 },
			{ expr : /^(?<time>\d{4}) notice\s{2}foo stopped \[3\/3]$/, timing : 300, maxDelay : 5 }
		]);
	});
});
