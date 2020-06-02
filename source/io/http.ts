export enum http_method {
	get = 'GET',
	post = 'POST',
	put = 'PUT',
	patch = 'PATCH',
	delete = 'DELETE',
	head = 'HEAD',
	options = 'OPTIONS'
}

export enum http_reply_code {
	ok = 200,
	created = 201,
	accepted = 202,
	empty = 204,
	malformed = 400,
	no_auth = 401,
	no_perms = 403,
	not_found = 404,
	no_method = 405,
	no_length = 411,
	too_big = 413,
	too_many = 429,
	error = 500,
	no_service = 503
}

export enum http_redirect_code {
	moved_get = 301,
	temp_get = 302,
	other = 303,
	temp_all = 307,
	moved_all = 308
}

export type http_code = http_reply_code | http_redirect_code;

export const httpMessage:ReadonlyMap<number, string> = new Map([
	[200, 'Ok'], [201, 'Created'], [204, 'No Content'],
	[301, 'Moved Permanently'], [302, 'Found'], [303, 'See Other'], [307, 'Temporary Redirect'],
	[308, 'Permanent Redirect'],
	[400, 'Bad Request'], [401, 'Unauthorized'], [403, 'Forbidden'], [404, 'Not Found'],
	[405, 'Method Not Allowed'], [411, 'Length Required'], [413, 'Payload Too Large'], [429, 'Too Many Requests'],
	[500, 'Internal Server Error'], [503, 'Service Unavailable']
]);

export enum http_request_header {
	accept_charset = 'Accept-Charset',
	accept_language = 'Accept-Language',
	accept_mime = 'Accept',
	authorization = 'Authorization',
	content_length = 'Content-Length',
	content_type = 'Content-Type',
	cors_headers = 'Access-Control-Request-Headers',
	cors_method = 'Access-Control-Request-Method',
	origin = 'Origin',
	proxy_forwarded_for = 'X-Forwarded-For',
	user_agent = 'User-Agent'
}

export enum http_response_header {
	allowed_methods = 'Allow',
	content_language = 'Content-Language',
	content_length = 'Content-Length',
	content_type = 'Content-Type',
	cors_headers = 'Access-Control-Allow-Headers',
	cors_max_age = 'Access-Control-Max-Age',
	cors_methods = 'Access-Control-Allow-Methods',
	cors_origin = 'Access-Control-Allow-Origin',
	redirect_location = 'Location',
	vary = 'Vary'
}
