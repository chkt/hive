import Timeout = NodeJS.Timeout;
import { createReceiver, Handler } from './signal';


export interface ReportData {
	readonly attempt : number;
	readonly maxAttempts : number;
	readonly msPassed : number;
	readonly msMax : number;
	readonly msNext : number;
	readonly reason : unknown;
}

interface Context<R> {
	readonly action : (abort:Handler) => Promise<R>;
	readonly report? : (data:ReportData) => boolean;
	readonly abort? : Handler;
	readonly maxAttempts? : number;
	readonly maxWait? : number;
}


const defaultContext = {
	report : () => undefined,
	abort : createReceiver(),
	maxAttempts : 5,
	maxWait : 60000
}


export function reportToString(data:ReportData) : string {
	return `retry attempt ${ data.attempt }/${ data.maxAttempts }, next in ${ data.msNext }ms`;
}

export function reportAbort(data:ReportData) : string {
	return `retry attempt ${ data.attempt}/${ data.maxAttempts}, aborting`;
}

export function retry<R>(config:Context<R>) : Promise<R> {
	const context = { ...defaultContext, ...config };

	const slope = context.maxWait / (context.maxAttempts - 1) ** 2;
	let attempt = 0;
	let msPassed = 0;
	let timeout:Timeout;
	let lastReason:unknown;

	return new Promise((resolve, reject) => {
		context.abort.onSignal(() => {
			clearTimeout(timeout);
			reject(lastReason);

			return Promise.resolve();
		});

		(function op() {
			context.abort.delegateWhile(context.action)
				.then(resolve)
				.catch(reason => {
					if (context.abort.numReceived() !== 0) return reject(reason);

					attempt += 1;

					const msNext = Math.floor(slope * attempt ** 2 - msPassed);

					if (attempt >= context.maxAttempts) return reject(reason);

					try {
						if (!context.report({
							attempt,
							maxAttempts : context.maxAttempts,
							msPassed,
							msMax : context.maxWait,
							msNext,
							reason
						})) return reject(reason);
					}
					catch (err) {
						return reject(err);
					}

					msPassed += msNext;

					timeout = setTimeout(op, msNext);
					lastReason = reason;
				});
		})();
	});
}
