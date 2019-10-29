import { IncomingMessage } from "http";

import { isEncoding, isMimeType, mime_encoding, mime_type, MimeType } from "./mimeType";
import { Hash } from '../common/base/Hash';
import * as https from "https";


const contentTypeExpr = /^([a-z]+\/[a-z]+)(?:;\s*charset=([a-z\-0-9]+))?$/;

export function decodeContentType(header:string) : MimeType {
	const match = header.match(contentTypeExpr);

	if (match !== null) {
		const mime = match[1];
		const char = match[2] !== undefined ? match[2] : mime_encoding.utf8;

		if (isMimeType(mime) && isEncoding(char)) return [mime, char];
	}

	throw new Error();
}

export async function getBody(req:IncomingMessage, timeout:number = 10000) : Promise<Buffer> {
	return new Promise((resolve, reject) => {
		if (!('content-length' in req.headers)) reject('malformed');

		const len = Number.parseInt(req.headers['content-length'] as string, 10);
		const body = Buffer.alloc(len);
		let index = 0;

		req.setTimeout(timeout, () => {
			reject('timeout');
		});

		req.on('data', (data:Buffer) : void => {
			const bytes = data.byteLength;

			// for (const val of data.values()) console.debug(val);

			if (index + bytes > len) reject('overflow');

			data.copy(body, index, 0, bytes);
			index += bytes;
		});

		req.on('error', (err:Error) : void => {
			reject(err);
		});

		req.on('end', () : void => {
			if (index < len) reject('incomplete');
			else resolve(body);
		});
	});
}

export function send(props:object, headers:Hash<string> = {}, body?:Buffer) : Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		const request = https.request(props);

		request.on('response', resolve);
		request.on('error', reject);

		for (const header in headers) {
			if (!headers.hasOwnProperty(header)) continue;

			request.setHeader(header, headers[header]);
		}

		request.end(body);
	});
}
