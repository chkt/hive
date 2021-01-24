import ReadOnlyDict = NodeJS.ReadOnlyDict;
import * as http from 'http';
import * as https from 'https';
import { Hash } from '../common/base/Hash';
import { decodeMimeType, isEncoding, isMimeType, mime_encoding, mime_type, MimeParts, MimeType } from './mimeType';
import { ip_port } from './ip';
import { http_request_header } from './http';


type transform<R> = (token:string) => R;
type differentiate<T> = (a:T, b:T) => number;

export interface Preference<T> {
	readonly token : string;
	readonly data : T;
	readonly q : number;
}


const contentTypeExpr = /^([a-z]+\/[-a-z]+)(?:;\s*charset=([a-z\-0-9]+))?$/;


function capitalizeHeaderName(header:string) : string {
	header = header.toLowerCase();

	for (let index = header.indexOf('-'), l = header.length; index !== -1 && index + 1 < l; index = header.indexOf('-', index + 1)) {
		header = header.slice(0, index + 1) + header.charAt(index + 1).toUpperCase() + header.slice(index + 2);
	}

	return header.charAt(0).toUpperCase() + header.slice(1);
}

function decodeListHeader<T>(
	header:string,
	normalize:transform<T>
) : T[] {
	return header !== '' ? header.split(',').map(value => normalize(value.trim())) : [];
}

function decodePreferenceHeader<T>(
	header:string,
	decode:transform<T>,
	sort:differentiate<T>
) : readonly Preference<T>[] {
	return decodeListHeader(header, segment => {
			const [ token, param ] = segment.split(';', 2);
			const [ key, value ] = (param ?? 'q=1').split('=', 2);
			const q = Number(value);

			if (token === '' || key !== 'q' || Number.isNaN(q) || q === 0.0) throw new Error(`'${ header }' not a preference header`);

			return { token, data : decode(token), q };
		})
		.sort((a, b) => b.q - a.q || sort(a.data, b.data));
}


export function decodeHeaderListHeader(list:string) {
	return decodeListHeader(list, capitalizeHeaderName);
}

export function decodeAcceptHeader(accept:string) : readonly Preference<MimeParts>[] {
	return decodePreferenceHeader(
		accept,
		decodeMimeType,
		(a, b) =>
			(b.topType === '*' ? 0 : b.subType === '*' ? 1 : 2) -
			(a.topType === '*' ? 0 : a.subType === '*' ? 1 : 2)
	);
}

export function encodeListHeader(header:ReadonlyArray<string>) : string {
	return header.join(', ');
}

export function encodeContentType(mime:mime_type, charset?:mime_encoding) : string {
	return mime + (charset !== undefined ? `; charset=${ charset }` : '');
}

export function decodeContentType(header:string) : MimeType {
	const match = header.toLowerCase().match(contentTypeExpr);

	if (match !== null) {
		const mime = match[1];
		const char = match[2] !== undefined ? match[2] : mime_encoding.utf8;

		if (isMimeType(mime) && isEncoding(char)) return [mime, char];
	}

	throw new Error(`'${ header }' not a '${ http_request_header.content_type }'`);
}

export function encodeContentHeaders(body:Buffer, mime:mime_type, encoding?:mime_encoding) : ReadOnlyDict<string> {
	return {
		[ http_request_header.content_type ] : encodeContentType(mime, encoding),
		[ http_request_header.content_length ] : body.byteLength.toFixed(0)
	};
}

export function getRemoteAddress(req:http.IncomingMessage) : string {
	const forwarded = req.headers[ http_request_header.proxy_forwarded_for.toLowerCase() ];
	const remote = req.connection.remoteAddress;

	const ips = (typeof forwarded === 'string' ? forwarded : '')
		.split(',')
		.concat([ typeof remote === 'string' ? remote : '' ])
		.map(str => str.trim())
		.filter(str => str !== '');

	return ips.length !== 0 ? ips[0] : '0.0.0.0';
}

export async function getBody(req:http.IncomingMessage, timeout:number = 10000) : Promise<Buffer> {
	return new Promise((resolve, reject) => {
		if (!('content-length' in req.headers)) reject('malformed');

		const len = Number.parseInt(req.headers['content-length'] as string, 10);
		const body = Buffer.alloc(len);
		let index = 0;

		req.setTimeout(timeout, () => {
			reject('timeout');
		});

		req.on('data', (data:Buffer) : void => {
			const bytes = data.byteLength;

			if (index + bytes > len) reject('overflow');

			data.copy(body, index, 0, bytes);
			index += bytes;
		});

		req.on('error', (err:Error) : void => {
			reject(err);
		});

		req.on('end', () : void => {
			if (index < len) reject('incomplete');
			else resolve(body);
		});
	});
}

export function send(props:https.RequestOptions, headers:Hash<string> = {}, body?:Buffer) : Promise<http.IncomingMessage> {
	return new Promise((resolve, reject) => {
		const request = (props.port ?? ip_port.https) === ip_port.http ? http.request(props) : https.request(props);

		request.on('response', resolve);
		request.on('error', reject);

		for (const header in headers) {
			if (!headers.hasOwnProperty(header)) continue;

			request.setHeader(header, headers[header]);
		}

		request.end(body);
	});
}
