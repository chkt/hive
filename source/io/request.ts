import { IncomingMessage } from "http";
import * as https from "https";

import { Hash } from '../common/base/Hash';
import { isEncoding, isMimeType, mime_encoding, MimeType } from "./mimeType";
import { http_request_header } from "./http";


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

export function getRemoteAddress(req:IncomingMessage) : string {
	const forwarded = req.headers[ http_request_header.proxy_forwarded_for.toLowerCase() ];
	const remote = req.connection.remoteAddress;

	const ips = (typeof forwarded === 'string' ? forwarded : '')
		.split(',')
		.concat([ typeof remote === 'string' ? remote : '' ])
		.map(str => str.trim())
		.filter(str => str !== '');

	return ips.length !== 0 ? ips[0] : '0.0.0.0';
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
