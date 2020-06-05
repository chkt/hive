import Signals = NodeJS.Signals;


type handleSignals = (signal:Signals) => void;


function onSignal(signal:Signals, handler:handleSignals) : void {
	process.once(signal, handler);
}

export function onSignals(signals:ReadonlyArray<Signals>, handler:handleSignals) : void {
	for (const signal of signals) onSignal(signal, handler);
}
