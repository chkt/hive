import { ValidationFailure } from "./config";

export function validateBool(value:string, id:string) : boolean {
	switch (value) {
		case 'false' : return false;
		case 'true' : return true;
		default : throw new Error(`${ id } malformed: not boolean`);
	}
}

export function validateIntPosFinite(value:string, id:string) : number {
	const i = Number.parseInt(value, 10);

	if (Number.isNaN(i) || !Number.isFinite(i) || i < 0) throw new Error(`${ id } malformed: not positive finite integer`);

	return i;
}

export function validateStringNonempty(value:string, id:string) : string {
	if (value === '') throw new Error(`${ id } malformed: empty`);

	return value;
}

export function validateStringLength(min:number, max:number, value:string, id:string) : string {
	if (value.length < min) throw new Error(`${ id } malformed: too short`);
	else if (value.length > max) throw new Error(`${ id } malformed: too long`);

	return value;
}

export function validateStringHex(value:string, id:string) : string {
	const low = value.toLowerCase();

	if (!/^[0-9a-f]+$/.test(value)) throw new Error(`${ id } malformed: not a hex string`);

	return low;
}

export function validateTokenList(value:string, id:string) : string[] {
	const tokens:string[] = value.split(',').map(val => val.trim());

	if (tokens.some(val => val === '')) throw new Error(`${ id } malformed: not a token list`);

	return tokens;
}


export function processValidationFailure(validation:ValidationFailure, handler:(id:string, err:Error) => void) : void {
	for (const id of Object.keys(validation.errors)) handler(id, validation.errors[ id ]);
}
