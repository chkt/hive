import { State, Switch } from '@chkt/states/dist/state';
import { MimeParts } from './mimeType';
import { http_method, http_request_header } from './http';
import { decodeAcceptHeader, Preference } from './request';
import { ControllerContext } from '../controller/controller';


interface MimeFilter extends MimeParts {
	readonly target : string;
}

type MimeMap = readonly MimeFilter[];


export async function filterRequestMethod(
	method:http_method,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	if (context.request.method === method) return next.success(context);
	else return next.failure(context);
}

export async function filterRequestAccept(
	map:MimeMap,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const accept = context.request.headers[http_request_header.accept.toLowerCase()];

	if (accept === undefined) return next.default(context);

	let prefs:readonly Preference<MimeParts>[];

	try {
		prefs = decodeAcceptHeader(accept as string);
	}
	catch (err) {
		return next.failure(context);
	}

	for (const pref of prefs) {
		const item = map.find(value => pref.data.topType === '*' ||
			pref.data.topType === value.topType &&
			(pref.data.subType === '*' || pref.data.subType === value.subType)
		);

		if (item !== undefined) return next.named(item.target, context);
	}

	return next.failure(context);
}
