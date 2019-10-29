import { handleRequest } from "./app";
import { Server } from "http";
import { AddressInfo } from "net";
import { log_level, logMessage, setLogThreshold } from "../log/log";
import Signals = NodeJS.Signals;


type handleSignals = (signal:Signals) => void;


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


function onUp(this:Server) : void {
	const address = this.address();
	const port = isAddressInfo(address) ? address.port : address;

	logMessage(`up, attached to port ${ port }`, log_level.level_notice);
}

function onDown(this:Server) : void {
	logMessage(`down`, log_level.level_notice);
}


function shutdown(this:Server, signal:Signals) : void {
	new Promise(resolve => {
		this.getConnections((err, num) => {
			logMessage(
				`received ${ signal }, going down with ${ err === null ? num : '?' } connections`,
				log_level.level_notice
			);
			resolve();
		});
	}).then(() => this.close());
}


export function createServer(handler:handleRequest, port:number) : Server {
	setLogThreshold(log_level.level_info);
	logMessage(`going up on port ${ port }`, log_level.level_notice);

	const server = new Server();

	server.once(server_event.up, onUp.bind(server));
	server.once(server_event.down, onDown.bind(server));
	server.on(server_event.request, handler);

	onSignals([ 'SIGHUP', 'SIGINT', 'SIGTERM' ], shutdown.bind(server));

	server.listen(port);

	return server;
}
