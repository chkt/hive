import * as assert from 'assert';
import { describe, it } from 'mocha';

import { httpResponseCode } from '../../source/io/http';
import { codeOfStatus, filterView, reply_status } from '../../source/controller/apiTransforms';
import { ControllerContext } from "../../source/controller/controller";
import { Switch } from "@chkt/states/dist/state";
import { JsonConformHash } from "../../source/common/base/Json";


function mockContext(view:JsonConformHash = {}) : ControllerContext {
	const res = { view };

	return res as ControllerContext;
}

function mockSwitch() : Switch<ControllerContext> {
	const res = {
		success : (context:ControllerContext) => ({ id : 'success', context }),
		default : (context:ControllerContext) => ({ id : 'default', context }),
		failure : (context:ControllerContext) => ({ id : 'failure', context })
	};

	return res as Switch<ControllerContext>;
}


describe('codeOfStatus', () => {
	it('should return a return code for each reply_status', () => {
		assert.strictEqual(codeOfStatus(reply_status.action_unavailable), httpResponseCode.noMethod);
		assert.strictEqual(codeOfStatus(reply_status.auth_failed), httpResponseCode.noAuth);
		assert.strictEqual(codeOfStatus(reply_status.auth_malformed), httpResponseCode.noAuth);
		assert.strictEqual(codeOfStatus(reply_status.endpoint_unavailable), httpResponseCode.notFound);
		assert.strictEqual(codeOfStatus(reply_status.error), httpResponseCode.error);
		assert.strictEqual(codeOfStatus(reply_status.mime_unsupported), httpResponseCode.malformed);
		assert.strictEqual(codeOfStatus(reply_status.ok), httpResponseCode.ok);
		assert.strictEqual(codeOfStatus(reply_status.request_malformed), httpResponseCode.malformed);
		assert.strictEqual(codeOfStatus(reply_status.request_unsupported), httpResponseCode.malformed);
		assert.strictEqual(codeOfStatus(reply_status.resource_missing), httpResponseCode.notFound);
		assert.strictEqual(codeOfStatus(reply_status.service_unavailable), httpResponseCode.noService);
	});

	it('should return 500 for unidentified strings', () => {
		assert.strictEqual(codeOfStatus('foo'), httpResponseCode.error);
	});

	it('should return 500 for undefined values', () => {
		assert.strictEqual(codeOfStatus(undefined), httpResponseCode.error);
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
