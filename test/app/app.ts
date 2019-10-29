import { describe, it } from "mocha";
import * as assert from "assert";

import { StateDescriptionMap } from "@chkt/states/dist/create";

import { IncomingMessage, ServerResponse } from 'http';
import { createApp } from "../../source/app/app";
import { HttpContext } from "../../source/io/context";
import { RouteDescriptions } from "../../source/route/route";
import { noop } from "../../source/app/requestTransforms";


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
		const resolve:StateDescriptionMap<HttpContext> = {
			route : {
				transform : noop,
				targets : [{ id : 'end' }]
			}
		};
		const routes:RouteDescriptions = [];
		const app = createApp(resolve, routes);

		assert(typeof app === 'function');
	});

	it("should resolve a noop request", () => {
		const resolve:StateDescriptionMap<HttpContext> = {
			before_route : {
				transform : async (context, next) => {
					context.reply.end();

					return next.default(context);
				},
				targets : [{ id : 'end' }]
			},
			route : {
				transform : noop,
				targets : [{ id : 'end' }]
			}
		};
		const routes:RouteDescriptions = [];
		const app = createApp(resolve, routes);

		let called = false;
		const req = mockIncomingMessage();
		const rep = mockServerResponse({
			end : () => { called = true; }
		});
		app(req, rep);

		assert.strictEqual(called, true);
	});

	it("should log bad requests", async () => {
		const resolve:StateDescriptionMap<HttpContext> = {
			before_route : {
				transform : (context, next) => Promise.reject(new Error('bang')),
				targets : [{ id : 'end' }]
			},
			route : {
				transform : noop,
				targets : [{ id : 'end' }]
			}
		};
		const routes:RouteDescriptions = [];

		let repCode, repMessage, repHeaders, repBody = Buffer.from('');
		let ended = false;

		const req = mockIncomingMessage();
		const rep = mockServerResponse({
			writeHead : (code:number, message:string, headers:object) => {
				repCode = code;
				repMessage = message;
				repHeaders = headers;
			},
			write : (body:Buffer) => {
				repBody = body;
			},
			end : () => { ended = true; }
		});

		const app = createApp(resolve, routes);
		await app(req, rep);

		assert.strictEqual(repCode, 500);
		assert.strictEqual(repMessage, 'Internal Server Error');
		assert.deepStrictEqual(repHeaders, {
			'Content-Type' : 'text/plain; charset=utf-8',
			'Content-Length' : '27'
		});
		assert.strictEqual(repBody.toString(), '500 - Internal Server Error');
	});
});
