export type MimeType = [mime_type, mime_encoding];

export enum mime_type {
	json = 'application/json',
	html = 'text/html',
	text = 'text/plain'
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
