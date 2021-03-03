import ReadOnlyDict = NodeJS.ReadOnlyDict;


const topTypeFilter = [
	'*',
	'application',
	'audio',
	'font',
	'image',
	'message',
	'model',
	'multipart',
	'text',
	'video'
] as const;

type TopType = typeof topTypeFilter[number];
type BaseType = Exclude<TopType, 'text'|'multipart'>;
type PartsType = Extract<TopType, 'multipart'>;
type TextType = Extract<TopType, 'text'>;

type Parameters = ReadOnlyDict<string>;

interface ParameterMap {
	readonly ['*'] : Parameters;
	readonly application : Parameters;
	readonly audio : Parameters;
	readonly font : Parameters;
	readonly image : Parameters;
	readonly message : Parameters;
	readonly model : Parameters;
	readonly multipart : Parameters & { readonly boundary : string };
	readonly text : Parameters & { readonly charset : string };
	readonly video : Parameters;
}

interface MediaTypeTemplate<T extends TopType> {
	readonly type : string;
	readonly top : T;
	readonly sub : string;
	readonly params : ParameterMap[T extends infer U ? U : never];
}

type BaseMediaType = MediaTypeTemplate<BaseType>;
type PartsMediaType = MediaTypeTemplate<PartsType>;
type TextMediaType = MediaTypeTemplate<TextType>;
export type MediaType = BaseMediaType|PartsMediaType|TextMediaType;


export const enum topType {
	any = '*',
	app = 'application',
	audio = 'audio',
	font = 'font',
	image = 'image',
	msg = 'message',
	model = 'model',
	parts = 'multipart',
	text = 'text',
	video = 'video'
}

export const enum subType {
	any = '*',
	appBytes = 'octet-stream',
	appJson = 'json',
	textEvents = 'event-stream',
	textHtml = 'html',
	textPlain = 'plain'
}

export const enum textEncoding {
	ascii = 'us-ascii',
	utf8 = 'utf-8'
}


const subDefault:ReadOnlyDict<string> = {
	[topType.any] : subType.any,
	[topType.text] : subType.textPlain
};

export function parseMediaType(token:string, params:Parameters = {}) : MediaType {
	let [top, sub] = token.split('/', 2) as [TopType, string?];

	if (!topTypeFilter.includes(top)) sub = undefined;
	else if (sub === '' || sub === undefined) sub = subDefault[top];

	if (sub === undefined) [top, sub] = [topType.app, subType.appBytes];
	else if (top === topType.any) sub = subType.any;

	const type = `${ top }/${ sub }`;

	if (top === topType.text) return { type, top, sub, params : { charset : textEncoding.ascii, ...params }};
	else if (top === topType.parts) return { type, top, sub, params : { boundary : '', ...params }};
	else return { type, top, sub, params };
}

export function createMediaType<T extends Extract<TopType, 'multipart'|'text'>>(
	top:T,
	sub:string,
	params:ParameterMap[T extends infer U ? U : never]
) : PartsMediaType|TextMediaType;
export function createMediaType<T extends Exclude<TopType, '*'|'multipart'|'text'>>(
	top:T,
	sub:string,
	params?:ParameterMap[T extends infer U ? U : never]
) : BaseMediaType;
export function createMediaType<T extends Exclude<TopType, '*'>>(
	top:T,
	sub:string,
	params?:ParameterMap[T extends infer U ? U : never]
) : MediaTypeTemplate<T> {
	return {
		type : `${ top }/${ sub }`,
		top,
		sub,
		params : (params ?? {}) as ParameterMap[T extends infer U ? U : never]
	};
}
