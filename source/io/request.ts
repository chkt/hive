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
	normalize:transform<T|null>
) : T[] {
	const res:T[] = [];

	if (header === '') return res;

	for (const token of header.split(',')) {
		let value:T|null;

		try {
			value = normalize(token.trim());
		}
		catch (err) {
			value = null;
		}

		if (value !== null) res.push(value);
	}

	return res;
}

function normalizePreference(token:string) : Preference<string>|null {
	const len = token.length;
	const mod = len + 1;

	let q = 1.0;
	let data:string = token;

	for (
		let a = (token.indexOf(';') + mod) % mod, b = (token.indexOf(';', a + 1) + mod) % mod;
		a < len;
		a = b, b = (token.indexOf(';', a + 1) + mod) % mod
	) {
		const delim = Math.min((token.indexOf('=', a + 1) + mod) % mod, b);

		if (token.slice(a + 1, delim).trim() !== 'q') continue;
		else if (b - delim < 2) return null;

		q = Number(token.slice(delim + 1, b).trim());
		data = token.slice(0, a) + token.slice(b);

		break;
	}

	if (Number.isNaN(q) || q < 0 || data === null) return null;
	else return { token, data, q : Math.min(Math.max(q, 0.0), 1.0) };
}

function decodePreferenceHeader<T>(
	header:string,
	decode:transform<T|null>,
	sort:differentiate<T>
) : readonly Preference<T>[] {
	return decodeListHeader(header, normalizePreference)
		.reduce<Preference<T>[]>((prev, pref) => {
			const data = decode(pref.data);

			if (data !== null) prev.push({ ...pref, data });

			return prev;
		}, [])
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
			((b.top === topType.any ? 0 : b.sub === subType.any ? 2 ** 6 : 2 ** 7) + Object.keys(b.params).length) -
			((a.top === topType.any ? 0 : a.sub === subType.any ? 2 ** 6 : 2 ** 7) + Object.keys(a.params).length)
	);
}

export function decodeAcceptCharsetHeader(accept:string) : readonly Preference<string>[] {
	return decodePreferenceHeader(
		accept,
		value => value !== '' ? value : null,
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
