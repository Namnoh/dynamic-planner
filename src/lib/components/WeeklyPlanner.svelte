<script lang="ts">
	import { onMount } from 'svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import {
		db,
		getMondayOfCurrentWeek,
		applyDayTemplateToDate,
		seedDemoData,
		clearAllData,
		exportDatabaseToJson,
		importDatabaseFromJson
	} from '$lib/db';
	import { settingsStore, type BlockColorStyle } from '$lib/stores/settings';
	import type { ScheduledEvent, DayTemplate, ActivityTemplate } from '$lib/types';
	import ExportModal from './ExportModal.svelte';
	import { toastStore, sendPlannerNotification } from '$lib/utils/notifications';
	import {
		ChevronLeft,
		ChevronRight,
		Calendar,
		Camera,
		Sparkles,
		Trash2,
		Plus,
		Check,
		Clock,
		FileDown,
		FileUp,
		Layers,
		Pencil,
		X
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

	function getBlockStyle(item: ScheduledEvent, styleMode: BlockColorStyle): string {
		const color = item.color || '#3b82f6';
		if (styleMode === 'full') {
			const tintPercent = item.completed ? '8%' : '14%';
			const borderPercent = item.completed ? '25%' : '35%';
			return `border-left: 3.5px solid ${color}; background-color: color-mix(in srgb, ${color} ${tintPercent}, var(--card-bg-base)); border-color: color-mix(in srgb, ${color} ${borderPercent}, transparent);`;
		}
		return `border-left: 3.5px solid ${color};`;
	}

	// Quick Add Modal / State
	let isAddModalOpen = $state(false);
	let targetDateForNewEvent = $state('');
	let newEventTitle = $state('');
	let newEventStartTime = $state('09:00');
	let newEventEndTime = $state('10:00');
	let newEventCategory = $state('work');
	let newEventColor = $state('#3b82f6');

	// Edit Modal / State
	let isEditModalOpen = $state(false);
	let editingEventId = $state<string | null>(null);
	let editEventDate = $state('');
	let editEventTitle = $state('');
	let editEventStartTime = $state('09:00');
	let editEventEndTime = $state('10:00');
	let editEventCategory = $state('work');
	let editEventColor = $state('#3b82f6');
	let editEventNotes = $state('');
	let editEventCompleted = $state(false);

	function openEditModal(event: ScheduledEvent) {
		editingEventId = event.id;
		editEventDate = event.date;
		editEventTitle = event.title;
		editEventStartTime = event.startTime;
		editEventEndTime = event.endTime;
		editEventCategory = event.category;
		editEventColor = event.color || '#3b82f6';
		editEventNotes = event.notes || '';
		editEventCompleted = event.completed;
		isEditModalOpen = true;
	}

	async function handleUpdateEvent() {
		if (!editingEventId || !editEventTitle.trim()) return;

		await db.scheduledEvents.update(editingEventId, {
			title: editEventTitle.trim(),
			date: editEventDate,
			startTime: editEventStartTime,
			endTime: editEventEndTime,
			category: editEventCategory,
			color: editEventColor,
			notes: editEventNotes.trim() || undefined,
			completed: editEventCompleted
		});

		isEditModalOpen = false;
		editingEventId = null;
		toastStore.show({
			title: 'Bloque actualizado',
			message: 'Los cambios se han guardado con éxito.',
			type: 'success'
		});
		refreshData();
	}

	async function handleDeleteFromEditModal() {
		if (!editingEventId) return;
		const idToDelete = editingEventId;
		isEditModalOpen = false;
		editingEventId = null;
		await deleteEvent(idToDelete);
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
				body: `Has finalizado "${event.title}". ¡Buen trabajo!`
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
	async function handleCreateEvent() {
		if (!newEventTitle.trim()) return;
		const id = crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}`;
		const newEvt: ScheduledEvent = {
			id,
			date: targetDateForNewEvent,
			startTime: newEventStartTime,
			endTime: newEventEndTime,
			title: newEventTitle.trim(),
			category: newEventCategory,
			completed: false,
			color: newEventColor
		};

		await db.scheduledEvents.add(newEvt);
		isAddModalOpen = false;
		newEventTitle = '';
		toastStore.show({
			title: 'Bloque programado',
			type: 'success'
		});
		refreshData();
	}

	function openAddModal(dateStr: string) {
		targetDateForNewEvent = dateStr;
		isAddModalOpen = true;
	}

	// Demo and reset handlers
	async function handleSeedDemo() {
		await seedDemoData(true);
		currentMonday = getMondayOfCurrentWeek();
		toastStore.show({
			title: 'Datos de Ejemplo Cargados',
			message: 'Rutina de profesional remoto cargada con éxito.',
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
	<!-- Control Bar Superior -->
	<header
		class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-md dark:shadow-xl backdrop-blur-md transition-colors"
	>
		<!-- Left: Navegación de Semana -->
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

		<!-- Center: Aplicar Plantilla Rápida -->
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

		<!-- Right: Botones de Exportación, Demo y Datos -->
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

			<button
				type="button"
				onclick={handleSeedDemo}
				class="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer"
				title="Cargar rutina de ejemplo para profesional remoto"
			>
				<Sparkles class="h-3.5 w-3.5" />
				<span class="hidden md:inline">Cargar Demo</span>
			</button>

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

	<!-- Board Semanal (7 Columnas de días con DnD) -->
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
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<article
							class="group relative flex flex-col gap-1 rounded-xl px-2.5 py-2 shadow-2xs transition-all duration-150 cursor-pointer {item.completed
								? 'opacity-65 border-dashed'
								: ''} {blockColorStyle === 'border'
								? (item.completed
									? 'border border-slate-200 dark:border-slate-800/90 bg-slate-100/70 dark:bg-slate-900/40'
									: 'border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs')
								: (item.completed
									? 'border'
									: 'border hover:shadow-xs hover:brightness-[1.02]')}"
							style={getBlockStyle(item, blockColorStyle)}
							onclick={() => openEditModal(item)}
						>
							<!-- Tab de Acciones Superior Flotante (Smooth Hover) -->
							<div
								class="no-export absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-800/95 px-1 py-0.5 shadow-md backdrop-blur-md transition-all duration-150 ease-out opacity-0 -translate-y-1 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto"
							>
								<!-- Botón Check / Completar -->
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); toggleCompleted(item); }}
									class="flex h-5 w-5 items-center justify-center rounded-md transition-all duration-150 cursor-pointer {item.completed
										? 'bg-emerald-500 text-white shadow-xs'
										: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400'}"
									title={item.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
									aria-label={item.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
								>
									<Check class="h-3 w-3 stroke-[2.5]" />
								</button>

								<!-- Divisor vertical sutil -->
								<div class="h-3 w-px bg-slate-200 dark:bg-slate-700/80 my-auto"></div>

								<!-- Botón Editar -->
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); openEditModal(item); }}
									class="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 transition-all duration-150 cursor-pointer"
									title="Editar bloque"
									aria-label="Editar bloque"
								>
									<Pencil class="h-3 w-3 stroke-[2]" />
								</button>

								<!-- Botón Eliminar -->
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); deleteEvent(item.id); }}
									class="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-all duration-150 cursor-pointer"
									title="Eliminar bloque"
									aria-label="Eliminar bloque"
								>
									<Trash2 class="h-3 w-3 stroke-[2]" />
								</button>
							</div>

							<!-- Fila 1: Horas (tipografía simple y limpia) y Categoría -->
							<div class="flex items-center justify-between gap-1 leading-none">
								<span class="inline-flex items-center gap-1 font-sans text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400 tracking-tight">
									{#if item.completed}
										<Check class="h-3 w-3 text-emerald-500 stroke-[2.5]" />
									{/if}
									<span>{item.startTime} – {item.endTime}</span>
								</span>

								<span
									class="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider {blockColorStyle === 'full'
										? 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200'
										: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-transparent'}"
								>
									{item.category}
								</span>
							</div>

							<!-- Fila 2: Título del Bloque -->
							<h5
								class="text-xs font-semibold leading-snug tracking-tight {item.completed
									? 'line-through text-slate-400 dark:text-slate-500'
									: 'text-slate-800 dark:text-slate-100'}"
							>
								{item.title}
							</h5>

							<!-- Fila 3: Subtareas o Notas (sólo si existen) -->
							{#if (item.subtasks && item.subtasks.length > 0) || item.notes}
								<div class="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
									{#if item.notes}
										<span class="truncate italic max-w-[130px]" title={item.notes}>
											{item.notes}
										</span>
									{/if}
									{#if item.subtasks && item.subtasks.length > 0}
										<span class="ml-auto font-sans tabular-nums text-[9.5px]">
											✓ {item.subtasks.filter((s) => s.completed).length}/{item.subtasks.length}
										</span>
									{/if}
								</div>
							{/if}
						</article>
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

<!-- Modal para Añadir Bloque -->
{#if isAddModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
		role="dialog"
	>
		<div
			class="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4"
		>
			<h4 class="font-bold text-base">Nuevo Bloque de Tiempo</h4>

			<div class="space-y-3 text-xs">
				<div>
					<label for="event-title-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Título del Bloque</label>
					<input
						id="event-title-input"
						type="text"
						bind:value={newEventTitle}
						placeholder="Ej: Deep Work, Gimnasio, Estudio..."
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="event-start-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Inicio</label>
						<input
							id="event-start-time"
							type="time"
							bind:value={newEventStartTime}
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
					<div>
						<label for="event-end-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Fin</label>
						<input
							id="event-end-time"
							type="time"
							bind:value={newEventEndTime}
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="event-category-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
						<select
							id="event-category-select"
							bind:value={newEventCategory}
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						>
							<option value="work">Trabajo (Work)</option>
							<option value="study">Estudio (Study)</option>
							<option value="sport">Deporte (Sport)</option>
							<option value="social">Social</option>
							<option value="hobby">Hobby / Creativo</option>
							<option value="rest">Descanso (Rest)</option>
						</select>
					</div>

					<div>
						<span class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Color</span>
						<div class="flex items-center gap-1.5 mt-1">
							{#each ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6'] as clr}
								<button
									type="button"
									onclick={() => (newEventColor = clr)}
									aria-label="Seleccionar color {clr}"
									class="h-6 w-6 rounded-full border-2 transition-transform cursor-pointer {newEventColor ===
									clr
										? 'border-indigo-600 dark:border-white scale-110 shadow-xs'
										: 'border-transparent opacity-80 hover:opacity-100'}"
									style="background-color: {clr};"
								></button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
				<button
					type="button"
					onclick={() => (isAddModalOpen = false)}
					class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleCreateEvent}
					class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md"
				>
					Guardar Bloque
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal para Editar Bloque Existente -->
{#if isEditModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4 transition-colors"
		>
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2">
					<div class="rounded-lg bg-indigo-50 dark:bg-indigo-600/20 p-1.5 text-indigo-600 dark:text-indigo-400">
						<Pencil class="h-4 w-4" />
					</div>
					<h4 class="font-bold text-base">Editar Bloque de Tiempo</h4>
				</div>
				<button
					type="button"
					onclick={() => (isEditModalOpen = false)}
					class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
					aria-label="Cerrar modal"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<div class="space-y-3.5 text-xs">
				<div>
					<label for="edit-title-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Título del Bloque</label>
					<input
						id="edit-title-input"
						type="text"
						bind:value={editEventTitle}
						placeholder="Ej: Deep Work, Gimnasio, Estudio..."
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>

				<!-- Selector de Día -->
				<div>
					<label for="edit-date-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Día Asignado</label>
					<select
						id="edit-date-select"
						bind:value={editEventDate}
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					>
						{#each weekDays as d}
							<option value={d.dateStr}>{d.dayName} ({d.dayNumber}) - {d.dateStr}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="edit-start-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Inicio</label>
						<input
							id="edit-start-time"
							type="time"
							bind:value={editEventStartTime}
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
					<div>
						<label for="edit-end-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Fin</label>
						<input
							id="edit-end-time"
							type="time"
							bind:value={editEventEndTime}
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="edit-category-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
						<select
							id="edit-category-select"
							bind:value={editEventCategory}
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						>
							<option value="work">Trabajo (Work)</option>
							<option value="study">Estudio (Study)</option>
							<option value="sport">Deporte (Sport)</option>
							<option value="social">Social</option>
							<option value="hobby">Hobby / Creativo</option>
							<option value="rest">Descanso (Rest)</option>
						</select>
					</div>

					<div>
						<span class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Color</span>
						<div class="flex items-center gap-1.5 mt-1">
							{#each ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6'] as clr}
								<button
									type="button"
									onclick={() => (editEventColor = clr)}
									aria-label="Seleccionar color {clr}"
									class="h-6 w-6 rounded-full border-2 transition-transform cursor-pointer {editEventColor ===
									clr
										? 'border-indigo-600 dark:border-white scale-110 shadow-xs'
										: 'border-transparent opacity-80 hover:opacity-100'}"
									style="background-color: {clr};"
								></button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Notas adicionales -->
				<div>
					<label for="edit-notes-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Notas / Recordatorio (Opcional)</label>
					<input
						id="edit-notes-input"
						type="text"
						bind:value={editEventNotes}
						placeholder="Ej: Revisar documentación antes de empezar..."
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>

				<!-- Estado completado -->
				<label class="flex items-center gap-2 cursor-pointer pt-1">
					<input
						type="checkbox"
						bind:checked={editEventCompleted}
						class="rounded accent-indigo-600 h-4 w-4 cursor-pointer"
					/>
					<span class="text-xs text-slate-700 dark:text-slate-300">Marcar este bloque como completado</span>
				</label>
			</div>

			<!-- Footer acciones -->
			<div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
				<button
					type="button"
					onclick={handleDeleteFromEditModal}
					class="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
				>
					<Trash2 class="h-3.5 w-3.5" />
					<span>Eliminar</span>
				</button>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (isEditModalOpen = false)}
						class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={handleUpdateEvent}
						class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md"
					>
						Guardar Cambios
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal de Exportación Gráfica -->
<ExportModal
	bind:isOpen={isExportModalOpen}
	targetElement={boardElement}
	defaultFilename={`dynamic-planner-${weekRangeLabel.replace(/[\s—]/g, '_')}`}
/>
