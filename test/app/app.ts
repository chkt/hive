import { describe, it } from "mocha";
import * as assert from "assert";

import { IncomingMessage, ServerResponse } from 'http';
import { createState } from '@chkt/states/dist/state';
import { contextToState } from '@chkt/states/dist/traverse';
import { Logger } from '@chkt/onceupon';
import { Injector } from '../../source/inject/injector';
import { HttpContext } from '../../source/io/context';
import { createApp, LoggingProvider } from '../../source/app/app';


function mockInjector(msgs:string[] = []) : Injector<LoggingProvider> {
	return {
		get(id) {
			if (id === 'logger') {
				const logger:Partial<Logger> = {
					failure(reason) {
						msgs.push(reason instanceof Error ? reason.message : reason);

						return this as Logger;
					}
				}

				return logger as Logger;
			}

			throw new Error();
		}
	}
}

function mockResolver(props:object = {}) : contextToState<HttpContext> {
	return async context => ({ ...createState('', context), ...props });
}

function mockIncomingMessage(props:object = {}) : IncomingMessage {
	const msg = { ...props };

	return msg as IncomingMessage;
}

function mockServerResponse(props:object = {}) : ServerResponse {
	const res = { ...props };

	return res as ServerResponse;
}

describe('createApp', () => {
	it("should return a request listener", () => {
		const app = createApp({
			injector : mockInjector(),
			resolve : mockResolver()
		});

		assert(typeof app === 'function');
	});

	it("should resolve a noop request", () => {
		const app = createApp({
			injector : mockInjector(),
			resolve : mockResolver()
		});

		const req = mockIncomingMessage();
		const rep = mockServerResponse({});

		return app(req, rep);
	});

	it("should log bad requests", async () => {
		let repCode, repMessage, repHeaders, repBody = Buffer.from('');
		const messages:string[] = [];

		const req = mockIncomingMessage();
		const rep = mockServerResponse({
			writeHead : (code:number, message:string, headers:object) => {
				repCode = code;
				repMessage = message;
				repHeaders = headers;
			},
			write : (body:Buffer) => {
				repBody = body;
			}
		});

		const app = createApp({
			injector : mockInjector(messages),
			resolve : mockResolver({
				error : new Error('foo')
			})
		});

		await app(req, rep);

		assert.strictEqual(repCode, 500);
		assert.strictEqual(repMessage, 'Internal Server Error');
		assert.deepStrictEqual(repHeaders, {
			'Content-Type' : 'text/plain; charset=utf-8',
			'Content-Length' : '27'
		});
		assert.strictEqual(repBody.toString(), '500 - Internal Server Error');
		assert.deepStrictEqual(messages, [ 'foo' ]);
	});
});
