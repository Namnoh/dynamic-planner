<script lang="ts">
	import { onMount } from 'svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import {
		db,
		getMondayOfCurrentWeek,
		applyDayTemplateToDate,
		clearAllData,
		exportDatabaseToJson,
		importDatabaseFromJson
	} from '$lib/db';
	import { settingsStore, type BlockColorStyle } from '$lib/stores/settings';
	import type { ScheduledEvent, DayTemplate, ActivityTemplate } from '$lib/types';
	import ExportModal from './ExportModal.svelte';
	import EventCard from './EventCard.svelte';
	import AddEventModal from './AddEventModal.svelte';
	import EditEventModal from './EditEventModal.svelte';
	import { toastStore, sendPlannerNotification } from '$lib/utils/notifications';
	import {
		ChevronLeft,
		ChevronRight,
		Calendar,
		Camera,
		Sparkles,
		Trash2,
		Plus,
		FileDown,
		FileUp,
		Layers
	} from 'lucide-svelte';

	// Component State
	let currentMonday = $state<Date>(getMondayOfCurrentWeek());
	let events = $state<ScheduledEvent[]>([]);
	let dayTemplates = $state<DayTemplate[]>([]);
	let activityTemplates = $state<ActivityTemplate[]>([]);
	let isExportModalOpen = $state(false);
	let boardElement = $state<HTMLElement | null>(null);
	let blockColorStyle = $state<BlockColorStyle>(settingsStore.current);

	$effect(() => {
		const unsubscribe = settingsStore.subscribe((val) => {
			blockColorStyle = val;
		});
		return unsubscribe;
	});

	// Quick Add Modal State
	let isAddModalOpen = $state(false);
	let targetDateForNewEvent = $state('');

	// Edit Modal State
	let isEditModalOpen = $state(false);
	let selectedEventForEdit = $state<ScheduledEvent | null>(null);

	function openAddModal(dateStr: string) {
		targetDateForNewEvent = dateStr;
		isAddModalOpen = true;
	}

	function openEditModal(event: ScheduledEvent) {
		selectedEventForEdit = event;
		isEditModalOpen = true;
	}

	async function handleUpdateEvent(updatedEvent: ScheduledEvent) {
		await db.scheduledEvents.update(updatedEvent.id, {
			title: updatedEvent.title,
			date: updatedEvent.date,
			startTime: updatedEvent.startTime,
			endTime: updatedEvent.endTime,
			category: updatedEvent.category,
			color: updatedEvent.color,
			notes: updatedEvent.notes,
			completed: updatedEvent.completed
		});

		toastStore.show({
			title: 'Bloque actualizado',
			message: 'Los cambios se han guardado con éxito.',
			type: 'success'
		});
		refreshData();
	}

	// Apply Template Dropdown State
	let selectedTemplateId = $state<string>('');
	let targetDayOffset = $state<number>(0);

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
	});

	// Navigation handlers
	function prevWeek() {
		const next = new Date(currentMonday);
		next.setDate(next.getDate() - 7);
		currentMonday = next;
		setTimeout(rebuildDayColumns, 0);
	}

	function nextWeek() {
		const next = new Date(currentMonday);
		next.setDate(next.getDate() + 7);
		currentMonday = next;
		setTimeout(rebuildDayColumns, 0);
	}

	function goToCurrentWeek() {
		currentMonday = getMondayOfCurrentWeek();
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

	// Apply Day Template
	async function handleApplyTemplate() {
		if (!selectedTemplateId) return;
		const targetDate = weekDays[targetDayOffset].dateStr;
		try {
			const count = await applyDayTemplateToDate(selectedTemplateId, targetDate);
			toastStore.show({
				title: 'Plantilla aplicada con éxito',
				message: `Se añadieron ${count} bloques al ${weekDays[targetDayOffset].dayName}.`,
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

	// Add custom event
	async function handleCreateEvent(eventData: Omit<ScheduledEvent, 'id'>) {
		const id = crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}`;
		const newEvt: ScheduledEvent = {
			id,
			...eventData
		};

		await db.scheduledEvents.add(newEvt);
		toastStore.show({
			title: 'Bloque programado',
			message: `"${newEvt.title}" añadido con éxito.`,
			type: 'success'
		});
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

	// JSON Backup and restore
	async function handleExportJson() {
		const json = await exportDatabaseToJson();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dynamic-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toastStore.show({
			title: 'Copia de seguridad descargada',
			type: 'success'
		});
	}

	async function handleImportJson(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const text = await file.text();
		try {
			await importDatabaseFromJson(text);
			toastStore.show({
				title: 'Copia de seguridad restaurada',
				type: 'success'
			});
			refreshData();
		} catch (err: any) {
			toastStore.show({
				title: 'Error al restaurar',
				message: err.message,
				type: 'error'
			});
		}
		input.value = '';
	}
</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Top Control Bar -->
	<header
		class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-md dark:shadow-xl backdrop-blur-md transition-colors"
	>
		<!-- Left: Week Navigation -->
		<div class="flex items-center gap-2">
			<div class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60 shadow-inner">
				<button
					type="button"
					onclick={prevWeek}
					class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
					title="Semana anterior"
				>
					<ChevronLeft class="h-4 w-4" />
				</button>
				<button
					type="button"
					onclick={goToCurrentWeek}
					class="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer"
				>
					Hoy
				</button>
				<button
					type="button"
					onclick={nextWeek}
					class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
					title="Semana siguiente"
				>
					<ChevronRight class="h-4 w-4" />
				</button>
			</div>

			<div class="flex items-center gap-2 pl-2">
				<Calendar class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
				<span class="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
					{weekRangeLabel}
				</span>
			</div>
		</div>

		<!-- Center: Quick Apply Template -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
				<Layers class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
				<span class="hidden sm:inline">Plantilla:</span>
			</div>
			<select
				bind:value={selectedTemplateId}
				class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
			>
				<option value="">Seleccionar plantilla...</option>
				{#each dayTemplates as tpl}
					<option value={tpl.id}>{tpl.name}</option>
				{/each}
			</select>
			<select
				bind:value={targetDayOffset}
				class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
			>
				{#each weekDays as d, idx}
					<option value={idx}>{d.dayName} ({d.dayNumber})</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={handleApplyTemplate}
				disabled={!selectedTemplateId}
				class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-40 cursor-pointer shadow-xs"
			>
				Aplicar
			</button>
		</div>

		<!-- Right: Export, Demo and Data Controls -->
		<div class="flex items-center gap-2 flex-wrap">
			<button
				type="button"
				onclick={() => (isExportModalOpen = true)}
				class="flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs"
				title="Exportar horario en PNG, JPEG o WebP"
			>
				<Camera class="h-3.5 w-3.5" />
				<span>Exportar Horario</span>
			</button>

			{#if import.meta.env.DEV}
				<button
					type="button"
					onclick={handleSeedDemo}
					class="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer"
					title="Cargar rutina de ejemplo (Solo disponible en desarrollo local)"
				>
					<Sparkles class="h-3.5 w-3.5" />
					<span class="hidden md:inline">Cargar Demo</span>
				</button>
			{/if}

			<button
				type="button"
				onclick={handleClearAll}
				class="rounded-xl p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
				title="Limpiar todo (Lienzo en blanco)"
			>
				<Trash2 class="h-3.5 w-3.5" />
			</button>

			<!-- Backup JSON Menu -->
			<div class="flex items-center rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/60 p-0.5">
				<button
					type="button"
					onclick={handleExportJson}
					class="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
					title="Exportar respaldo JSON local"
				>
					<FileDown class="h-3.5 w-3.5" />
				</button>
				<label
					class="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
					title="Importar respaldo JSON"
				>
					<FileUp class="h-3.5 w-3.5" />
					<input type="file" accept=".json" onchange={handleImportJson} class="hidden" />
				</label>
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
				class="flex flex-col min-h-[460px] rounded-2xl border transition-all duration-200 {day.isToday
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

					<button
						type="button"
						onclick={() => openAddModal(day.dateStr)}
						class="no-export rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
						title="Añadir bloque"
					>
						<Plus class="h-3.5 w-3.5" />
					</button>
				</div>

				<!-- DnD Zone Column -->
				<div
					use:dndzone={{
						items: dayColumns[dayIndex] || [],
						flipDurationMs: 200,
						dropTargetStyle: {
							outline: '2px dashed rgba(99, 102, 241, 0.4)',
							borderRadius: '0.75rem',
							backgroundColor: 'rgba(99, 102, 241, 0.05)'
						}
					}}
					onconsider={(e) => handleDndConsider(dayIndex, e)}
					onfinalize={(e) => handleDndFinalize(dayIndex, e)}
					class="flex-1 flex flex-col gap-2 p-2.5 pt-3.5 overflow-y-auto"
				>
					{#each dayColumns[dayIndex] || [] as item (item.id)}
						<EventCard
							event={item}
							{blockColorStyle}
							onEdit={openEditModal}
							onToggleComplete={toggleCompleted}
							onDelete={deleteEvent}
						/>
					{/each}

					{#if (dayColumns[dayIndex] || []).length === 0}
						<div
							class="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 dark:border-slate-800/80 rounded-xl text-slate-400 dark:text-slate-500 text-xs gap-1.5"
						>
							<span>Sin bloques</span>
							<button
								type="button"
								onclick={() => openAddModal(day.dateStr)}
								class="no-export text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
							>
								+ Programar
							</button>
						</div>
					{/if}
				</div>

				<!-- Quick Add Footer -->
				<button
					type="button"
					onclick={() => openAddModal(day.dateStr)}
					class="no-export m-2 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800/80 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-all cursor-pointer"
				>
					<Plus class="h-3 w-3" />
					<span>Agregar</span>
				</button>
			</section>
		{/each}
	</div>
</div>

<!-- Modals -->
<AddEventModal
	bind:isOpen={isAddModalOpen}
	targetDate={targetDateForNewEvent}
	onSave={handleCreateEvent}
/>

<EditEventModal
	bind:isOpen={isEditModalOpen}
	event={selectedEventForEdit}
	{weekDays}
	onSave={handleUpdateEvent}
	onDelete={deleteEvent}
/>

<!-- Graphic Export Modal -->
<ExportModal
	bind:isOpen={isExportModalOpen}
	targetElement={boardElement}
	defaultFilename={`dynamic-planner-${weekRangeLabel.replace(/[\s—]/g, '_')}`}
/>
