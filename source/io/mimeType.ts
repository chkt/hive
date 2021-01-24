export type MimeType = [mime_type, mime_encoding];

export interface MimeParts {
	readonly topType : string;
	readonly subType : string;
}

export enum mime_type {
	bytes = 'application/octet-stream',
	json = 'application/json',
	html = 'text/html',
	text = 'text/plain',
	sse = 'text/event-stream'
}

export enum mime_encoding {
	utf8 = 'utf-8'
}


export function isMimeType(str:string) : str is mime_type {
	return Object.values(mime_type).includes(str as mime_type);
}

export function isEncoding(str:string) : str is mime_encoding {
	return Object.values(mime_encoding).includes(str as mime_encoding);
}


export function decodeMimeType(mime:string) : MimeParts {
	const [ topType, subType ] = mime.toLowerCase().split('/', 2);

	if (topType === '' || subType === undefined || subType === '') throw new Error(`'${ mime }' not a mime type`);

	return { topType, subType };
}
