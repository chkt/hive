import { OutgoingHttpHeaders, ServerResponse } from 'http';
import { Hash } from '../common/base/Hash';
import { mime_encoding, mime_type } from './mimeType';
import { http_reply_code, httpMessage } from './http';


export function getHeaders(body:Buffer, mime:mime_type, enc:mime_encoding) : Hash<string> {
	return {
		'Content-Type' : `${mime}; charset=${enc}`,
		'Content-Length' : body.byteLength.toFixed(0)
	};
}

export function setHeaders(rep:ServerResponse, headers:Hash<string>) : void {
	for (const name in headers) {
		if (headers.hasOwnProperty(name)) rep.setHeader(name, headers[name]);
	}
}

export function setResponseStatus(rep:ServerResponse, code:http_reply_code, headers?:Hash<string>) : void {
	rep.statusCode = code;
	rep.statusMessage = httpMessage.get(code) as string;

	if (headers !== undefined) setHeaders(rep, headers);
}

export function sendTextReply(rep:ServerResponse, code:http_reply_code) : void {
	const msg = httpMessage.get(code) as string;
	const body = Buffer.from(`${ code } - ${ msg }`);

	rep.writeHead(code, msg, getHeaders(body, mime_type.text, mime_encoding.utf8));
	rep.write(body);
}

export function sendJsonReply(rep:ServerResponse, code:http_reply_code, headers?:OutgoingHttpHeaders) : void {
	const message = httpMessage.get(code) as string;
	const body = Buffer.from(JSON.stringify({ status : message }));

	rep
		.writeHead(code, {
			...headers,
			...getHeaders(body, mime_type.json, mime_encoding.utf8)
		})
		.write(body);
}
