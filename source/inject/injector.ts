export type Provider = object;

interface Location<P extends Provider> {
	readonly id : keyof P;
}

type Locations<P extends Provider> = ReadonlyArray<Location<P>>;

type TypeTuple<
	P extends Provider,
	D extends Locations<P>
> = { [ I in keyof D ] : D[I] extends Location<P> ? P[ D[I]['id'] ] : never; };

interface Target<
	P extends Provider,
	R extends unknown,
	D extends Locations<P> = Locations<P>
> {
	dependencies : D,
	factory(args:TypeTuple<P, D>) : R
}

type Targets<P extends Provider> = {
	[ K in keyof P] : Target<P, P[K]>;
}

export interface Injector<P extends Provider> {
	get<K extends keyof P>(id:K) : P[K];
}


export function createInjector<P extends Provider>(targets:Targets<P>) : Injector<P> {
	let created:Partial<P> = {};

	return {
		get(id) {
			if (id in created) return created[id] as P[typeof id];
			else if (id in targets) {
				const desc = targets[id];
				const args = desc.dependencies.map(v => this.get(v.id));
				const res = desc.factory(args);

				created = { ...created, [id] : res };

				return res;
			}
			else throw new Error(`bad injector target '${ id }'`);
		}
	};
}
