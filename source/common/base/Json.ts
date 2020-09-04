type toJson = (key:string) => JsonConform;

interface JsonConformObject {
	readonly toJson : toJson;
}

export type JsonConformValue = boolean|number|string|null|JsonConformObject|JsonConformArray|JsonConformHash;

export type JsonConformArray = ReadonlyArray<JsonConformValue>;
export interface JsonConformHash {
	readonly [key:string] : JsonConformValue;
}

export type JsonConform = JsonConformArray|JsonConformHash;


function isJsonConformObject(value:object) : value is JsonConformObject {
	return 'toJson' in value && typeof (value as JsonConformObject).toJson === 'function';
}

export function isJsonConform(value:unknown) : value is JsonConform {
	switch (typeof value) {
		case "boolean" :
		case "number":
		case "string": return true;
		case "object":
			if (value === null) return true;
			else if (value instanceof RegExp) return false;
			else if (isJsonConformObject(value)) return true;
			else if (value instanceof Array) return value.every(isJsonConform);
			else return Object.values(value).every(isJsonConform);

		default : return false;
	}
}

export function asJsonConformArray<T extends ReadonlyArray<unknown>>(value:T) : T & JsonConformArray {
	return value as T & JsonConformArray;
}

export function asJsonConformHash<T extends object>(value:T) : T & JsonConformHash {
	return value as T & JsonConformHash;
}
