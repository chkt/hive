import { ReadonlyHash } from '../common/base/Hash';
import { Config, ConfigData, ConfigItem, ConfigKey, createConfig } from './config';
import { readFile, watchFile } from 'fs';


type trigger = (config:Promise<Config>) => void;
type readFileOpts = { encoding? : BufferEncoding, flag? : string}|string;


function isConfigItem(value:unknown) : value is ConfigItem {
	const item = value as ConfigItem;

	return typeof value === 'object' && value !== null && 'value' in value && typeof item.value === 'string';
}

function isConfigData(value:unknown) : value is ConfigData {
	const data = value as ConfigData;

	if (typeof value !== 'object' || value === null) return false;

	for (const key in data) {
		if (data.hasOwnProperty(key) && !isConfigItem(data[key])) return false;
	}

	return true;
}

function readFileAsync(path:string, opts?:readFileOpts) : Promise<string|Buffer> {
	return new Promise((resolve, reject) => {
		readFile(path, opts, (err, data) => {
			if (err !== null) reject(err);
			else resolve(data);
		});
	});
}

function parseJson(json:string|Buffer) : ConfigData {
	if (Buffer.isBuffer(json)) json = json.toString('utf8');

	const data = JSON.parse(json);

	if (!isConfigData(data)) throw new Error();

	return data;
}


export function createFileConfig(
	path:string,
	keys:ReadonlyHash<ConfigKey> = {},
	onUpdate?:trigger
) : Promise<Config> {
	const opts:readFileOpts = { encoding : 'utf8' };

	return readFileAsync(path, opts)
		.then(json => {
			const data = parseJson(json);

			return createConfig(data, keys);
		})
		.then(config => {
			if (onUpdate !== undefined) {
				watchFile(path, { persistent : false }, () => {
					onUpdate(readFileAsync(path, opts).then(json => {
						const data = parseJson(json);

						return createConfig(data, keys);
					}));
				});
			}

			return config;
		});
}
