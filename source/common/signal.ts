type handle<R> = (handler:Handler) => Promise<R>;

export interface Handler {
	onSignal(handle:handle<void>) : Handler;
	numReceived() : number;
	extend() : Handler;
	extendWhile<R>(action:handle<R>) : Promise<R>;
	delegate() : Handler;
	delegateWhile<R>(action:handle<R>) : Promise<R>;
	release<R>(value:R) : R;
}

export interface Signal {
	send() : Promise<void>;
	readonly receiver : Handler;
}


const children:WeakMap<Handler, Handler> = new WeakMap();
const handlers:WeakMap<Handler, handle<void>> = new WeakMap();
const steps:WeakMap<Handler, number> = new WeakMap();
const received:WeakMap<Handler, number> = new WeakMap();

const asyncNoop = () => Promise.resolve();

function setHandler(this:Handler, fn:handle<void>) : Handler {
	handlers.set(this, fn);

	return this;
}

function setChild(this:Handler) : Handler {
	const child = createReceiver();

	children.set(this, child);

	return child;
}

function resetChild<R>(this:Handler, value:R) : R {
	children.delete(this);

	return value;
}

function setProxy(this:Handler) : Handler {
	const child = createReceiver();

	children.set(this, child);
	steps.set(child, (steps.get(this) ?? 1) + 1);

	return child;
}

function numReceived(this:Handler) : number {
	return received.get(this) ?? 0;
}

function childWhile<R>(this:Handler, fn:(abort:Handler) => Promise<R>) : Promise<R> {
	return fn(this.extend()).then(
		this.release.bind(this),
		reason => Promise.reject(resetChild.call(this, reason))
	);
}

function proxyWhile<R>(this:Handler, fn:(abort:Handler) => Promise<R>) : Promise<R> {
	return fn(setProxy.call(this)).then(
		resetChild.bind<Handler, R, R>(this),
		reason => Promise.reject(resetChild.call(this, reason))
	);
}


export function createReceiver() : Handler {
	return {
		onSignal : setHandler,
		numReceived,
		extend : setChild,
		extendWhile : childWhile,
		delegate : setProxy,
		delegateWhile : proxyWhile,
		release : resetChild
	};
}

export function createSignal() : Signal {
	const receiver = createReceiver();

	return {
		async send() {
			const path:Handler[] = [];

			for (let item:Handler | undefined = receiver; item !== undefined; item = children.get(item)) {
				received.set(item, numReceived.call(item) + 1);
				path.push(item);
			}

			for (let i = path.length - 1; i > -1; i -= steps.get(path[i]) ?? 1) {
				const item = path[i];

				try {
					await (handlers.get(item) ?? asyncNoop)(item);
				}
				/* tslint:disable-next-line:no-empty */
				catch {}
			}
		},
		receiver
	}
}
