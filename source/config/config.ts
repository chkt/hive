import { createDecipheriv } from 'crypto';
import { Hash, ReadonlyHash } from '../common/base/Hash';


interface PlainConfigItem {
	readonly value : string;
}

interface EncryptedConfigItem extends PlainConfigItem {
	readonly keyName : string;
}

export type ConfigItem = PlainConfigItem|EncryptedConfigItem;
export type ConfigData = ReadonlyHash<ConfigItem>;

export interface ConfigKey {
	readonly scheme : 'aes-256-cbc';
	readonly key : string;
}

type validate = (value:string, id:string) => any;

interface Validator {
	readonly alias? : string;
	readonly validate? : validate;
}

type Validators = ReadonlyHash<Validator>;
type ValidationValues<T extends Validators> = { readonly [ K in keyof T ] : T[K]['validate'] extends validate ? ReturnType<T[K]['validate']> : string };

export interface Validation<T extends Validators> {
	readonly valid : true;
	readonly values : ValidationValues<T>
}

export interface ValidationFailure {
	readonly valid : false;
	readonly unreadable : ReadonlyArray<string>;
	readonly invalided : ReadonlyArray<string>;
	readonly validated : ReadonlyArray<string>;
	readonly errors : ReadonlyHash<Error>;
}

export type ValidationResult<T extends Validators> = Validation<T> | ValidationFailure;

export function isValidationFailure<T extends Validators>(result:ValidationResult<T>) : result is ValidationFailure {
	return !result.valid;
}

export interface Config {
	hasValue(id:string) : boolean;
	isReadable(id:string) : boolean;
	getValue(id:string) : string;
	validate<T extends Validators>(fields:T) : ValidationResult<T>;
}


export const enum scheme {
	aes256 = 'aes-256-cbc'
}


function isEncryptedConfigItem(item:ConfigItem) : item is EncryptedConfigItem {
	return 'keyName' in item;
}

function decrypt(id:string, item:EncryptedConfigItem, keys:ReadonlyHash<ConfigKey>) : string {
	if (!(item.keyName in keys)) throw new Error(`missing key '${ id }'`);

	const decode = keys[item.keyName];
	const parts = item.value.split(':', 2);

	if (parts.length === 1) throw new Error(`missing iv '${ id }'`);

	const key = Buffer.from(decode.key, 'hex');
	const iv = Buffer.from(parts[0], 'hex');

	try {
		const cipher = createDecipheriv(decode.scheme, key, iv);

		return cipher.update(parts[1], 'hex', 'utf8') + cipher.final('utf8');
	}
	catch (err) {
		switch (err.message) {
			case 'Invalid IV length' : throw new Error(`malformed iv '${ id }'`)
			case 'Invalid key length' : throw new Error(`malformed key '${ id }'`);
			default : throw err;
		}
	}
}


export function createConfig(data:ConfigData, keys:ReadonlyHash<ConfigKey> = {}) : Config {
	return {
		hasValue(id:string) : boolean {
			return id in data;
		},
		isReadable(id:string) : boolean {
			if (!this.hasValue(id)) return false;

			const item = data[id];

			return isEncryptedConfigItem(item) ? item.keyName in keys : true;
		},
		getValue(id:string) : string {
			if (!this.hasValue(id)) throw new Error(`no value '${ id }'`);

			const item = data[id];

			return isEncryptedConfigItem(item) ? decrypt(id, item, keys) : item.value;
		},
		validate<T extends Validators>(fields:T) {
			const missing:string[] = [];
			const invalid:string[] = [];
			const errors:Hash<Error> = {};
			const values:Partial<ValidationValues<T>> = {};

			for (const name of Object.keys(fields) as (keyof T extends string ? keyof T : never)[]) {
				const field = fields[name];
				const id = field.alias ?? name;

				if (this.isReadable(id)) {
					const value = this.getValue(id);
					const validate = field.validate ?? (val => val);

					try {
						values[name] = validate(value, id);
					}
					catch (err) {
						invalid.push(name);
						errors[name] = err instanceof Error ? err : new Error(String(err))
					}
				}
				else {
					missing.push(name);
					errors[name] = new Error(`${ id } missing`);
				}
			}

			if (missing.length !== 0 || invalid.length !== 0) {
				return {
					valid : false,
					unreadable : missing,
					invalided : invalid,
					validated : Object.keys(values),
					errors
				}
			}
			else {
				return {
					valid : true,
					values : values as ValidationValues<T>
				}
			}
		}
	};
}
