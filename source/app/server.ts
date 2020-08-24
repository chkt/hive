import Signals = NodeJS.Signals;
import { AddressInfo } from 'net';
import * as http from 'http';
import * as https from 'https';
import { Logger } from '@chkt/onceupon';
import { log_level } from '@chkt/onceupon/dist/level';
import { Injector } from '../inject/injector';
import { handleRequest, AppCommonProvider } from './app';
import { onSignals } from './signals';


interface HttpServerConfig {
	readonly port? : number;
	readonly shutdownSignals? : Signals[];
	readonly injector : Injector<AppCommonProvider>;
	readonly handler : handleRequest;
}

interface HttpsServerConfig extends HttpServerConfig {
	readonly cert : Promise<Buffer>;
	readonly key : Promise<Buffer>;
}

export type ServerConfig = HttpServerConfig|HttpsServerConfig;
type DefaultServerConfig = Required<Pick<ServerSettings, 'port'|'shutdownSignals'>>;

type HttpServerSettings = Required<HttpServerConfig>;
type HttpsServerSettings = Required<HttpsServerConfig>;
type ServerSettings = HttpServerSettings|HttpsServerSettings;


function getDefaultSettings() : DefaultServerConfig {
	return {
		port : 80,
		shutdownSignals : [ 'SIGHUP', 'SIGINT', 'SIGTERM' ]
	};
}

function getSettings(config:ServerConfig) : ServerSettings {
	return {
		...getDefaultSettings(),
		...config
	};
}

function settingsRequireTls(settings:ServerSettings) : boolean {
	return settings.port === 443;
}

function isTlsSettings(settings:ServerSettings) : settings is HttpsServerSettings {
	return 'cert' in settings && 'key' in settings && settings.port === 443;
}


const enum server_event {
	up = 'listening',
	down = 'close',
	request = 'request'
}


function isAddressInfo(address:string|AddressInfo|null) : address is AddressInfo {
	return typeof address === 'object';
}


function onUp(this:http.Server, log:Logger) : void {
	const address = this.address();
	const port = isAddressInfo(address) ? address.port : address;

	log.message(`up, attached to port ${ port }`, log_level.notice);
}

function onDown(this:http.Server, log:Logger) : void {
	log.message(`down`, log_level.notice);
}


function shutdown(this:http.Server, log:Logger, signal:Signals) : void {
	new Promise(resolve => {
		this.getConnections((err, num) => {
			log.message(
				`received ${ signal }, going down with ${ err === null ? num : '?' } connections`,
				log_level.notice
			);

			resolve();
		});
	}).then(() => this.close());
}


async function createServerHttps(settings:HttpServerSettings) : Promise<https.Server> {
	const log = settings.injector.get('logger');

	log.message('configured as tls terminal', log_level.info);

	try {
		if (!isTlsSettings(settings)) throw new Error('no tls credentials');

		const [cert, key] = await Promise.all([ settings.cert, settings.key ]);

		return https.createServer({ key, cert });
	}
	catch (err) {
		log.failure(err, log_level.fatal);

		throw err;
	}
}

function createServerHttp(_:HttpServerSettings) : http.Server {
	return http.createServer();
}


export async function createServer(config:ServerConfig) : Promise<http.Server> {
	const settings = getSettings(config);
	const log = settings.injector.get('logger');

	log.message(`going up on port ${ settings.port }`, log_level.notice);

	const server = await (settingsRequireTls(settings) ? createServerHttps : createServerHttp)(settings);

	server.once(server_event.up, onUp.bind(server, log));
	server.once(server_event.down, onDown.bind(server, log));
	server.on(server_event.request, settings.handler);

	onSignals(settings.shutdownSignals, shutdown.bind(server, log));

	server.listen(settings.port);

	return server;
}
