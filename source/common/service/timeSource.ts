export interface TimeSource {
	now() : number;
}


export function createTimeSource() : TimeSource {
	return {
		now : Date.now
	};
}
