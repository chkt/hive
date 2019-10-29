import * as assert from 'assert';
import { describe, it } from 'mocha';
import { getLogThreshold, log_level, logMessage, setLogThreshold } from "../../source/log/log";


function mockWrite(stream:any) {
	const safe = stream.write;
	const messages:string[] = [];

	stream.write = (str:string, encoding:string) : boolean => {
		messages.push(str);

		return true;
	};

	return {
		messages,
		restore : () : void => {
			stream.write = safe;
		}
	};
}

function testSteam(stream:any, cb:() => void) : string {
	const safe = stream.write;
	let messages = '';

	stream.write = (str:string, encoding?:string) : boolean => {
		messages += str;

		return true;
	};

	cb();
	stream.write = safe;

	return messages;
}


describe('logMessage', () => {
	it('should log a basic message', () => {
		const m = testSteam(process.stderr, () => {
			logMessage('foo', log_level.level_warn);
		});

		assert(m.search(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z warn {4}foo\n$/) === 0);
	});

	it('should report the current log threshold', () => {
		setLogThreshold(log_level.level_warn);

		assert.strictEqual(getLogThreshold(), log_level.level_warn);

		setLogThreshold(log_level.level_info);

		assert.strictEqual(getLogThreshold(), log_level.level_info);
	});

	it('should allow setting the log threshold', () => {
		setLogThreshold(log_level.level_info);

		const m0 = testSteam(process.stdout, () => {
			logMessage('foo', log_level.level_verbose);
			logMessage('bar', log_level.level_info);
		});

		assert(m0.search(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z info {4}bar\n$/) === 0);

		setLogThreshold(log_level.level_verbose);

		const m1 = testSteam(process.stdout, () => {
			logMessage('foo', log_level.level_verbose);
			logMessage('bar', log_level.level_info);
		});

		assert(m1.search(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z verbose foo\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z info {4}bar\n$/) === 0);
	});
});
