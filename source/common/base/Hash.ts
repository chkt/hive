export interface Hash<T> {
	[key:string] : T;
}

export interface ReadonlyHash<T> {
	readonly [key:string] : T;
}
