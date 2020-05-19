import { Hash, ReadonlyHash } from '../common/base/Hash';


let env:ReadonlyHash<string>|null = null;


function createEnv() : ReadonlyHash<string> {
	const procEnv = process.env;
	const res:Hash<string> = {};

	for (const key in procEnv) {
		if (procEnv.hasOwnProperty(key)) {
			const val = procEnv[key];

			if (val !== undefined) res[key] = val;
		}
	}

	return res;
}


export function hasKey(id:string) : boolean {
	if (env === null) env = createEnv();

	return env[id] !== undefined;
}

export function getKey(id:string) : string|undefined {
	if (env === null) env = createEnv();

	return env[id];
}
