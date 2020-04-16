import { Logger } from "@chkt/onceupon";


export interface LoggerHost {
	readonly logger : Logger;
}


export function applyLoggerHost<T extends object>(host:T, logFn:() => Logger) : T & LoggerHost {
	return Object.create(host, {
		logger : { get : logFn, enumerable : true }
	});
}
