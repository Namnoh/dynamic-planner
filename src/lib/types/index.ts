export type ActivityCategory =
	| 'work'
	| 'study'
	| 'sport'
	| 'hobby'
	| 'social'
	| 'rest'
	| 'health'
	| 'chores'
	| string;

export interface CategoryOption {
	value: ActivityCategory | '';
	label: string;
	color?: string;
}

export interface CustomCategory {
	id: string;
	name: string;
	color: string;
	createdAt?: number;
	updatedAt?: number;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
	{ id: 'work', name: 'Trabajo', color: '#3b82f6', createdAt: 1, updatedAt: 1 },
	{ id: 'study', name: 'Estudio', color: '#6366f1', createdAt: 2, updatedAt: 2 },
	{ id: 'sport', name: 'Deporte', color: '#f59e0b', createdAt: 3, updatedAt: 3 },
	{ id: 'social', name: 'Social', color: '#ec4899', createdAt: 4, updatedAt: 4 },
	{ id: 'hobby', name: 'Hobby', color: '#10b981', createdAt: 5, updatedAt: 5 },
	{ id: 'rest', name: 'Descanso', color: '#8b5cf6', createdAt: 6, updatedAt: 6 },
	{ id: 'health', name: 'Salud', color: '#ef4444', createdAt: 7, updatedAt: 7 },
	{ id: 'chores', name: 'Hogar / Tareas', color: '#64748b', createdAt: 8, updatedAt: 8 }
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
	{ value: '', label: 'Sin categoría (Opcional)' },
	...DEFAULT_CATEGORIES.map((c) => ({
		value: c.id,
		label: c.name,
		color: c.color
	}))
];

export interface ActivityTemplate {
	id: string;
	title: string;
	category?: ActivityCategory;
	defaultDuration: number; // In minutes
	color: string; // HEX (e.g. #3b82f6) or Tailwind color token
	notes?: string;
	subtasks?: string[];
	createdAt?: number;
	updatedAt?: number;
}

export interface DayTemplateBlock {
	activityId: string;
	startTime: string; // "HH:mm" format (24-hour)
	duration: number; // In minutes
	customTitle?: string;
}

export type RecurrenceFrequency =
	| 'none'
	| 'daily'
	| 'weekdays'
	| 'weekends'
	| 'custom_days'
	| 'monthly_day';

export type RecurrenceRangeType = 'current_week' | 'weeks' | 'until_date';

export interface RecurrenceConfig {
	frequency: RecurrenceFrequency;
	customDays?: number[]; // 1 = Lunes, 2 = Martes, ..., 7 = Domingo (ISO standard)
	dayOfMonth?: number; // 1 to 31
	rangeType?: RecurrenceRangeType;
	weeksCount?: number; // 1, 2, 4, 8, 12, etc.
	endDate?: string; // "YYYY-MM-DD"
}

export interface DayTemplate {
	id: string;
	name: string;
	description?: string;
	blocks: DayTemplateBlock[];
	recurrence?: RecurrenceConfig;
	createdAt?: number;
	updatedAt?: number;
}

export interface ScheduledEventSubtask {
	id: string;
	title: string;
	completed: boolean;
}

export interface ScheduledEvent {
	id: string;
	date: string; // "YYYY-MM-DD"
	startTime: string; // "HH:mm"
	endTime: string; // "HH:mm"
	title: string;
	category?: ActivityCategory;
	completed: boolean;
	sourceTemplateId?: string;
	notes?: string;
	color?: string;
	subtasks?: ScheduledEventSubtask[];
	recurrenceId?: string;
	recurrenceRule?: RecurrenceConfig;
}

export type SpecialEventType = 'birthday' | 'anniversary' | 'holiday' | 'reminder';

export interface SpecialEvent {
	id: string;
	date: string; // "YYYY-MM-DD" or "MM-DD" for yearly recurring
	title: string;
	type: SpecialEventType;
	notifyBeforeDays: number;
	notes?: string;
}

export interface AppSetting {
	key: string;
	value: any;
}

export interface CategoryMetadata {
	id: ActivityCategory;
	name: string;
	color: string;
	borderColor: string;
	badgeBg: string;
	badgeText: string;
	iconName: string;
}

export interface ExportImageOptions {
	format: 'png' | 'jpeg' | 'webp';
	quality?: number; // 0.1 to 1.0 (for jpeg/webp)
	scale?: number; // 1x or 2x for Retina/HD
	filename?: string;
	backgroundColor?: string;
	hideSelectors?: string[];
}

// -------------------------------------------------------------
// SORTING OPTIONS & HELPERS
// -------------------------------------------------------------

export type ActivitySortOption =
	| 'name_asc'
	| 'name_desc'
	| 'category_asc'
	| 'duration_asc'
	| 'duration_desc'
	| 'created_desc'
	| 'created_asc'
	| 'updated_desc';

export type DayTemplateSortOption =
	| 'name_asc'
	| 'name_desc'
	| 'blocks_desc'
	| 'blocks_asc'
	| 'created_desc'
	| 'created_asc'
	| 'updated_desc';

export type CategorySortOption =
	| 'name_asc'
	| 'name_desc'
	| 'created_desc'
	| 'created_asc'
	| 'updated_desc'
	| 'default';

export function getItemCreatedAt(item: { id: string; createdAt?: number }): number {
	if (typeof item.createdAt === 'number' && !isNaN(item.createdAt)) return item.createdAt;
	const match = item.id.match(/(?:act|tpl|cat|event)-(\d+)/);
	return match ? Number(match[1]) : 0;
}

export function getItemUpdatedAt(item: { id: string; createdAt?: number; updatedAt?: number }): number {
	if (typeof item.updatedAt === 'number' && !isNaN(item.updatedAt)) return item.updatedAt;
	return getItemCreatedAt(item);
}

export function sortActivities(
	activities: ActivityTemplate[],
	sortOption: ActivitySortOption,
	categoryNamesMap?: Map<string, string>
): ActivityTemplate[] {
	return [...activities].sort((a, b) => {
		switch (sortOption) {
			case 'name_asc':
				return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			case 'name_desc':
				return b.title.localeCompare(a.title, 'es', { sensitivity: 'base' });
			case 'category_asc': {
				const catA = (categoryNamesMap?.get(a.category || '') || a.category || '').toLowerCase();
				const catB = (categoryNamesMap?.get(b.category || '') || b.category || '').toLowerCase();
				const catComp = catA.localeCompare(catB, 'es', { sensitivity: 'base' });
				return catComp !== 0 ? catComp : a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			}
			case 'duration_asc':
				return a.defaultDuration - b.defaultDuration || a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			case 'duration_desc':
				return b.defaultDuration - a.defaultDuration || a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			case 'created_desc':
				return getItemCreatedAt(b) - getItemCreatedAt(a);
			case 'created_asc':
				return getItemCreatedAt(a) - getItemCreatedAt(b);
			case 'updated_desc':
				return getItemUpdatedAt(b) - getItemUpdatedAt(a);
			default:
				return 0;
		}
	});
}

export function sortDayTemplates(
	templates: DayTemplate[],
	sortOption: DayTemplateSortOption
): DayTemplate[] {
	return [...templates].sort((a, b) => {
		switch (sortOption) {
			case 'name_asc':
				return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
			case 'name_desc':
				return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
			case 'blocks_desc':
				return b.blocks.length - a.blocks.length || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
			case 'blocks_asc':
				return a.blocks.length - b.blocks.length || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
			case 'created_desc':
				return getItemCreatedAt(b) - getItemCreatedAt(a);
			case 'created_asc':
				return getItemCreatedAt(a) - getItemCreatedAt(b);
			case 'updated_desc':
				return getItemUpdatedAt(b) - getItemUpdatedAt(a);
			default:
				return 0;
		}
	});
}

export function sortCategories(
	categories: CustomCategory[],
	sortOption: CategorySortOption
): CustomCategory[] {
	if (sortOption === 'default') return [...categories];
	return [...categories].sort((a, b) => {
		switch (sortOption) {
			case 'name_asc':
				return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
			case 'name_desc':
				return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
			case 'created_desc':
				return getItemCreatedAt(b) - getItemCreatedAt(a);
			case 'created_asc':
				return getItemCreatedAt(a) - getItemCreatedAt(b);
			case 'updated_desc':
				return getItemUpdatedAt(b) - getItemUpdatedAt(a);
			default:
				return 0;
		}
	});
}

// -------------------------------------------------------------
// RECURRENCE HELPERS
// -------------------------------------------------------------

export const ISO_DAY_NAMES: Record<number, { full: string; short: string }> = {
	1: { full: 'Lunes', short: 'Lun' },
	2: { full: 'Martes', short: 'Mar' },
	3: { full: 'Miércoles', short: 'Mié' },
	4: { full: 'Jueves', short: 'Jue' },
	5: { full: 'Viernes', short: 'Vie' },
	6: { full: 'Sábado', short: 'Sáb' },
	7: { full: 'Domingo', short: 'Dom' }
};

export function getIsoDayOfWeek(d: Date): number {
	const day = d.getDay();
	return day === 0 ? 7 : day;
}

export function formatDateToYYYYMMDD(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseYYYYMMDD(str: string): Date {
	const [y, m, d] = str.split('-').map(Number);
	return new Date(y, m - 1, d, 12, 0, 0);
}

export function isDateMatchingRecurrence(date: Date, config?: RecurrenceConfig): boolean {
	if (!config || config.frequency === 'none') return false;
	const isoDay = getIsoDayOfWeek(date);

	switch (config.frequency) {
		case 'daily':
			return true;
		case 'weekdays':
			return isoDay >= 1 && isoDay <= 5;
		case 'weekends':
			return isoDay === 6 || isoDay === 7;
		case 'custom_days':
			return Boolean(config.customDays && config.customDays.includes(isoDay));
		case 'monthly_day':
			return date.getDate() === (config.dayOfMonth ?? 1);
		default:
			return false;
	}
}

export function getRecurrenceLabel(config?: RecurrenceConfig): string {
	if (!config || config.frequency === 'none') return '';
	switch (config.frequency) {
		case 'daily':
			return 'Todos los días';
		case 'weekdays':
			return 'Lunes a Viernes';
		case 'weekends':
			return 'Sábados y Domingos';
		case 'custom_days': {
			if (!config.customDays || config.customDays.length === 0) return 'Días seleccionados';
			if (config.customDays.length === 7) return 'Todos los días';
			if (
				config.customDays.length === 5 &&
				[1, 2, 3, 4, 5].every((d) => config.customDays?.includes(d))
			) {
				return 'Lunes a Viernes';
			}
			if (
				config.customDays.length === 2 &&
				[6, 7].every((d) => config.customDays?.includes(d))
			) {
				return 'Sábados y Domingos';
			}
			const sorted = [...config.customDays].sort((a, b) => a - b);
			return sorted.map((d) => ISO_DAY_NAMES[d]?.short || d).join(', ');
		}
		case 'monthly_day':
			return `Cada día ${config.dayOfMonth ?? 1} del mes`;
		default:
			return '';
	}
}

export function calculateRecurrenceDates(
	startDateStr: string,
	config: RecurrenceConfig,
	options?: { startFromWeekMonday?: boolean }
): string[] {
	if (!config || config.frequency === 'none') {
		return [startDateStr];
	}

	const baseDate = parseYYYYMMDD(startDateStr);
	let startLoopDate = new Date(baseDate);

	if (options?.startFromWeekMonday) {
		const isoDay = getIsoDayOfWeek(startLoopDate);
		startLoopDate.setDate(startLoopDate.getDate() - (isoDay - 1));
	}

	let endLimitDate: Date;
	const rangeType = config.rangeType || 'weeks';

	if (rangeType === 'current_week') {
		const isoDay = getIsoDayOfWeek(baseDate);
		endLimitDate = new Date(baseDate);
		endLimitDate.setDate(endLimitDate.getDate() + (7 - isoDay));
	} else if (rangeType === 'until_date' && config.endDate) {
		endLimitDate = parseYYYYMMDD(config.endDate);
		if (endLimitDate < startLoopDate) {
			endLimitDate = new Date(startLoopDate);
		}
	} else {
		const weeks = Math.max(1, config.weeksCount ?? 4);
		endLimitDate = new Date(startLoopDate);
		endLimitDate.setDate(endLimitDate.getDate() + weeks * 7 - 1);
	}

	const dates: string[] = [];
	const current = new Date(startLoopDate);

	let safety = 0;
	while (current <= endLimitDate && safety < 366) {
		safety++;
		if (isDateMatchingRecurrence(current, config)) {
			dates.push(formatDateToYYYYMMDD(current));
		}
		current.setDate(current.getDate() + 1);
	}

	if (dates.length === 0 && isDateMatchingRecurrence(baseDate, config)) {
		dates.push(startDateStr);
	}

	return dates;
}


