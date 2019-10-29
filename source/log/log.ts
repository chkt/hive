export const enum log_level {
	level_fatal,
	level_error,
	level_warn,
	level_notice,
	level_info,
	level_verbose,
	level_debug
}

const logLevel = new Map([
	[ log_level.level_fatal, 'fatal' ],
	[ log_level.level_error, 'error' ],
	[ log_level.level_warn, 'warn' ],
	[ log_level.level_notice, 'notice' ],
	[ log_level.level_info, 'info' ],
	[ log_level.level_verbose, 'verbose' ],
	[ log_level.level_debug, 'debug' ]
]);

let currentLevel = log_level.level_warn;


export function getLogThreshold() : log_level {
	return currentLevel;
}

export function setLogThreshold(level:log_level) : void {
	currentLevel = level;
}


export function getLevelByName(name:string) : log_level {
	const low = name.toLowerCase();

	for (const [ key, value ] of logLevel.entries()) {
		if (value === low) return key;
	}

	throw new Error('not a log_level');
}

export function getNameOfLevel(level:log_level) : string {
	return logLevel.get(level) as string;
}


function isWithinThreshold(level:log_level, threshold:log_level) : boolean {
	return level <= threshold;
}

function isLoggable(level:log_level) : boolean {
	return level <= currentLevel;
}


function padTimeComponent(n:number) : string {
	return String(n).padStart(2, '0');
}

function getTime() : string {
	const now = new Date();

	return `${
		now.getUTCFullYear()
	}-${
		padTimeComponent(now.getUTCMonth() + 1)
	}-${
		padTimeComponent(now.getUTCDate())
	}T${
		padTimeComponent(now.getUTCHours())
	}:${
		padTimeComponent(now.getUTCMinutes())
	}:${
		padTimeComponent(now.getUTCSeconds())
	}Z`;
}

const enum token_type {
	time,
	level,
	message
}

interface LogToken {
	type : number;
	content : string;
}
type LogTokens = LogToken[];

function createTimeToken() : LogToken {
	return {
		type : token_type.time,
		content : getTime()
	};
}

function createLevelToken(level:log_level) : LogToken {
	return {
		type : token_type.level,
		content : getNameOfLevel(level).padEnd(7, ' ')
	};
}

function createMessageToken(message:string) : LogToken {
	return {
		type : token_type.message,
		content : message
	};
}


function messageFromTokens(tokens:LogTokens) : string {
	let message = '';

	for (const token of tokens) message += `${ token.content } `;

	return message.slice(0, message.length - 1) + '\n';
}


function send(message:string, level:log_level) : void {
	const buf = Buffer.from(message);

	if (isWithinThreshold(level, log_level.level_warn)) process.stderr.write(buf);
	else process.stdout.write(buf);
}


export  function logMessage(message:string, level:log_level = log_level.level_info) : void {
	if (!isLoggable(level)) return;

	const log = messageFromTokens([
		createTimeToken(),
		createLevelToken(level),
		createMessageToken(message)
	]);

	send(log, level);
}

export function logError(error:Error, level:log_level = log_level.level_error) : void {
	if (!isLoggable(level)) return;

	const log = messageFromTokens([
		createTimeToken(),
		createLevelToken(level),
		createMessageToken(error.stack as string)
	]);

	send(log, level);
}
