import ReadOnlyDict = NodeJS.ReadOnlyDict;
import { MediaType } from './media';
import { httpRequestHeader } from './http';


export function encodeContentType(type:MediaType) : string {
	return [
		type.type,
		...Object.entries(type.params).map(([key, value]) => `${ key }=${ value }`)
	].join('; ');
}

export function encodeContentHeaders(body:Buffer, type:MediaType) : ReadOnlyDict<string> {
	return {
		[ httpRequestHeader.contentType ] : encodeContentType(type),
		[ httpRequestHeader.contentLength ] : body.byteLength.toFixed(0)
	};
}
