import ReadOnlyDict = NodeJS.ReadOnlyDict;
import { OutgoingHttpHeaders, ServerResponse } from 'http';
import { createMediaType, subType, textEncoding, topType } from './media';
import { HttpResponseCode, messageOfCode } from './http';
import { encodeContentHeaders } from './messageBody';


export function setHeaders(rep:ServerResponse, headers:ReadOnlyDict<string>) : void {
	for (const [name, value] of Object.entries(headers)) {
		if (value !== undefined) rep.setHeader(name, value);
	}
}

export function setResponseStatus(rep:ServerResponse, code:HttpResponseCode, headers?:ReadOnlyDict<string>) : void {
	rep.statusCode = code;
	rep.statusMessage = messageOfCode(code);

	if (headers !== undefined) setHeaders(rep, headers);
}

export function sendTextReply(rep:ServerResponse, code:HttpResponseCode, headers:OutgoingHttpHeaders = {}) : void {
	const message = messageOfCode(code);
	const type = createMediaType(topType.text, subType.textPlain, { charset : textEncoding.utf8 });
	const body = Buffer.from(`${ code } - ${ message }`);

	rep
		.writeHead(code, message, {
			...headers,
			...encodeContentHeaders(body, type)
		})
		.write(body);
}

export function sendJsonReply(rep:ServerResponse, code:HttpResponseCode, headers:OutgoingHttpHeaders = {}) : void {
	const message = messageOfCode(code);
	const type = createMediaType(topType.app, subType.appJson);
	const body = Buffer.from(JSON.stringify({ status : message }));

	rep
		.writeHead(code, message, {
			...headers,
			...encodeContentHeaders(body, type)
		})
		.write(body);
}

export function sendHtmlReply(rep:ServerResponse, code:HttpResponseCode, headers:OutgoingHttpHeaders = {}) : void {
	const message = messageOfCode(code);
	const type = createMediaType(topType.text, subType.textHtml, { charset : textEncoding.utf8 });
	const body = Buffer.from(`<!DOCTYPE html><html lang="en"><header><title>${ message }</title></header><body><pre>${ message }</pre></body></html>`);

	rep
		.writeHead(code, message, {
			...headers,
			...encodeContentHeaders(body, type)
		})
		.write(body);
}
