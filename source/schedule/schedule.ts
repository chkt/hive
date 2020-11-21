import Signals = NodeJS.Signals;
import { randomBytes } from 'crypto';
import { log_level } from '@chkt/onceupon/dist';
import { Injector } from '../inject/injector';
import { onSignals } from '../app/signals';
import { AppCommonProvider } from '../app/app';


interface ScheduleContext {
	readonly name : string;
	readonly no : number;
}

export interface TaskHandler {
	start(context:ScheduleContext) : Promise<void>;
	stop() : Promise<void>;
}

interface ScheduleConfig {
	readonly name? : string;
	readonly shutdownSignals? : ReadonlyArray<Signals>;
	readonly injector : Injector<AppCommonProvider>;
	readonly handler : TaskHandler;
	readonly interval? : number;
	readonly offset? : number;
	readonly triggerOnStart? : boolean;
	readonly maxCount? : number;
}

type ScheduleSettings = Required<ScheduleConfig>;
type DefaultScheduleSettings = Pick<ScheduleSettings, 'shutdownSignals'|'interval'|'offset'|'triggerOnStart'|'maxCount'>;
type MixedScheduleSettings = ScheduleConfig & DefaultScheduleSettings;
type ComputedScheduleSettings = Pick<ScheduleSettings, 'name'|'interval'|'offset'|'maxCount'>;

interface ScheduleControl {
	stop() : Promise<void>;
}


function getDefaultSettings() : DefaultScheduleSettings {
	return {
		shutdownSignals : [ 'SIGHUP', 'SIGINT', 'SIGTERM' ],
		interval : 60,
		offset : 0,
		triggerOnStart : false,
		maxCount : Number.POSITIVE_INFINITY
	};
}

function getComputedSettings(config:MixedScheduleSettings) : ComputedScheduleSettings {
	const interval = Math.max(Math.round(config.interval), 0);

	return {
		name : typeof config.name === 'string' ? config.name : randomBytes(16).toString('hex'),
		interval,
		offset : Math.min(Math.max(Math.round(config.offset), 0), interval),
		maxCount : Math.max(Math.round(config.maxCount), 0)
	}
}

function getSettings(config:ScheduleConfig) : ScheduleSettings {
	const settings = {
		...getDefaultSettings(),
		...config
	};

	return {
		...settings,
		...getComputedSettings(settings)
	};
}

function getDelta(settings:ScheduleSettings) {
	const offset = Date.now() % settings.interval;
	const target = offset < settings.offset ? settings.offset : settings.interval + settings.offset;

	return target - offset;
}


function countToString(num:number, limit:number) : string {
	const max = Number.isFinite(limit) ? `/${ limit }` : '';

	return `[${ num }${ max }]`
}


export function createSchedule(config:ScheduleConfig) : ScheduleControl {
	const settings = getSettings(config);
	const log = settings.injector.get('logger');

	async function handler() {
		active = true;
		num += 1;

		const now = Date.now();

		log.message(`${ settings.name } triggered ${ countToString(num, settings.maxCount) }`, log_level.info);

		try {
			await settings.handler.start({ name : settings.name, no : num - 1 });

			log.message(`${ settings.name } completed [${ Date.now() - now }ms]`, log_level.info);
		}
		catch (err) {
			log
				.failure(err, log_level.error)
				.failure(`${ settings.name } failed [${ Date.now() - now }ms]`, log_level.warn);
		}

		active = false;

		if (num < settings.maxCount && !stopped) id = setTimeout(handler, getDelta(settings));
		else log.message(`${ settings.name } stopped ${ countToString(num, settings.maxCount) }`)
	}

	log.message(`${ settings.name } started`, log_level.notice);

	let active = false;
	let stopped = false;
	let num = 0;
	let id = setTimeout(handler, settings.triggerOnStart ? 0 : getDelta(settings));

	const ctl = {
		stop : async () => {
			if (stopped) return;
			else stopped = true;

			if (active) {
				log.message(`${ settings.name } stopping ${ countToString(num, settings.maxCount) }`, log_level.notice);

				await settings.handler.stop();
			}
			else clearTimeout(id);

			log.message(`${ settings.name } stopped ${ countToString(num, settings.maxCount) }`, log_level.notice);
		}
	}

	onSignals(settings.shutdownSignals, (signal:Signals) => {
		log.message(`received ${ signal }, ${ settings.name } stopping`, log_level.notice);

		void ctl.stop();
	});

	return ctl;
}
