import { State, Switch } from '@chkt/states';
import { createMediaType, MediaType, subType, textEncoding, topType } from './media';
import { HttpMethod, httpResponseHeader } from './http';
import { encodeContentHeaders } from './messageBody';
import { decodeContentTypeHeader, encodeHeaderListHeader, getBody } from './request';
import { setHeaders } from './reply';
import { createHttpBodyContext } from './context';
import { ControllerContext } from '../controller/controller';


const enum states {
	json = 'json'
}

interface EncodingMapping {
	mediaType : MediaType;
	state : states;
}
type EncodingMappings = EncodingMapping[];


const encodingMap:EncodingMappings = [
	{ mediaType : createMediaType(topType.app, subType.appJson), state : states.json }
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

	const type = decodeContentTypeHeader(headers['content-type']);

	for (const mapping of encodingMap) {
		if (mapping.mediaType.type === type.type) return next.named(mapping.state, context);
	}

	return next.named('encoding_mismatch', context);
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

export async function encodeBadMethod(
	allowed:readonly HttpMethod[],
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	context.reply.setHeader(httpResponseHeader.allowedMethods, encodeHeaderListHeader(allowed));

	return next.default(context);
}

export async function encodeJsonReply(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const json = JSON.stringify(context.view);
	const body = Buffer.from(json, textEncoding.utf8);
	const type = createMediaType(topType.app, subType.appJson, { charset : textEncoding.utf8 });
	const reply = context.reply;

	setHeaders(reply, encodeContentHeaders(body, type));

	reply.write(body);

	return next.default(context);
}

export async function encodeHtmlResponse(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const body = context.responseBody as Buffer;
	const type = createMediaType(topType.text, subType.textHtml, { charset : textEncoding.utf8 });
	const response = context.reply;

	setHeaders(response, encodeContentHeaders(body, type));

	response.write(body.toString(textEncoding.utf8));

	return next.default(context);
}
