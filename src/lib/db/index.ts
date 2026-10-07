import Dexie, { type Table } from 'dexie';
import {
	DEFAULT_CATEGORIES,
	type ActivityTemplate,
	type DayTemplate,
	type ScheduledEvent,
	type ScheduledEventSubtask,
	type SpecialEvent,
	type AppSetting,
	type CustomCategory,
	type RecurrenceConfig,
	formatDateToYYYYMMDD,
	calculateRecurrenceDates,
	isDateMatchingRecurrence
} from '$lib/types';

export class DynamicPlannerDatabase extends Dexie {
	activityTemplates!: Table<ActivityTemplate, string>;
	dayTemplates!: Table<DayTemplate, string>;
	scheduledEvents!: Table<ScheduledEvent, string>;
	specialEvents!: Table<SpecialEvent, string>;
	settings!: Table<AppSetting, string>;
	categories!: Table<CustomCategory, string>;

	constructor() {
		super('DynamicPlannerDB');

		// Version 1 of the schema
		this.version(1).stores({
			activityTemplates: 'id, title, category',
			dayTemplates: 'id, name',
			scheduledEvents: 'id, date, startTime, endTime, category, completed',
			specialEvents: 'id, date, type',
			settings: 'key'
		});

		// Version 2: Custom Categories
		this.version(2).stores({
			categories: 'id, name'
		});

		// Version 3: Recurrence Support
		this.version(3).stores({
			scheduledEvents: 'id, date, startTime, endTime, category, completed, recurrenceId'
		});
	}
}

export const db = new DynamicPlannerDatabase();

// -------------------------------------------------------------
// CALENDAR & TIME UTILITIES
// -------------------------------------------------------------

/**
 * Calculates start and end times helper
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
	const [h, m] = timeStr.split(':').map(Number);
	const totalMin = h * 60 + m + minutes;
	const hours = Math.floor(totalMin / 60) % 24;
	const mins = totalMin % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Gets Monday of the current week
 */
export function getMondayOfCurrentWeek(d = new Date()): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
	date.setDate(diff);
	date.setHours(0, 0, 0, 0);
	return date;
}

// -------------------------------------------------------------
// DATABASE UTILITY FUNCTIONS
// -------------------------------------------------------------

/**
 * Completely clears all tables to allow building a routine from a blank canvas.
 */
export async function clearAllData(): Promise<void> {
	await db.transaction(
		'rw',
		[
			db.activityTemplates,
			db.dayTemplates,
			db.scheduledEvents,
			db.specialEvents,
			db.settings
		],
		async () => {
			await db.activityTemplates.clear();
			await db.dayTemplates.clear();
			await db.scheduledEvents.clear();
			await db.specialEvents.clear();
			await db.settings.put({ key: 'hasDemoData', value: false });
		}
	);
}

/**
 * Applies a Day Template to a specific target date, generating ScheduledEvent instances.
 */
export async function applyDayTemplateToDate(
	templateId: string,
	targetDateStr: string,
	recurrenceId?: string,
	recurrenceRule?: RecurrenceConfig
): Promise<number> {
	const template = await db.dayTemplates.get(templateId);
	if (!template) {
		throw new Error(`Plantilla no encontrada: ${templateId}`);
	}

	const allActivities = await db.activityTemplates.toArray();
	const actMap = new Map(allActivities.map((a) => [a.id, a]));

	const newEvents: ScheduledEvent[] = [];

	for (const block of template.blocks) {
		const act = actMap.get(block.activityId);
		const endTime = addMinutesToTime(block.startTime, block.duration);
		const title = block.customTitle || (act ? act.title : 'Actividad');
		const category = act ? act.category : 'work';
		const color = act?.color || '#3b82f6';

		newEvents.push({
			id: crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			date: targetDateStr,
			startTime: block.startTime,
			endTime,
			title,
			category,
			completed: false,
			sourceTemplateId: template.id,
			color,
			notes: act?.notes,
			subtasks: act?.subtasks?.map((st, i) => ({
				id: `st-${i}`,
				title: st,
				completed: false
			})),
			recurrenceId,
			recurrenceRule: recurrenceRule ? JSON.parse(JSON.stringify(recurrenceRule)) : undefined
		});
	}

	await db.scheduledEvents.bulkAdd(newEvents);
	return newEvents.length;
}

/**
 * Applies a Day Template across dates according to a recurrence configuration.
 */
export async function applyDayTemplateWithRecurrence(
	templateId: string,
	baseMonday: Date,
	config: RecurrenceConfig,
	weeksCount = 1
): Promise<{ daysCount: number; blocksCount: number }> {
	const mondayStr = formatDateToYYYYMMDD(baseMonday);
	const targetDates = calculateRecurrenceDates(mondayStr, {
		...config,
		rangeType: 'weeks',
		weeksCount
	});

	if (targetDates.length === 0) {
		return { daysCount: 0, blocksCount: 0 };
	}

	const seriesRecurrenceId = crypto.randomUUID
		? crypto.randomUUID()
		: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

	let totalBlocks = 0;
	for (const dateStr of targetDates) {
		const count = await applyDayTemplateToDate(templateId, dateStr, seriesRecurrenceId, config);
		totalBlocks += count;
	}

	return { daysCount: targetDates.length, blocksCount: totalBlocks };
}

/**
 * Applies all Day Templates with configured recurrence to the active week.
 */
export async function applyRecurringTemplatesToWeek(
	mondayDate: Date
): Promise<{ appliedTemplates: number; totalBlocks: number; matchedDays: number; details: string[] }> {
	const allTemplates = await db.dayTemplates.toArray();
	const recurringTemplates = allTemplates.filter(
		(t) => t.recurrence && t.recurrence.frequency !== 'none'
	);

	if (recurringTemplates.length === 0) {
		return { appliedTemplates: 0, totalBlocks: 0, matchedDays: 0, details: [] };
	}

	const weekDays: { date: Date; dateStr: string }[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(mondayDate);
		d.setDate(d.getDate() + i);
		weekDays.push({
			date: d,
			dateStr: formatDateToYYYYMMDD(d)
		});
	}

	let totalBlocks = 0;
	const appliedTplIds = new Set<string>();
	const matchedDates = new Set<string>();
	const details: string[] = [];

	for (const tpl of recurringTemplates) {
		if (!tpl.recurrence) continue;
		let tplBlocksCount = 0;
		let tplDaysCount = 0;
		const seriesRecurrenceId = crypto.randomUUID
			? crypto.randomUUID()
			: `rec-${tpl.id}-${mondayDate.getTime()}`;

		for (const day of weekDays) {
			if (isDateMatchingRecurrence(day.date, tpl.recurrence)) {
				const count = await applyDayTemplateToDate(
					tpl.id,
					day.dateStr,
					seriesRecurrenceId,
					tpl.recurrence
				);
				tplBlocksCount += count;
				tplDaysCount++;
				appliedTplIds.add(tpl.id);
				matchedDates.add(day.dateStr);
			}
		}

		if (tplDaysCount > 0) {
			totalBlocks += tplBlocksCount;
			details.push(`"${tpl.name}" aplicada a ${tplDaysCount} ${tplDaysCount === 1 ? 'día' : 'días'}`);
		}
	}

	return {
		appliedTemplates: appliedTplIds.size,
		totalBlocks,
		matchedDays: matchedDates.size,
		details
	};
}

/**
 * Deletes all scheduled events belonging to a recurring series.
 */
export async function deleteRecurringEvents(
	recurrenceId: string,
	fromDateStr?: string
): Promise<number> {
	const all = await db.scheduledEvents.toArray();
	const toDelete = all.filter(
		(e) => e.recurrenceId === recurrenceId && (!fromDateStr || e.date >= fromDateStr)
	);
	if (toDelete.length > 0) {
		await db.scheduledEvents.bulkDelete(toDelete.map((e) => e.id));
	}
	return toDelete.length;
}

/**
 * Updates all scheduled events belonging to a recurring series.
 */
export async function updateRecurringEvents(
	recurrenceId: string,
	updates: Partial<ScheduledEvent>,
	fromDateStr?: string
): Promise<number> {
	const all = await db.scheduledEvents.toArray();
	const toUpdate = all.filter(
		(e) => e.recurrenceId === recurrenceId && (!fromDateStr || e.date >= fromDateStr)
	);
	if (toUpdate.length === 0) return 0;

	for (const evt of toUpdate) {
		if (updates.title !== undefined) evt.title = updates.title;
		if (updates.startTime !== undefined) evt.startTime = updates.startTime;
		if (updates.endTime !== undefined) evt.endTime = updates.endTime;
		if (updates.category !== undefined) evt.category = updates.category;
		if (updates.color !== undefined) evt.color = updates.color;
		if (updates.notes !== undefined) evt.notes = updates.notes;
		if (updates.subtasks !== undefined) {
			evt.subtasks = updates.subtasks.map((st, i) => ({
				id: crypto.randomUUID
					? crypto.randomUUID()
					: `st-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
				title: st.title,
				completed: false
			}));
		}
	}

	await db.scheduledEvents.bulkPut(toUpdate);
	return toUpdate.length;
}

/**
 * Ensures initial default categories exist in the database
 */
export async function ensureDefaultCategories(): Promise<void> {
	try {
		const count = await db.categories.count();
		if (count === 0) {
			await db.categories.bulkAdd(DEFAULT_CATEGORIES);
		}
	} catch (e) {
		console.error('Error al inicializar categorías por defecto:', e);
	}
}

export type ExportScope = 'full' | 'templates_only' | 'recent_month' | 'current_week';

/**
 * Exports all database tables to a structured JSON string.
 */
export async function exportDatabaseToJson(
	scope: ExportScope = 'full',
	pretty = false
): Promise<string> {
	await ensureDefaultCategories();
	const [activities, dayTemplates, allEvents, specialEvents, settings, categories] = await Promise.all([
		db.activityTemplates.toArray(),
		db.dayTemplates.toArray(),
		db.scheduledEvents.toArray(),
		db.specialEvents.toArray(),
		db.settings.toArray(),
		db.categories.toArray()
	]);

	let events = allEvents;
	if (scope === 'templates_only') {
		events = [];
	} else if (scope === 'recent_month') {
		const pastLimit = new Date();
		pastLimit.setDate(pastLimit.getDate() - 30);
		const pastLimitStr = formatDateToYYYYMMDD(pastLimit);
		events = allEvents.filter((e) => e.date >= pastLimitStr);
	} else if (scope === 'current_week') {
		const monday = getMondayOfCurrentWeek();
		const sunday = new Date(monday);
		sunday.setDate(sunday.getDate() + 6);
		const monStr = formatDateToYYYYMMDD(monday);
		const sunStr = formatDateToYYYYMMDD(sunday);
		events = allEvents.filter((e) => e.date >= monStr && e.date <= sunStr);
	}

	const backup = {
		app: 'dynamic-planner',
		version: '1.0.0',
		scope,
		exportedAt: new Date().toISOString(),
		data: {
			activities,
			dayTemplates,
			events,
			specialEvents,
			settings,
			categories
		}
	};

	return pretty ? JSON.stringify(backup, null, 2) : JSON.stringify(backup);
}

export type ImportMode = 'replace' | 'merge';

/**
 * Imports a JSON backup string into IndexedDB.
 */
export async function importDatabaseFromJson(
	jsonContent: string,
	mode: ImportMode = 'replace'
): Promise<{ success: boolean; eventsCount: number; templatesCount: number }> {
	const parsed = JSON.parse(jsonContent);

	if (!parsed || parsed.app !== 'dynamic-planner' || !parsed.data) {
		throw new Error('Formato de archivo inválido. No es un respaldo compatible con dynamic-planner.');
	}

	const {
		activities = [],
		dayTemplates = [],
		events = [],
		specialEvents = [],
		settings = [],
		categories = []
	} = parsed.data;

	await db.transaction(
		'rw',
		[
			db.activityTemplates,
			db.dayTemplates,
			db.scheduledEvents,
			db.specialEvents,
			db.settings,
			db.categories
		],
		async () => {
			if (mode === 'replace') {
				await db.activityTemplates.clear();
				await db.dayTemplates.clear();
				await db.scheduledEvents.clear();
				await db.specialEvents.clear();
				await db.settings.clear();
				await db.categories.clear();

				if (activities.length) await db.activityTemplates.bulkAdd(activities);
				if (dayTemplates.length) await db.dayTemplates.bulkAdd(dayTemplates);
				if (events.length) await db.scheduledEvents.bulkAdd(events);
				if (specialEvents.length) await db.specialEvents.bulkAdd(specialEvents);
				if (settings.length) await db.settings.bulkAdd(settings);
				if (categories.length) {
					await db.categories.bulkAdd(categories);
				} else {
					await db.categories.bulkAdd(DEFAULT_CATEGORIES);
				}
			} else {
				// 'merge' mode: bulkPut merges or adds items without clearing
				if (activities.length) await db.activityTemplates.bulkPut(activities);
				if (dayTemplates.length) await db.dayTemplates.bulkPut(dayTemplates);
				if (events.length) await db.scheduledEvents.bulkPut(events);
				if (specialEvents.length) await db.specialEvents.bulkPut(specialEvents);
				if (settings.length) await db.settings.bulkPut(settings);
				if (categories.length) await db.categories.bulkPut(categories);
			}
		}
	);

	return {
		success: true,
		eventsCount: events.length,
		templatesCount: dayTemplates.length
	};
}

// -------------------------------------------------------------
// BATCH PROPAGATION / SYNCHRONIZATION HELPERS
// -------------------------------------------------------------

export interface EventPropagationOptions {
	sourceEventId: string;
	scope: 'same_title' | 'all';
	title: string;
	sourceTemplateId?: string;
	fields: {
		color?: string;
		category?: string;
		notes?: string;
		subtasks?: ScheduledEventSubtask[];
	};
	updateBaseTemplate?: boolean;
}

/**
 * Propagates changes made on a single ScheduledEvent to other scheduled events,
 * and optionally updates any matching base ActivityTemplate.
 */
export async function propagateEventChanges(options: EventPropagationOptions): Promise<{
	updatedCount: number;
	templateUpdated: boolean;
}> {
	const allEvents = await db.scheduledEvents.toArray();
	const trimmedTitle = options.title.trim().toLowerCase();

	const targetEvents = allEvents.filter((e) => {
		if (e.id === options.sourceEventId) return false;
		if (options.scope === 'all') return true;

		// Match by sourceTemplateId if present, or by title (case-insensitive)
		const sameTemplate = Boolean(options.sourceTemplateId && e.sourceTemplateId === options.sourceTemplateId);
		const sameTitle = Boolean(trimmedTitle && e.title.trim().toLowerCase() === trimmedTitle);
		return sameTemplate || sameTitle;
	});

	if (targetEvents.length > 0) {
		for (const evt of targetEvents) {
			if (options.fields.color !== undefined) {
				evt.color = options.fields.color;
			}
			if (options.fields.category !== undefined) {
				evt.category = options.fields.category || undefined;
			}
			if (options.fields.notes !== undefined) {
				evt.notes = options.fields.notes || undefined;
			}
			if (options.fields.subtasks !== undefined) {
				evt.subtasks =
					options.fields.subtasks.length > 0
						? options.fields.subtasks.map((st, i) => ({
								id: crypto.randomUUID
									? crypto.randomUUID()
									: `st-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
								title: st.title,
								completed: false
						  }))
						: undefined;
			}
		}

		await db.scheduledEvents.bulkPut(targetEvents);
	}

	let templateUpdated = false;
	if (options.updateBaseTemplate) {
		let template: ActivityTemplate | undefined;
		if (options.sourceTemplateId) {
			template = await db.activityTemplates.get(options.sourceTemplateId);
		}
		if (!template && trimmedTitle) {
			const allTemplates = await db.activityTemplates.toArray();
			template = allTemplates.find((t) => t.title.trim().toLowerCase() === trimmedTitle);
		}

		if (template) {
			const updatedTemplate: ActivityTemplate = {
				...template,
				...(options.fields.color !== undefined ? { color: options.fields.color } : {}),
				...(options.fields.category !== undefined ? { category: options.fields.category || undefined } : {}),
				...(options.fields.notes !== undefined ? { notes: options.fields.notes || undefined } : {}),
				...(options.fields.subtasks !== undefined
					? { subtasks: options.fields.subtasks.map((s) => s.title.trim()).filter(Boolean) }
					: {})
			};
			await db.activityTemplates.put(updatedTemplate);
			templateUpdated = true;
		}
	}

	return {
		updatedCount: targetEvents.length,
		templateUpdated
	};
}

export interface ActivityTemplatePropagationOptions {
	templateId: string;
	templateTitle: string;
	scope: 'same_template' | 'all';
	fields: {
		color?: string;
		category?: string;
		duration?: number;
		notes?: string;
		subtasks?: string[];
	};
}

/**
 * Propagates changes made on an ActivityTemplate to scheduled events in the database.
 */
export async function propagateActivityTemplateChanges(
	options: ActivityTemplatePropagationOptions
): Promise<number> {
	const allEvents = await db.scheduledEvents.toArray();
	const trimmedTitle = options.templateTitle.trim().toLowerCase();

	const targetEvents = allEvents.filter((e) => {
		if (options.scope === 'all') return true;
		const sameTemplate = e.sourceTemplateId === options.templateId;
		const sameTitle = Boolean(trimmedTitle && e.title.trim().toLowerCase() === trimmedTitle);
		return sameTemplate || sameTitle;
	});

	if (targetEvents.length === 0) return 0;

	for (const evt of targetEvents) {
		if (options.fields.color !== undefined) {
			evt.color = options.fields.color;
		}
		if (options.fields.category !== undefined) {
			evt.category = options.fields.category || undefined;
		}
		if (options.fields.notes !== undefined) {
			evt.notes = options.fields.notes || undefined;
		}
		if (options.fields.duration !== undefined && options.fields.duration > 0) {
			evt.endTime = addMinutesToTime(evt.startTime, options.fields.duration);
		}
		if (options.fields.subtasks !== undefined) {
			evt.subtasks =
				options.fields.subtasks.length > 0
					? options.fields.subtasks.map((st, i) => ({
							id: crypto.randomUUID
								? crypto.randomUUID()
								: `st-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
							title: st,
							completed: false
					  }))
					: undefined;
		}
	}

	await db.scheduledEvents.bulkPut(targetEvents);
	return targetEvents.length;
}

/**
 * Propagates changes made on a DayTemplate to scheduled events that were created from it.
 */
export async function propagateDayTemplateChanges(
	templateId: string,
	updatedTemplate: DayTemplate
): Promise<number> {
	const allEvents = await db.scheduledEvents.toArray();
	const targetEvents = allEvents.filter((e) => e.sourceTemplateId === templateId);
	if (targetEvents.length === 0) return 0;

	const allActivities = await db.activityTemplates.toArray();
	const actMap = new Map(allActivities.map((a) => [a.id, a]));

	// Group events by date
	const eventsByDate = new Map<string, ScheduledEvent[]>();
	for (const e of targetEvents) {
		const list = eventsByDate.get(e.date) || [];
		list.push(e);
		eventsByDate.set(e.date, list);
	}

	const updatedEvents: ScheduledEvent[] = [];
	for (const [, dateEvts] of eventsByDate.entries()) {
		dateEvts.sort((a, b) => a.startTime.localeCompare(b.startTime));
		for (let i = 0; i < dateEvts.length && i < updatedTemplate.blocks.length; i++) {
			const evt = dateEvts[i];
			const tplBlock = updatedTemplate.blocks[i];
			const act = actMap.get(tplBlock.activityId);
			if (act) {
				evt.title = tplBlock.customTitle || act.title;
				evt.category = act.category;
				evt.color = act.color;
				evt.notes = act.notes;
				updatedEvents.push(evt);
			}
		}
	}

	if (updatedEvents.length > 0) {
		await db.scheduledEvents.bulkPut(updatedEvents);
	}
	return updatedEvents.length;
}
