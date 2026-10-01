import { db } from './index';
import { getMondayOfCurrentWeek } from './index';
import type { ActivityTemplate, DayTemplate, ScheduledEvent, SpecialEvent } from '$lib/types';

export const DEMO_ACTIVITIES: ActivityTemplate[] = [
	{
		id: 'act-deep-work',
		title: 'Deep Work: Core Architecture',
		category: 'work',
		defaultDuration: 120,
		color: '#3b82f6', // blue-500
		notes: 'Bloque de alta concentración sin notificaciones ni llamadas',
		subtasks: ['Revisar PRs prioritarias', 'Diseñar módulo de caché', 'Testear cobertura']
	},
	{
		id: 'act-standup',
		title: 'Daily Standup & Sincronización',
		category: 'work',
		defaultDuration: 30,
		color: '#0ea5e9', // sky-500
		notes: 'Actualización rápida con el equipo distribuido'
	},
	{
		id: 'act-dev-sprint',
		title: 'Sprint Development & Code Review',
		category: 'work',
		defaultDuration: 90,
		color: '#2563eb', // blue-600
		notes: 'Implementación de funcionalidades y revisión de pares'
	},
	{
		id: 'act-study-morning',
		title: 'Estudio: System Design & AI',
		category: 'study',
		defaultDuration: 60,
		color: '#f59e0b', // amber-500
		notes: 'Lectura técnica y ejercicios de arquitectura distribuida',
		subtasks: ['Leer 1 capítulo de Designing Data-Intensive Apps', 'Resumen en notas']
	},
	{
		id: 'act-study-language',
		title: 'Práctica de Idiomas (Inglés/Alemán)',
		category: 'study',
		defaultDuration: 30,
		color: '#eab308', // yellow-500
		notes: 'Vocabulario técnico y listening podcast'
	},
	{
		id: 'act-calisthenics',
		title: 'Entrenamiento: Fuerza & Calistenia',
		category: 'sport',
		defaultDuration: 60,
		color: '#10b981', // emerald-500
		notes: 'Rutina de fuerza funcional en casa / gimnasio',
		subtasks: ['Calentamiento articular (10m)', 'Dominadas y fondos', 'Estiramiento final']
	},
	{
		id: 'act-running',
		title: 'Cardio & Running al aire libre',
		category: 'sport',
		defaultDuration: 45,
		color: '#059669', // emerald-600
		notes: 'Carrera continua 6km zona 2'
	},
	{
		id: 'act-family-dinner',
		title: 'Cena Familiar & Cocina',
		category: 'social',
		defaultDuration: 60,
		color: '#f43f5e', // rose-500
		notes: 'Desconexión total, cocinar cena saludable y compartir'
	},
	{
		id: 'act-hobby-gaming',
		title: 'Gaming & Pasatiempos Creativos',
		category: 'hobby',
		defaultDuration: 75,
		color: '#8b5cf6', // violet-500
		notes: 'Tiempo lúdico o desarrollo de proyectos personales'
	},
	{
		id: 'act-rest-reading',
		title: 'Lectura Nocturna & Wind-Down',
		category: 'rest',
		defaultDuration: 45,
		color: '#14b8a6', // teal-500
		notes: 'Cero pantallas, luz cálida y relajación antes de dormir'
	}
];

export const DEMO_DAY_TEMPLATES: DayTemplate[] = [
	{
		id: 'tpl-remote-focus',
		name: 'Día Enfoque Remoto (Deep Work)',
		description: 'Día optimizado para programación de alto impacto, estudio matutino y deporte vespertino.',
		blocks: [
			{ activityId: 'act-study-morning', startTime: '07:00', duration: 60 },
			{ activityId: 'act-standup', startTime: '08:30', duration: 30 },
			{ activityId: 'act-deep-work', startTime: '09:30', duration: 120 },
			{ activityId: 'act-dev-sprint', startTime: '14:00', duration: 90 },
			{ activityId: 'act-calisthenics', startTime: '18:00', duration: 60 },
			{ activityId: 'act-family-dinner', startTime: '20:00', duration: 60 },
			{ activityId: 'act-rest-reading', startTime: '22:00', duration: 45 }
		]
	},
	{
		id: 'tpl-balance-comms',
		name: 'Día Colaborativo & Deporte',
		description: 'Ideal para reuniones de equipo, tareas operativas, cardio matutino y vida social.',
		blocks: [
			{ activityId: 'act-running', startTime: '07:30', duration: 45 },
			{ activityId: 'act-standup', startTime: '09:00', duration: 45, customTitle: 'Reunión Semanal y Sync' },
			{ activityId: 'act-dev-sprint', startTime: '10:30', duration: 90 },
			{ activityId: 'act-study-language', startTime: '16:00', duration: 45 },
			{ activityId: 'act-hobby-gaming', startTime: '18:30', duration: 90 },
			{ activityId: 'act-family-dinner', startTime: '20:30', duration: 60 }
		]
	},
	{
		id: 'tpl-weekend-recharge',
		name: 'Fin de Semana / Desconexión Total',
		description: 'Recarga mental, naturaleza, hobbies creativos y tiempo libre sin horarios estrictos.',
		blocks: [
			{ activityId: 'act-running', startTime: '09:00', duration: 60, customTitle: 'Paseo / Trote al Aire Libre' },
			{ activityId: 'act-hobby-gaming', startTime: '15:00', duration: 120, customTitle: 'Hobbies & Proyectos Personales' },
			{ activityId: 'act-family-dinner', startTime: '19:30', duration: 120, customTitle: 'Cena con Amigos / Familia' }
		]
	}
];

export const DEMO_SPECIAL_EVENTS: SpecialEvent[] = [
	{
		id: 'sp-1',
		date: '10-15', // Recurring MM-DD
		title: 'Cumpleaños Mamá 🎉',
		type: 'birthday',
		notifyBeforeDays: 3,
		notes: 'Comprar regalo y reservar restaurante'
	},
	{
		id: 'sp-2',
		date: '11-04',
		title: 'Aniversario Contrato Remoto 🚀',
		type: 'anniversary',
		notifyBeforeDays: 7,
		notes: 'Revisión anual de objetivos y compensación'
	},
	{
		id: 'sp-3',
		date: '12-25',
		title: 'Navidad 🎄',
		type: 'holiday',
		notifyBeforeDays: 5
	},
	{
		id: 'sp-4',
		date: '10-01',
		title: 'Renovación Dominio & Servidores 💻',
		type: 'reminder',
		notifyBeforeDays: 2,
		notes: 'Verificar facturación automática'
	}
];

function addMinutesToTime(timeStr: string, minutes: number): string {
	const [h, m] = timeStr.split(':').map(Number);
	const totalMin = h * 60 + m + minutes;
	const hours = Math.floor(totalMin / 60) % 24;
	const mins = totalMin % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function getISODate(date: Date, dayOffset = 0): string {
	const d = new Date(date);
	d.setDate(d.getDate() + dayOffset);
	return d.toISOString().split('T')[0];
}

export function generateDemoScheduledEvents(): ScheduledEvent[] {
	const monday = getMondayOfCurrentWeek();
	const events: ScheduledEvent[] = [];

	const daysConfig: { offset: number; templateId: string }[] = [
		{ offset: 0, templateId: 'tpl-remote-focus' },
		{ offset: 1, templateId: 'tpl-balance-comms' },
		{ offset: 2, templateId: 'tpl-remote-focus' },
		{ offset: 3, templateId: 'tpl-balance-comms' },
		{ offset: 4, templateId: 'tpl-remote-focus' },
		{ offset: 5, templateId: 'tpl-weekend-recharge' },
		{ offset: 6, templateId: 'tpl-weekend-recharge' }
	];

	const activityMap = new Map(DEMO_ACTIVITIES.map((a) => [a.id, a]));
	const templateMap = new Map(DEMO_DAY_TEMPLATES.map((t) => [t.id, t]));

	daysConfig.forEach(({ offset, templateId }) => {
		const dateStr = getISODate(monday, offset);
		const template = templateMap.get(templateId);
		if (!template) return;

		template.blocks.forEach((block, idx) => {
			const act = activityMap.get(block.activityId);
			if (!act) return;

			const endTime = addMinutesToTime(block.startTime, block.duration);
			const isPastDay = offset < 2;

			events.push({
				id: `event-${dateStr}-${idx}-${block.activityId}`,
				date: dateStr,
				startTime: block.startTime,
				endTime,
				title: block.customTitle || act.title,
				category: act.category,
				completed: isPastDay && idx < 3,
				sourceTemplateId: template.id,
				color: act.color,
				notes: act.notes,
				subtasks: act.subtasks
					? act.subtasks.map((st, sIdx) => ({
							id: `sub-${sIdx}`,
							title: st,
							completed: isPastDay
						}))
					: undefined
			});
		});
	});

	return events;
}

/**
 * Seeds initial demo data for local development testing.
 */
export async function seedDemoData(force = false): Promise<void> {
	const count = await db.activityTemplates.count();
	if (count > 0 && !force) {
		return;
	}

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
			if (force) {
				await db.activityTemplates.clear();
				await db.dayTemplates.clear();
				await db.scheduledEvents.clear();
				await db.specialEvents.clear();
			}

			await db.activityTemplates.bulkAdd(DEMO_ACTIVITIES);
			await db.dayTemplates.bulkAdd(DEMO_DAY_TEMPLATES);
			await db.specialEvents.bulkAdd(DEMO_SPECIAL_EVENTS);

			const demoEvents = generateDemoScheduledEvents();
			await db.scheduledEvents.bulkAdd(demoEvents);

			await db.settings.put({ key: 'hasDemoData', value: true });
			await db.settings.put({ key: 'lastSeeded', value: new Date().toISOString() });
		}
	);
}
