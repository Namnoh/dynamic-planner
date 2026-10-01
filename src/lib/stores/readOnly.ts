const STORAGE_KEY = 'dynamic_planner_read_only_mode';

type Listener = (val: boolean) => void;
let listeners: Listener[] = [];
let currentReadOnly = false;

if (typeof window !== 'undefined') {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved !== null) {
		currentReadOnly = saved === 'true';
	}
}

export const readOnlyStore = {
	subscribe(fn: Listener) {
		listeners.push(fn);
		fn(currentReadOnly);
		return () => {
			listeners = listeners.filter((l) => l !== fn);
		};
	},
	toggle(): boolean {
		this.set(!currentReadOnly);
		return currentReadOnly;
	},
	set(val: boolean) {
		currentReadOnly = val;
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, String(val));
		}
		listeners.forEach((fn) => fn(currentReadOnly));
	},
	get current(): boolean {
		return currentReadOnly;
	}
};
