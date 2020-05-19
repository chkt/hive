import Signals = NodeJS.Signals;
import { AddressInfo } from 'net';
import { Server } from 'http';
import { Logger } from '@chkt/onceupon';
import { log_level } from '@chkt/onceupon/dist/level';
import { Injector } from '../inject/injector';
import { handleRequest, LoggingProvider } from "./app";


type handleSignals = (signal:Signals) => void;

interface ServerConfig {
	readonly port? : number;
	readonly shutdownSignals? : Signals[];
	readonly injector : Injector<LoggingProvider>;
	readonly handler : handleRequest;
}

type DefaultServerConfig = Required<Pick<ServerSettings, 'port'|'shutdownSignals'>>;
type ServerSettings = Required<ServerConfig>;


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


const enum server_event {
	up = 'listening',
	down = 'close',
	request = 'request'
}


function isAddressInfo(address:string|AddressInfo|null) : address is AddressInfo {
	return typeof address === 'object';
}

function onSignal(signal:Signals, handler:handleSignals) : void {
	process.once(signal, handler);
}

function onSignals(signals:Signals[], handler:handleSignals) : void {
	for (const signal of signals) onSignal(signal, handler);
}


function onUp(this:Server, log:Logger) : void {
	const address = this.address();
	const port = isAddressInfo(address) ? address.port : address;

	log.message(`up, attached to port ${ port }`, log_level.notice);
}

function onDown(this:Server, log:Logger) : void {
	log.message(`down`, log_level.notice);
}


function shutdown(this:Server, log:Logger, signal:Signals) : void {
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


export function createServer(config:ServerConfig) : Server {
	const settings = getSettings(config);
	const log = settings.injector.get('logger');

	log.message(`going up on port ${ settings.port }`, log_level.notice);

	const server = new Server();

	server.once(server_event.up, onUp.bind(server, log));
	server.once(server_event.down, onDown.bind(server, log));
	server.on(server_event.request, settings.handler);

	onSignals(settings.shutdownSignals, shutdown.bind(server, log));

	server.listen(settings.port);

	return server;
}
