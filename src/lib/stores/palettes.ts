import { db } from '$lib/db';

export const DEFAULT_COLORS: string[] = [
	'#3b82f6', // Blue
	'#10b981', // Emerald
	'#f59e0b', // Amber
	'#8b5cf6', // Violet
	'#f43f5e', // Rose
	'#06b6d4', // Cyan
	'#84cc16', // Lime
	'#ec4899', // Pink
	'#6366f1', // Indigo
	'#64748b'  // Slate
];

const STORAGE_KEY = 'dynamic_planner_custom_palette';

const INITIAL_CUSTOM_COLORS: string[] = [
	'#ff7849', // Vibrant orange
	'#14b8a6', // Teal
	'#d946ef', // Fuchsia
	'#38bdf8'  // Sky
];

type PaletteListener = (colors: string[]) => void;
let listeners: PaletteListener[] = [];
let customColors: string[] = [...INITIAL_CUSTOM_COLORS];

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (Array.isArray(parsed)) {
				customColors = parsed;
			}
		}
	} catch (e) {
		console.warn('Could not read custom palette from localStorage:', e);
	}
}

// Asynchronously sync from IndexedDB settings
if (typeof window !== 'undefined') {
	db.settings.get('customPalette').then((setting) => {
		if (setting && Array.isArray(setting.value)) {
			customColors = setting.value;
			notify();
		}
	}).catch(() => {
		// Ignore if DB not ready yet
	});
}

function notify(): void {
	listeners.forEach((fn) => fn([...customColors]));
}

function persist(): void {
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(customColors));
			db.settings.put({ key: 'customPalette', value: customColors }).catch(() => {});
		} catch (e) {
			console.warn('Could not persist custom palette:', e);
		}
	}
	notify();
}

export const paletteStore = {
	subscribe(fn: PaletteListener) {
		listeners.push(fn);
		fn([...customColors]);
		return () => {
			listeners = listeners.filter((l) => l !== fn);
		};
	},

	get current(): string[] {
		return [...customColors];
	},

	addColor(hexColor: string): boolean {
		if (!hexColor) return false;
		const normalized = hexColor.trim().toLowerCase();
		// Validate 6-digit or 3-digit hex
		if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
			return false;
		}

		if (customColors.includes(normalized)) {
			return false; // Already in custom palette
		}

		customColors = [...customColors, normalized];
		persist();
		return true;
	},

	removeColor(hexColor: string): void {
		const normalized = hexColor.trim().toLowerCase();
		customColors = customColors.filter((c) => c !== normalized);
		persist();
	},

	resetColors(): void {
		customColors = [...INITIAL_CUSTOM_COLORS];
		persist();
	}
};
