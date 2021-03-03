import ReadOnlyDict = NodeJS.ReadOnlyDict;
import Dict = NodeJS.Dict;
import * as http from 'http';
import * as https from 'https';
import { Hash } from '../common/base/Hash';
import { ipPort } from './ip';
import { MediaType, parseMediaType, subType, topType } from './media';
import { httpRequestHeader } from './http';


type transform<R> = (token:string) => R;
type differentiate<T> = (a:T, b:T) => number;

export interface Token<T> {
	readonly value : T;
	readonly params : ReadOnlyDict<T>;
}

export interface Preference<T> {
	readonly token : string;
	readonly data : T;
	readonly q : number;
}


function capitalizeHeaderName(header:string) : string {
	header = header.toLowerCase();

	for (let index = header.indexOf('-'), l = header.length; index !== -1 && index + 1 < l; index = header.indexOf('-', index + 1)) {
		header = header.slice(0, index + 1) + header.charAt(index + 1).toUpperCase() + header.slice(index + 2);
	}

	return header.charAt(0).toUpperCase() + header.slice(1);
}

function decodeTokenHeader<T>(segment:string, decode:transform<T>) : Token<T> {
	const [token, ...attrs] = segment.split(';');
	const params:Dict<T> = {};

	for (const attr of attrs) {
		const [key, value] = attr.trim().split('=', 2);

		params[key] = params[key] ?? decode(value ?? '');
	}

	return { value : decode(token), params };
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

export function encodeHeaderListHeader(header:ReadonlyArray<string>) : string {
	return header.join(', ');
}

export function decodeContentTypeHeader(type:string = '') : MediaType {
	const token = decodeTokenHeader(type, value => value.toLowerCase().trimEnd());

	return parseMediaType(token.value, token.params);
}

export function decodeAcceptHeader(accept:string) : readonly Preference<MediaType>[] {
	return decodePreferenceHeader(
		accept,
		decodeContentTypeHeader,
		(a, b) =>
			(b.top === topType.any ? 0 : b.sub === subType.any ? 1 : 2) -
			(a.top === topType.any ? 0 : a.sub === subType.any ? 1 : 2)
	);
}

export function decodeAcceptCharsetHeader(accept:string) : readonly Preference<string>[] {
	return decodePreferenceHeader(
		accept,
		value => value,
		(a, b) => (b === '*' ? 0 : 1) - (a === '*' ? 0 : 1)
	);
}

export function getRemoteAddress(req:http.IncomingMessage) : string {
	const forwarded = req.headers[ httpRequestHeader.proxyForwardedFor.toLowerCase() ];
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
		const request = (props.port ?? ipPort.https) === ipPort.http ? http.request(props) : https.request(props);

		request.on('response', resolve);
		request.on('error', reject);

		for (const header in headers) {
			if (!headers.hasOwnProperty(header)) continue;

			request.setHeader(header, headers[header]);
		}

		request.end(body);
	});
}
