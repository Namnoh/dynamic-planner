import Dexie, { type Table } from 'dexie';
import {
	DEFAULT_CATEGORIES,
	type ActivityTemplate,
	type DayTemplate,
	type ScheduledEvent,
	type ScheduledEventSubtask,
	type SpecialEvent,
	type AppSetting,
	type CustomCategory
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
export async function applyDayTemplateToDate(templateId: string, targetDateStr: string): Promise<number> {
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
			}))
		});
	}

	await db.scheduledEvents.bulkAdd(newEvents);
	return newEvents.length;
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

/**
 * Exports all database tables to a structured JSON string.
 */
export async function exportDatabaseToJson(): Promise<string> {
	await ensureDefaultCategories();
	const [activities, dayTemplates, events, specialEvents, settings, categories] = await Promise.all([
		db.activityTemplates.toArray(),
		db.dayTemplates.toArray(),
		db.scheduledEvents.toArray(),
		db.specialEvents.toArray(),
		db.settings.toArray(),
		db.categories.toArray()
	]);

	const backup = {
		app: 'dynamic-planner',
		version: '1.0.0',
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

	return JSON.stringify(backup, null, 2);
}

/**
 * Imports a JSON backup string into IndexedDB.
 */
export async function importDatabaseFromJson(jsonContent: string): Promise<boolean> {
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
		}
	);

	return true;
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
