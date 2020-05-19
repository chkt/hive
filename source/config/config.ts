import { createDecipheriv } from 'crypto';
import { ReadonlyHash } from '../common/base/Hash';


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

export interface Config {
	hasValue(id:string) : boolean;
	isReadable(id:string) : boolean;
	getValue(id:string) : string;
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
		}
	};
}
