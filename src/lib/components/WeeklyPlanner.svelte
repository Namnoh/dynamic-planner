<script lang="ts">
	import { onMount } from 'svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import {
		db,
		getMondayOfCurrentWeek,
		applyDayTemplateToDate,
		applyDayTemplateWithRecurrence,
		applyRecurringTemplatesToWeek,
		deleteRecurringEvents,
		updateRecurringEvents,
		clearAllData,
		propagateEventChanges
	} from '$lib/db';
	import { settingsStore, type BlockColorStyle } from '$lib/stores/settings';
	import { readOnlyStore } from '$lib/stores/readOnly';
	import {
		type ScheduledEvent,
		type DayTemplate,
		type ActivityTemplate,
		type RecurrenceConfig,
		sortDayTemplates,
		getRecurrenceLabel
	} from '$lib/types';
	import ExportModal from './ExportModal.svelte';
	import EventCard from './EventCard.svelte';
	import AddEventModal from './AddEventModal.svelte';
	import EditEventModal from './EditEventModal.svelte';
	import DataTransferModal from './DataTransferModal.svelte';
	import ReadOnlyFloatingPill from './ReadOnlyFloatingPill.svelte';
	import WeekPickerCalendar from './WeekPickerCalendar.svelte';
	import SearchableSelect from './SearchableSelect.svelte';
	import { toastStore, sendPlannerNotification } from '$lib/utils/notifications';
	import {
		ChevronLeft,
		ChevronRight,
		ChevronDown,
		Calendar,
		Camera,
		Sparkles,
		Trash2,
		Plus,
		QrCode,
		Layers,
		Repeat,
		Zap
	} from 'lucide-svelte';

	// Component State
	let currentMonday = $state<Date>(getMondayOfCurrentWeek());
	let events = $state<ScheduledEvent[]>([]);
	let dayTemplates = $state<DayTemplate[]>([]);
	let activityTemplates = $state<ActivityTemplate[]>([]);
	let isExportModalOpen = $state(false);
	let isTransferModalOpen = $state(false);
	let isWeekPickerOpen = $state(false);
	let boardElement = $state<HTMLElement | null>(null);
	let blockColorStyle = $state<BlockColorStyle>(settingsStore.current);
	let isReadOnly = $state(readOnlyStore.current);

	$effect(() => {
		const unsubscribe = settingsStore.subscribe((val) => {
			blockColorStyle = val;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = readOnlyStore.subscribe((val) => {
			isReadOnly = val;
		});
		return unsubscribe;
	});

	// Quick Add Modal State
	let isAddModalOpen = $state(false);
	let targetDateForNewEvent = $state('');
	let initialStartTimeForNewEvent = $state('09:00');

	// Edit Modal State
	let isEditModalOpen = $state(false);
	let selectedEventForEdit = $state<ScheduledEvent | null>(null);

	function openAddModal(dateStr: string, suggestedStartTime = '09:00') {
		targetDateForNewEvent = dateStr;
		initialStartTimeForNewEvent = suggestedStartTime;
		isAddModalOpen = true;
	}

	function openEditModal(event: ScheduledEvent) {
		selectedEventForEdit = event;
		isEditModalOpen = true;
	}

	async function handleUpdateEvent(
		updatedEvent: ScheduledEvent,
		propagationOptions?: {
			propagate: boolean;
			scope: 'same_title' | 'all';
			fields: {
				color: boolean;
				category: boolean;
				notes: boolean;
				subtasks: boolean;
			};
			updateBaseTemplate?: boolean;
		},
		recurrenceOptions?: {
			updateAllSeries?: boolean;
			newRecurringDates?: string[];
			newRecurrenceRule?: RecurrenceConfig;
		}
	) {
		await db.scheduledEvents.update(updatedEvent.id, {
			title: updatedEvent.title,
			date: updatedEvent.date,
			startTime: updatedEvent.startTime,
			endTime: updatedEvent.endTime,
			category: updatedEvent.category,
			color: updatedEvent.color,
			notes: updatedEvent.notes,
			subtasks: updatedEvent.subtasks ? $state.snapshot(updatedEvent.subtasks) : undefined,
			completed: updatedEvent.completed
		});

		if (recurrenceOptions?.updateAllSeries && updatedEvent.recurrenceId) {
			const count = await updateRecurringEvents(updatedEvent.recurrenceId, {
				title: updatedEvent.title,
				startTime: updatedEvent.startTime,
				endTime: updatedEvent.endTime,
				category: updatedEvent.category,
				color: updatedEvent.color,
				notes: updatedEvent.notes,
				subtasks: updatedEvent.subtasks
			});
			toastStore.show({
				title: 'Serie recurrente actualizada',
				message: `Se actualizaron ${count} bloques de la serie.`,
				type: 'success'
			});
		} else if (
			recurrenceOptions?.newRecurringDates &&
			recurrenceOptions.newRecurringDates.length > 1
		) {
			const recurrenceId = crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`;
			const otherDates = recurrenceOptions.newRecurringDates.filter(
				(d) => d !== updatedEvent.date
			);
			await db.scheduledEvents.update(updatedEvent.id, {
				recurrenceId,
				recurrenceRule: recurrenceOptions.newRecurrenceRule
			});
			const newEvents: ScheduledEvent[] = otherDates.map((d) => ({
				...$state.snapshot(updatedEvent),
				id: crypto.randomUUID
					? crypto.randomUUID()
					: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				date: d,
				recurrenceId,
				recurrenceRule: recurrenceOptions.newRecurrenceRule
			}));
			await db.scheduledEvents.bulkAdd(newEvents);
			toastStore.show({
				title: 'Serie recurrente creada',
				message: `Se añadieron ${newEvents.length} bloques adicionales.`,
				type: 'success'
			});
		} else if (propagationOptions?.propagate) {
			const { updatedCount, templateUpdated } = await propagateEventChanges({
				sourceEventId: updatedEvent.id,
				scope: propagationOptions.scope,
				title: updatedEvent.title,
				sourceTemplateId: updatedEvent.sourceTemplateId,
				fields: {
					color: propagationOptions.fields.color ? updatedEvent.color : undefined,
					category: propagationOptions.fields.category ? updatedEvent.category : undefined,
					notes: propagationOptions.fields.notes ? updatedEvent.notes : undefined,
					subtasks: propagationOptions.fields.subtasks ? updatedEvent.subtasks : undefined
				},
				updateBaseTemplate: propagationOptions.updateBaseTemplate
			});

			let msg = 'Bloque actualizado';
			if (updatedCount > 0) {
				msg += ` y propagado a ${updatedCount} ${updatedCount === 1 ? 'bloque adicional' : 'bloques adicionales'}.`;
			} else {
				msg += '.';
			}
			if (templateUpdated) {
				msg += ' Plantilla base actualizada.';
			}

			toastStore.show({
				title: 'Cambios guardados',
				message: msg,
				type: 'success'
			});
		} else {
			toastStore.show({
				title: 'Bloque actualizado',
				message: 'Los cambios se han guardado con éxito.',
				type: 'success'
			});
		}

		refreshData();
	}

	// Apply Template State
	let selectedTemplateId = $state<string>('');
	let applyTargetOption = $state<string>('0');
	let applyWeeksCount = $state<number>(1);
	let isApplyingRecurringAuto = $state(false);

	const selectedTemplate = $derived(dayTemplates.find((t) => t.id === selectedTemplateId));

	const recurringTemplates = $derived.by(() => {
		return dayTemplates.filter((t) => t.recurrence && t.recurrence.frequency !== 'none');
	});

	// 7 days calculation derived from currentMonday
	const weekDays = $derived.by(() => {
		const days: { date: Date; dateStr: string; dayName: string; dayNumber: number; isToday: boolean }[] = [];
		const todayStr = new Date().toISOString().split('T')[0];
		const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

		for (let i = 0; i < 7; i++) {
			const d = new Date(currentMonday);
			d.setDate(d.getDate() + i);
			const dateStr = d.toISOString().split('T')[0];
			days.push({
				date: d,
				dateStr,
				dayName: names[i],
				dayNumber: d.getDate(),
				isToday: dateStr === todayStr
			});
		}
		return days;
	});

	// Events grouped by day for DnD zones
	let dayColumns = $state<ScheduledEvent[][]>([[], [], [], [], [], [], []]);

	// Format week range label: e.g. "28 Sep - 04 Oct 2026"
	const weekRangeLabel = $derived.by(() => {
		if (weekDays.length === 0) return '';
		const start = weekDays[0].date;
		const end = weekDays[6].date;
		const startStr = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
		const endStr = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
		return `${startStr} — ${endStr}`;
	});

	// Select options for applying day template
	const templateOptions = $derived.by(() => {
		const sorted = sortDayTemplates(dayTemplates, 'name_asc');
		return [
			{ value: '', label: 'Seleccionar plantilla...' },
			...sorted.map((tpl) => ({
				value: tpl.id,
				label:
					tpl.recurrence && tpl.recurrence.frequency !== 'none'
						? `${tpl.name} [${getRecurrenceLabel(tpl.recurrence)}]`
						: tpl.name,
				sublabel: `${tpl.blocks.length} bloque${tpl.blocks.length === 1 ? '' : 's'}${tpl.recurrence && tpl.recurrence.frequency !== 'none' ? ` • ${getRecurrenceLabel(tpl.recurrence)}` : ''}`
			}))
		];
	});

	const targetDestinationOptions = $derived.by(() => {
		const opts: { value: string; label: string; sublabel?: string }[] = [];

		if (selectedTemplate?.recurrence && selectedTemplate.recurrence.frequency !== 'none') {
			opts.push({
				value: 'template_rule',
				label: `🔁 Según plantilla (${getRecurrenceLabel(selectedTemplate.recurrence)})`,
				sublabel: 'Aplica a los días configurados en su regla'
			});
		}

		opts.push(
			{ value: 'weekdays', label: '🔁 Lunes a Viernes (Laborables)' },
			{ value: 'weekends', label: '🔁 Sábado y Domingo (Fin de semana)' },
			{ value: 'all_week', label: '🔁 Toda la semana (7 días)' }
		);

		for (let i = 0; i < 7; i++) {
			const d = weekDays[i];
			opts.push({
				value: String(i),
				label: `${d.dayName} (${d.dayNumber})`
			});
		}

		return opts;
	});

	const isMultiDayApply = $derived(
		['template_rule', 'weekdays', 'weekends', 'all_week'].includes(applyTargetOption)
	);

	// Load DB data
	async function refreshData() {
		const allEvents = await db.scheduledEvents.toArray();
		events = allEvents;
		dayTemplates = await db.dayTemplates.toArray();
		activityTemplates = await db.activityTemplates.toArray();
		rebuildDayColumns();
	}

	function rebuildDayColumns() {
		const cols: ScheduledEvent[][] = [];
		for (let i = 0; i < 7; i++) {
			const dateStr = weekDays[i].dateStr;
			const dayEvts = events
				.filter((e) => e.date === dateStr)
				.sort((a, b) => a.startTime.localeCompare(b.startTime));
			cols.push(dayEvts);
		}
		dayColumns = cols;
	}

	onMount(() => {
		refreshData();

		const handleOpenTransfer = () => {
			isTransferModalOpen = true;
		};
		window.addEventListener('open-data-transfer', handleOpenTransfer);
		return () => {
			window.removeEventListener('open-data-transfer', handleOpenTransfer);
		};
	});

	const isCurrentWeek = $derived.by(() => {
		const todayMonday = getMondayOfCurrentWeek();
		return (
			currentMonday.getFullYear() === todayMonday.getFullYear() &&
			currentMonday.getMonth() === todayMonday.getMonth() &&
			currentMonday.getDate() === todayMonday.getDate()
		);
	});

	// Navigation handlers
	function prevWeek() {
		const next = new Date(currentMonday);
		next.setDate(next.getDate() - 7);
		currentMonday = next;
		isWeekPickerOpen = false;
		setTimeout(rebuildDayColumns, 0);
	}

	function nextWeek() {
		const next = new Date(currentMonday);
		next.setDate(next.getDate() + 7);
		currentMonday = next;
		isWeekPickerOpen = false;
		setTimeout(rebuildDayColumns, 0);
	}

	function goToCurrentWeek() {
		currentMonday = getMondayOfCurrentWeek();
		isWeekPickerOpen = false;
		setTimeout(rebuildDayColumns, 0);
	}

	function handleSelectWeek(monday: Date) {
		currentMonday = monday;
		isWeekPickerOpen = false;
		setTimeout(rebuildDayColumns, 0);
	}

	// DnD Handlers for each day column
	function handleDndConsider(dayIndex: number, e: CustomEvent<DndEvent<ScheduledEvent>>) {
		dayColumns[dayIndex] = e.detail.items;
	}

	async function handleDndFinalize(dayIndex: number, e: CustomEvent<DndEvent<ScheduledEvent>>) {
		const targetDate = weekDays[dayIndex].dateStr;
		const updatedItems = e.detail.items;

		// Update items in memory for instant feedback
		dayColumns[dayIndex] = updatedItems;

		// Persist changes in Dexie: update date for any item moved to this column
		for (const item of updatedItems) {
			if (item.date !== targetDate) {
				item.date = targetDate;
				await db.scheduledEvents.update(item.id, { date: targetDate });
			}
		}

		refreshData();
	}

	// Toggle completed state
	async function toggleCompleted(event: ScheduledEvent) {
		const nextState = !event.completed;
		await db.scheduledEvents.update(event.id, { completed: nextState });
		event.completed = nextState;

		if (nextState) {
			sendPlannerNotification('¡Bloque completado! 🎯', {
				body: `Has finalizado "${event.title}". ¡Buen trabajo!`,
				type: 'success'
			});
		}
	}

	// Delete event
	async function deleteEvent(id: string) {
		await db.scheduledEvents.delete(id);
		toastStore.show({
			title: 'Bloque eliminado',
			type: 'info'
		});
		refreshData();
	}

	async function deleteEventSeries(recurrenceId: string) {
		const count = await deleteRecurringEvents(recurrenceId);
		toastStore.show({
			title: 'Serie recurrente eliminada',
			message: `Se eliminaron ${count} bloques de la serie.`,
			type: 'info'
		});
		refreshData();
	}

	// Apply Day Template (Single day or recurring range)
	async function handleApplyTemplate() {
		if (!selectedTemplateId) return;
		const tpl = selectedTemplate;
		if (!tpl) return;

		try {
			let daysApplied = 0;
			let totalBlocks = 0;

			if (
				applyTargetOption === 'template_rule' &&
				tpl.recurrence &&
				tpl.recurrence.frequency !== 'none'
			) {
				const res = await applyDayTemplateWithRecurrence(
					tpl.id,
					currentMonday,
					tpl.recurrence,
					applyWeeksCount
				);
				daysApplied = res.daysCount;
				totalBlocks = res.blocksCount;
			} else if (applyTargetOption === 'weekdays') {
				const res = await applyDayTemplateWithRecurrence(
					tpl.id,
					currentMonday,
					{ frequency: 'weekdays' },
					applyWeeksCount
				);
				daysApplied = res.daysCount;
				totalBlocks = res.blocksCount;
			} else if (applyTargetOption === 'weekends') {
				const res = await applyDayTemplateWithRecurrence(
					tpl.id,
					currentMonday,
					{ frequency: 'weekends' },
					applyWeeksCount
				);
				daysApplied = res.daysCount;
				totalBlocks = res.blocksCount;
			} else if (applyTargetOption === 'all_week') {
				const res = await applyDayTemplateWithRecurrence(
					tpl.id,
					currentMonday,
					{ frequency: 'daily' },
					applyWeeksCount
				);
				daysApplied = res.daysCount;
				totalBlocks = res.blocksCount;
			} else {
				const dayIndex = Number(applyTargetOption) || 0;
				const targetDate = weekDays[dayIndex].dateStr;
				totalBlocks = await applyDayTemplateToDate(tpl.id, targetDate);
				daysApplied = 1;
			}

			toastStore.show({
				title: 'Plantilla aplicada con éxito',
				message: `Se añadieron ${totalBlocks} bloques a ${daysApplied} ${daysApplied === 1 ? 'día' : 'días'}.`,
				type: 'success'
			});
			refreshData();
		} catch (err: any) {
			toastStore.show({
				title: 'Error al aplicar plantilla',
				message: err.message,
				type: 'error'
			});
		}
	}

	async function handleAutoApplyRecurringTemplates() {
		if (recurringTemplates.length === 0) {
			toastStore.show({
				title: 'Sin plantillas recurrentes',
				message:
					'Puedes configurar qué días se repite cada plantilla (ej. Lun-Vie) desde la sección de Plantillas.',
				type: 'info'
			});
			return;
		}

		const summary = recurringTemplates
			.map((t) => `• ${t.name}: ${getRecurrenceLabel(t.recurrence)}`)
			.join('\n');
		const confirmed = confirm(
			`Se aplicarán las siguientes plantillas recurrentes a los días correspondientes de esta semana:\n\n${summary}\n\n¿Deseas generar los bloques en la semana activa?`
		);

		if (!confirmed) return;

		isApplyingRecurringAuto = true;
		try {
			const res = await applyRecurringTemplatesToWeek(currentMonday);
			if (res.totalBlocks > 0) {
				toastStore.show({
					title: '¡Semana planificada! ⚡',
					message: `Se aplicaron ${res.appliedTemplates} plantillas (${res.totalBlocks} bloques en ${res.matchedDays} días).`,
					type: 'success'
				});
			} else {
				toastStore.show({
					title: 'Sin coincidencias en esta semana',
					message: 'Ninguna de tus reglas de plantilla coincide con los días de la semana activa.',
					type: 'info'
				});
			}
			refreshData();
		} catch (err: any) {
			toastStore.show({
				title: 'Error al auto-aplicar plantillas',
				message: err.message,
				type: 'error'
			});
		} finally {
			isApplyingRecurringAuto = false;
		}
	}

	// Add custom event (single or recurring series)
	async function handleCreateEvent(
		eventData: Omit<ScheduledEvent, 'id'>,
		recurringDates?: string[]
	) {
		if (recurringDates && recurringDates.length > 1) {
			const recurrenceId = crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`;
			const eventsToCreate: ScheduledEvent[] = recurringDates.map((dateStr) => ({
				id: crypto.randomUUID
					? crypto.randomUUID()
					: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				...$state.snapshot(eventData),
				date: dateStr,
				recurrenceId
			}));
			await db.scheduledEvents.bulkAdd(eventsToCreate);
			toastStore.show({
				title: 'Serie recurrente creada',
				message: `Se crearon ${eventsToCreate.length} bloques para "${eventData.title}".`,
				type: 'success'
			});
		} else {
			const id = crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}`;
			const newEvt: ScheduledEvent = {
				id,
				...$state.snapshot(eventData)
			};
			await db.scheduledEvents.add($state.snapshot(newEvt));
			toastStore.show({
				title: 'Bloque programado',
				message: `"${newEvt.title}" añadido con éxito.`,
				type: 'success'
			});
		}
		refreshData();
	}

	// Demo and reset handlers
	async function handleSeedDemo() {
		const { seedDemoData } = await import('$lib/db/demoData');
		await seedDemoData(true);
		currentMonday = getMondayOfCurrentWeek();
		toastStore.show({
			title: 'Datos de Ejemplo Cargados',
			message: 'Rutina de desarrollo cargada localmente con éxito.',
			type: 'success'
		});
		refreshData();
	}

	async function handleClearAll() {
		if (confirm('¿Estás seguro de que deseas limpiar toda la planificación y empezar en blanco?')) {
			await clearAllData();
			toastStore.show({
				title: 'Lienzo en blanco',
				message: 'Se han eliminado todos los bloques y eventos.',
				type: 'info'
			});
			refreshData();
		}
	}


</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Top Control Bar -->
	<header class="flex flex-col md:flex-row items-center justify-between gap-1">
		<!-- Left: Export, Demo and Data Controls -->
		<div class="relative z-30 mt-auto flex w-full items-center justify-center md:h-30 lg:h-20 md:w-fit rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-md dark:shadow-xl transition-colors">
			<div class="flex justify-around gap-2 flex-nowrap md:flex-wrap lg:flex-nowrap">
				<button
					type="button"
					onclick={() => (isExportModalOpen = true)}
					class="text-nowrap flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
					title="Exportar horario en PNG, JPEG o WebP"
				>
					<Camera class="h-3.5 w-3.5" />
					<span>Exportar Horario</span>
				</button>

				{#if recurringTemplates.length > 0}
					<button
						type="button"
						onclick={handleAutoApplyRecurringTemplates}
						disabled={isReadOnly || isApplyingRecurringAuto}
						class="text-nowrap flex items-center gap-1.5 rounded-xl bg-purple-50 dark:bg-purple-600/20 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-600/30 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
						title="Auto-rellenar semana con plantillas recurrentes ({recurringTemplates.length} configuradas)"
					>
						<Zap class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
						<span>Auto-rellenar ({recurringTemplates.length})</span>
					</button>
				{/if}

				{#if import.meta.env.DEV}
					<button
						type="button"
						onclick={handleSeedDemo}
						class="text-nowrap flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer"
						title="Cargar rutina de ejemplo (Solo disponible en desarrollo local)"
					>
						<Sparkles class="h-3.5 w-3.5" />
						<span class="hidden md:inline">Cargar Demo</span>
					</button>
				{/if}

				<button
					type="button"
					onclick={handleClearAll}
					disabled={isReadOnly}
					class="rounded-xl p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
					title="Limpiar todo (Lienzo en blanco)"
				>
					<Trash2 class="h-3.5 w-3.5 text-red-500" />
				</button>

				<!-- Transfer Data (QR & JSON Backup) -->
				<button
					type="button"
					onclick={() => (isTransferModalOpen = true)}
					class="text-nowrap flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-500/40"
					title="Transferir o respaldar datos (Código QR o archivo JSON)"
				>
					<QrCode class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
					<span class="hidden sm:inline">Transferir</span>
				</button>
			</div>
		</div>


		<!-- Right: Week Navigation & Quick Apply Template -->
		<div class="relative z-30 w-full md:h-30 lg:h-20 flex flex-wrap lg:flex-nowrap items-center justify-around gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-md dark:shadow-xl transition-colors">
			<div class="relative flex items-center gap-2">
				<div class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60 shadow-inner">
					<button
						type="button"
						onclick={prevWeek}
						class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
						title="Semana anterior"
						aria-label="Semana anterior"
					>
						<ChevronLeft class="h-4 w-4" />
					</button>
	
					<!-- Middle button: now weekRangeLabel, triggers calendar picker -->
					<button
						type="button"
						onclick={() => (isWeekPickerOpen = !isWeekPickerOpen)}
						class="inline-flex items-center gap-2 px-3 py-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-lg transition-colors cursor-pointer"
						title="Abrir calendario para seleccionar semana"
						aria-label="Seleccionar semana: {weekRangeLabel}"
						aria-expanded={isWeekPickerOpen}
					>
						<Calendar class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span>{weekRangeLabel}</span>
						<ChevronDown class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 {isWeekPickerOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}" />
					</button>
	
					<button
						type="button"
						onclick={nextWeek}
						class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
						title="Semana siguiente"
						aria-label="Semana siguiente"
					>
						<ChevronRight class="h-4 w-4" />
					</button>
				</div>
	
				<!-- "Today" button placed to the right -->
				<!-- Kept hidden for now:
				<button
					type="button"
					onclick={goToCurrentWeek}
					class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer shadow-xs {isCurrentWeek
						? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/60'
						: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 dark:border-indigo-800 font-bold'}"
					title="Go to current week (Today)"
					aria-label="Go to current week (Today)"
				>
					Today
				</button> -->
	
				<!-- Calendar Week Picker Popover -->
				{#if isWeekPickerOpen}
					<WeekPickerCalendar
						{currentMonday}
						isOpen={isWeekPickerOpen}
						onSelectWeek={handleSelectWeek}
						onClose={() => (isWeekPickerOpen = false)}
					/>
				{/if}
			</div>
	
			<!-- Quick Apply Template -->
			<div class="flex justify-center items-center gap-2 flex-wrap md:flex-nowrap lg:flex-1 lg:min-w-0">
				<div class="flex items-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 lg:flex-1 lg:min-w-0 relative">
					<span
						class="flex shrink-0 items-center gap-1.5 border-r border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-nowrap text-xs text-slate-600 dark:text-slate-400"
					>
						<Layers class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
						<span class="hidden sm:inline">Plantilla:</span>
					</span>
					<SearchableSelect
						id="template-select"
						bind:value={selectedTemplateId}
						options={templateOptions}
						placeholder="Seleccionar plantilla..."
						searchPlaceholder="Buscar plantilla..."
						class="flex-1 min-w-0"
						buttonClass="border-0 shadow-none bg-transparent rounded-l-none text-xs py-1.5"
						disabled={isReadOnly}
					/>
				</div>
				<SearchableSelect
					bind:value={applyTargetOption}
					options={targetDestinationOptions}
					class="w-auto shrink-0"
					buttonClass="text-xs py-1.5 min-w-[140px]"
					searchPlaceholder="Buscar destino..."
					disabled={isReadOnly}
				/>
				{#if isMultiDayApply}
					<select
						bind:value={applyWeeksCount}
						class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs py-1.5 px-2 text-slate-800 dark:text-slate-200 cursor-pointer shrink-0 focus:outline-hidden"
						title="Número de semanas a rellenar con esta plantilla"
					>
						<option value={1}>1 sem</option>
						<option value={2}>2 sem</option>
						<option value={4}>4 sem</option>
					</select>
				{/if}
				<button
					type="button"
					onclick={handleApplyTemplate}
					disabled={!selectedTemplateId || isReadOnly}
					class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs shrink-0"
				>
					Aplicar
				</button>
			</div>
		</div>
	</header>

	<!-- Weekly Board (7 Day Columns with DnD) -->
	<div
		bind:this={boardElement}
		id="weekly-planner-board"
		class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5 w-full bg-slate-200/60 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-300/70 dark:border-slate-800/60 transition-colors"
	>
		{#each weekDays as day, dayIndex}
			<section
				class="flex flex-col min-h-42.5 md:min-h-115 rounded-2xl border transition-all duration-200 {day.isToday
					? 'border-indigo-500 bg-white dark:bg-slate-900/90 shadow-md ring-1 ring-indigo-500/30 dark:shadow-indigo-950/30 dark:ring-indigo-500/20'
					: 'border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 shadow-xs'}"
			>
				<!-- Day Header -->
				<div class="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800/80">
					<div class="flex items-center gap-2">
						<span
							class="flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold {day.isToday
								? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
								: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}"
						>
							{day.dayNumber}
						</span>
						<div>
							<h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
								{day.dayName}
							</h4>
							{#if day.isToday}
								<span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block -mt-0.5">HOY</span>
							{/if}
						</div>
					</div>

					{#if !isReadOnly}
						<button
							type="button"
							onclick={() => openAddModal(day.dateStr)}
							class="no-export rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
							title="Añadir bloque"
						>
							<Plus class="h-3.5 w-3.5" />
						</button>
					{/if}
				</div>

				<!-- Column Body Area -->
				<div class="relative flex-1 flex flex-col min-h-22.5 md:min-h-57.5">
					<!-- DnD Zone Column (Strictly contains only draggable items to avoid touch drag bugs) -->
					<div
						use:dndzone={{
							items: dayColumns[dayIndex] || [],
							flipDurationMs: 200,
							dragDisabled: isReadOnly,
							dropTargetStyle: {
								outline: '2px dashed rgba(99, 102, 241, 0.4)',
								borderRadius: '0.75rem',
								backgroundColor: 'rgba(99, 102, 241, 0.05)'
							}
						}}
						onconsider={(e) => handleDndConsider(dayIndex, e)}
						onfinalize={(e) => handleDndFinalize(dayIndex, e)}
						class="flex-1 flex flex-col gap-2 p-2.5 pt-3.5 overflow-y-auto z-10 min-h-20 md:min-h-50"
					>
						{#each dayColumns[dayIndex] || [] as item (item.id)}
							<EventCard
								event={item}
								{blockColorStyle}
								{isReadOnly}
								onEdit={openEditModal}
								onToggleComplete={toggleCompleted}
								onDelete={deleteEvent}
							/>
						{/each}
					</div>

					<!-- Visual Empty Placeholder (Sibling outside dndzone, pointer-events-none prevents touch capture) -->
					{#if (dayColumns[dayIndex] || []).length === 0}
						<div
							class="absolute inset-2.5 flex items-center justify-center text-center p-3 border border-dashed border-slate-300 dark:border-slate-800/80 rounded-xl text-slate-400 dark:text-slate-500 text-xs pointer-events-none select-none"
						>
							<span>Sin bloques</span>
						</div>
					{/if}
				</div>

				<!-- Quick Add Footer -->
				{#if !isReadOnly}
					<button
						type="button"
						onclick={() => {
							const dayEvts = dayColumns[dayIndex] || [];
							const lastEvt = dayEvts[dayEvts.length - 1];
							openAddModal(day.dateStr, lastEvt ? lastEvt.endTime : '09:00');
						}}
						class="no-export m-2 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800/80 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-all cursor-pointer"
					>
						<Plus class="h-3 w-3" />
						<span>Agregar</span>
					</button>
				{/if}
			</section>
		{/each}
	</div>
</div>

<!-- Modals -->
<AddEventModal
	bind:isOpen={isAddModalOpen}
	targetDate={targetDateForNewEvent}
	initialStartTime={initialStartTimeForNewEvent}
	{activityTemplates}
	onSave={handleCreateEvent}
/>

<EditEventModal
	bind:isOpen={isEditModalOpen}
	event={selectedEventForEdit}
	{weekDays}
	onSave={handleUpdateEvent}
	onDelete={deleteEvent}
	onDeleteSeries={deleteEventSeries}
/>

<!-- Graphic Export Modal -->
<ExportModal
	bind:isOpen={isExportModalOpen}
	targetElement={boardElement}
	defaultFilename={`dynamic-planner-${weekRangeLabel.replace(/[\s—]/g, '_')}`}
/>

<!-- Peer-to-Peer Data Transfer & Backup Modal -->
<DataTransferModal
	bind:isOpen={isTransferModalOpen}
	onDataImported={refreshData}
/>

<!-- Floating Pill for Read-Only / Lock Mode -->
<ReadOnlyFloatingPill />

