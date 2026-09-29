export type BlockColorStyle = 'border' | 'full';

export interface PlannerSettings {
	blockColorStyle: BlockColorStyle;
}

const STORAGE_KEY = 'dynamic_planner_block_color_style';

type Listener = (style: BlockColorStyle) => void;
let listeners: Listener[] = [];
let currentStyle: BlockColorStyle = 'border';

if (typeof window !== 'undefined') {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === 'full' || saved === 'border') {
		currentStyle = saved;
	}
}

export const settingsStore = {
	subscribe(fn: Listener) {
		listeners.push(fn);
		fn(currentStyle);
		return () => {
			listeners = listeners.filter((l) => l !== fn);
		};
	},
	setBlockColorStyle(style: BlockColorStyle) {
		currentStyle = style;
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, style);
		}
		listeners.forEach((fn) => fn(currentStyle));
	},
	get current() {
		return currentStyle;
	}
};
