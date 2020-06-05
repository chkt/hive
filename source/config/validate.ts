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


export function processValidationFailure(validation:ValidationFailure, handler:(id:string, err:Error) => void) : void {
	for (const id of Object.keys(validation.errors)) handler(id, validation.errors[ id ]);
}
