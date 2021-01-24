import * as assert from 'assert';
import { describe, it } from 'mocha';

import { http_reply_code } from '../../source/io/http';
import { codeOfStatus, filterView, reply_status } from '../../source/controller/apiTransforms';
import { ControllerContext } from "../../source/controller/controller";
import { Switch } from "@chkt/states/dist/state";
import { JsonConformHash } from "../../source/common/base/Json";


function mockContext(view:JsonConformHash = {}) : ControllerContext {
	const res = { view };

	return res as ControllerContext;
}

function mockSwitch() : Switch<ControllerContext> {
	const next:Partial<Switch<ControllerContext>> = {
		success : context => ({ id : 'success', context }),
		default : context => ({ id : 'default', context }),
		failure : context => ({ id : 'failure', context })
	};

	return next as Switch<ControllerContext>;
}


describe('codeOfStatus', () => {
	it('should return a return code for each reply_status', () => {
		assert.strictEqual(codeOfStatus(reply_status.action_unavailable), http_reply_code.no_method);
		assert.strictEqual(codeOfStatus(reply_status.auth_failed), http_reply_code.no_auth);
		assert.strictEqual(codeOfStatus(reply_status.auth_malformed), http_reply_code.no_auth);
		assert.strictEqual(codeOfStatus(reply_status.endpoint_unavailable), http_reply_code.not_found);
		assert.strictEqual(codeOfStatus(reply_status.error), http_reply_code.error);
		assert.strictEqual(codeOfStatus(reply_status.mime_unsupported), http_reply_code.malformed);
		assert.strictEqual(codeOfStatus(reply_status.ok), http_reply_code.ok);
		assert.strictEqual(codeOfStatus(reply_status.request_malformed), http_reply_code.malformed);
		assert.strictEqual(codeOfStatus(reply_status.request_unsupported), http_reply_code.malformed);
		assert.strictEqual(codeOfStatus(reply_status.resource_missing), http_reply_code.not_found);
		assert.strictEqual(codeOfStatus(reply_status.service_unavailable), http_reply_code.no_service);
	});

	it('should return 500 for unidentified strings', () => {
		assert.strictEqual(codeOfStatus('foo'), http_reply_code.error);
	});

	it('should return 500 for undefined values', () => {
		assert.strictEqual(codeOfStatus(undefined), http_reply_code.error);
	})
});

describe('filterView', () => {
	it('should return the success state if a view exists', async () => {
		const context = mockContext({ foo : 'bar' });

		assert.deepStrictEqual(await filterView(context, mockSwitch()), { id : 'success', context });
	});

	it('should return the failure state if no view exists', async () => {
		const context = mockContext();

		assert.deepStrictEqual(await filterView(context, mockSwitch()), { id : 'failure', context });
	});
});
