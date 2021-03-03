import { State, Switch } from '@chkt/states/dist/state';
import { MediaType, subType, topType } from './media';
import { HttpMethod, httpRequestHeader } from './http';
import { decodeAcceptCharsetHeader, decodeAcceptHeader, decodeContentTypeHeader, Preference } from './request';
import { ControllerContext } from '../controller/controller';

interface StateTarget {
	readonly target : string;
}

interface MethodFilter extends StateTarget {
	readonly method : HttpMethod;
}

type MethodMap = readonly MethodFilter[];

interface MediaTypeFilter extends StateTarget {
	readonly type : MediaType;
}

type MediaTypeMap = readonly MediaTypeFilter[];

interface EncodingFilter extends StateTarget {
	readonly charset : string;
}

type EncodingMap = readonly EncodingFilter[];


export async function filterRequestMethod(
	method:HttpMethod,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	if (context.request.method === method) return next.success(context);
	else return next.failure(context);
}

export async function filterRequestMethods(
	methods:MethodMap,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const method = context.request.method as HttpMethod;
	const filter = methods.find(value => value.method === method);

	if (filter !== undefined) return next.named(filter.target, context);
	else return next.failure(context);
}

export async function filterContentType(
	map:MediaTypeMap,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const header = context.request.headers[httpRequestHeader.contentType.toLowerCase()];

	if (header === undefined) return next.failure(context);

	const type = decodeContentTypeHeader(header as string);
	const filter = map.find(value =>
		value.type.top === topType.any || value.type.top === type.top &&
		(value.type.sub === subType.appJson || value.type.sub === type.sub)
	);

	if (filter !== undefined) return next.named(filter.target, context);
	else return next.failure(context);
}

export async function filterRequestAccept(
	map:MediaTypeMap,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const accept = context.request.headers[httpRequestHeader.acceptMediaType.toLowerCase()];

	if (accept === undefined) return next.default(context);

	let prefs;

	try {
		prefs = decodeAcceptHeader(accept as string);
	}
	catch (err) {
		return next.failure(context);
	}

	for (const pref of prefs) {
		const item = map.find(value =>
			pref.data.top === topType.any || pref.data.top === value.type.top &&
			(pref.data.sub === subType.any || pref.data.sub === value.type.sub)
		);

		if (item !== undefined) return next.named(item.target, context);
	}

	return next.failure(context);
}

export async function filterRequestAcceptCharset(
	map:EncodingMap,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const accept = context.request.headers[httpRequestHeader.acceptCharset.toLowerCase()];

	if (accept === undefined) return next.default(context);

	let prefs:readonly Preference<string>[];

	try {
		prefs = decodeAcceptCharsetHeader(accept as string);
	}
	catch (err) {
		return next.failure(context);
	}

	for (const pref of prefs) {
		const item = map.find(value => pref.data === '*' || pref.data === value.charset);

		if (item !== undefined) return next.named(item.target, context);
	}

	return next.failure(context);
}
