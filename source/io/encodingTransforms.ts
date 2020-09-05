import { State, Switch } from "@chkt/states/dist/state";

import { ControllerContext } from "../controller/controller";
import { decodeContentType, getBody } from "./request";
import { mime_encoding, mime_type } from "./mimeType";
import { createHttpBodyContext } from "./context";


const enum states {
	json = 'json'
}

interface EncodingMapping {
	mime : mime_type;
	state : states;
}
type EncodingMappings = EncodingMapping[];


const encodingMap:EncodingMappings = [
	{ mime : mime_type.json, state : states.json }
];


export async function resolveRequestEncoding(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const headers = context.request.headers;

	if (
		!('content-type' in headers) ||
		headers['content-type'] === undefined
	) return next.failure(context);

	let type;

	try {
		 [ type ] = decodeContentType(headers['content-type']);
	}
	catch (err) {
		return next.failure(context);
	}

	for (const mapping of encodingMap) {
		if (mapping.mime === type) return next.named(mapping.state, context);
	}

	return next.named('mime_mismatch', context);
}

export async function decodeJsonRequest(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	try {
		const json = await getBody(context.request);
		const data = JSON.parse(json.toString());

		return next.default(createHttpBodyContext(context, data));
	}
	catch (err) {
		return next.failure(context);
	}
}

export async function encodeJsonReply(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const json = JSON.stringify(context.view);
	const body = Buffer.from(json, mime_encoding.utf8);
	const reply = context.reply;

	reply.setHeader('Content-Type', `${ mime_type.json}; charset=${ mime_encoding.utf8 }`);
	reply.setHeader('Content-Length', body.byteLength.toString());
	reply.write(body);

	return next.default(context);
}
