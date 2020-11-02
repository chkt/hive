type trigger<R> = () => Promise<R>;

export interface ReportData {
	readonly attempt : number;
	readonly maxAttempts : number;
	readonly msPassed : number;
	readonly msMax : number;
	readonly msNext : number;
	readonly reason : unknown;
}

interface Context<R> {
	readonly action : trigger<R>;
	readonly report? : (data:ReportData) => boolean;
	readonly maxAttempts? : number;
	readonly maxWait? : number;
}


export function reportToString(data:ReportData) : string {
	return `retry: attempt ${ data.attempt }/${ data.maxAttempts }, next in ${ data.msNext }ms`;
}

export function reportAbort(data:ReportData) : string {
	return `retry: attempt ${ data.attempt}/${ data.maxAttempts}, aborting`;
}

export function retry<R>(config:Context<R>) : Promise<R> {
	const context = {
		report : () => undefined,
		maxAttempts : 5,
		maxWait : 60000,
		...config
	};

	const slope = context.maxWait / (context.maxAttempts - 1) ** 2;
	let attempt = 0;
	let msPassed = 0;

	return new Promise((resolve, reject) => {
		(function op() {
			context.action()
				.then(resolve)
				.catch(reason => {
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

					setTimeout(op, msNext);
				});
		})();
	});
}
