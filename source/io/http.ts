import ReadOnlyDict = NodeJS.ReadOnlyDict;


export type HttpMethod = 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS';
export type HttpSuccessCode = 200|201|202|204;
export type HttpRedirectCode = 301|302|303|307|308;
export type HttpClientErrorCode = 400|401|403|404|405|406|410|411|413|429;
export type HttpServerErrorCode = 500|503;
export type HttpDirectCode = HttpSuccessCode|HttpClientErrorCode|HttpServerErrorCode;
export type HttpResponseCode = HttpDirectCode|HttpRedirectCode;


export const enum httpMethod {
	get = 'GET',
	post = 'POST',
	put = 'PUT',
	patch = 'PATCH',
	delete = 'DELETE',
	head = 'HEAD',
	options = 'OPTIONS'
}

export const enum httpResponseCode {
	ok = 200,
	created = 201,
	accepted = 202,
	empty = 204,
	movedGet = 301,
	tempGet = 302,
	other = 303,
	tempAll = 307,
	movedAll = 308,
	malformed = 400,
	noAuth = 401,
	badAuth = 403,
	notFound = 404,
	noMethod = 405,
	mismatch = 406,
	gone = 410,
	noLength = 411,
	tooBig = 413,
	tooMany = 429,
	error = 500,
	noService = 503
}

export const enum httpCodeType {
	success = 200,
	redirect = 300,
	clientError = 400,
	serverError = 500
}

const httpMessageMap:ReadOnlyDict<string> = {
	200 : 'Ok',
	201 : 'Created',
	202 : 'Accepted',
	204 : 'No Content',
	301 : 'Moved Permanently',
	302 : 'Found',
	303 : 'See Other',
	307 : 'Temporary Redirect',
	308 : 'Permanent Redirect',
	400 : 'Bad Request',
	401 : 'Unauthorized',
	403 : 'Forbidden',
	404 : 'Not Found',
	405 : 'Method Not Allowed',
	406 : 'Not Acceptable',
	410 : 'Gone',
	411 : 'Length Required',
	413 : 'Payload Too Large',
	429 : 'Too Many Requests',
	500 : 'Internal Server Error',
	503 : 'Service Unavailable'
};

export function typeOfCode(code:HttpResponseCode) : number {
	return code - code % 100;
}

export function messageOfCode(code:HttpResponseCode) : string {
	return httpMessageMap[code] ?? '';
}

export const enum httpRequestHeader {
	acceptCharset = 'Accept-Charset',
	acceptLanguage = 'Accept-Language',
	acceptMediaType = 'Accept',
	authorization = 'Authorization',
	contentLanguage = 'Content-Language',
	contentLength = 'Content-Length',
	contentType = 'Content-Type',
	corsHeaders = 'Access-Control-Request-Headers',
	corsMethod = 'Access-Control-Request-Method',
	origin = 'Origin',
	proxyForwardedFor = 'X-Forwarded-For',
	userAgent = 'User-Agent'
}

export const enum httpResponseHeader {
	allowedMethods = 'Allow',
	contentLanguage = 'Content-Language',
	contentLength = 'Content-Length',
	contentType = 'Content-Type',
	corsHeaders = 'Access-Control-Allow-Headers',
	corsMaxAge = 'Access-Control-Max-Age',
	corsMethods = 'Access-Control-Allow-Methods',
	corsOrigin = 'Access-Control-Allow-Origin',
	redirectLocation = 'Location',
	vary = 'Vary'
}

const listHeaderMap:readonly string[] = [
	httpRequestHeader.acceptCharset,
	httpRequestHeader.acceptLanguage,
	httpRequestHeader.acceptMediaType,
	httpRequestHeader.corsHeaders,
	httpRequestHeader.proxyForwardedFor,
	httpResponseHeader.allowedMethods,
	httpResponseHeader.corsHeaders,
	httpResponseHeader.corsMethods,
	httpResponseHeader.vary
];

export function isListHeader(name:string) : boolean {
	return listHeaderMap.includes(name);
}

export function capitalizeHeaderName(name:string) : string {
	let res:string = '';
	let a, b;

	for (
		[a, b] = [0, name.indexOf('-', 0) + 1];
		b !== 0;
		[a, b] = [b, name.indexOf('-', b) + 1]
	) res += name.charAt(a).toUpperCase() + name.slice(a + 1, b).toLowerCase();

	return res + name.charAt(a).toUpperCase() + name.slice(a + 1).toLowerCase();
}
