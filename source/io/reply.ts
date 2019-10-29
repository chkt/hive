import { ServerResponse } from "http";

import { Hash } from "../common/base/Hash";
import { mime_encoding, mime_type } from "./mimeType";
import { http_reply_code, httpMessage } from "./http";


export function getHeaders(body:Buffer, mime:mime_type, enc:mime_encoding) : Hash<string> {
	return {
		'Content-Type' : `${mime}; charset=${enc}`,
		'Content-Length' : body.byteLength.toString()
	};
}

export function sendTextReply(rep:ServerResponse, code:http_reply_code) : void {
	const msg = httpMessage.get(code) as string;
	const body = Buffer.from(`${ code } - ${ msg }`);

	rep.writeHead(code, msg, getHeaders(body, mime_type.text, mime_encoding.utf8));
	rep.write(body);
}
