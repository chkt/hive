type JsonStringTransform = () => string;

interface JsonConformObject { toJSON : JsonStringTransform; }

type JsonConformValue = boolean|number|string|null|JsonConformObject|JsonConformArray|JsonConformHash;

export interface JsonConformArray extends Array<JsonConformValue> {}
export interface JsonConformHash { [key:string] : JsonConformValue; }

export type JsonConform = JsonConformArray|JsonConformHash;
