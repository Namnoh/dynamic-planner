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
		Layers
	} from 'lucide-svelte';

	// Component State
	let currentMonday = $state<Date>(getMondayOfCurrentWeek());
	let events = $state<ScheduledEvent[]>([]);
	let dayTemplates = $state<DayTemplate[]>([]);
	let activityTemplates = $state<ActivityTemplate[]>([]);
	let isExportModalOpen = $state(false);
	let boardElement = $state<HTMLElement | null>(null);

	// Quick Add Modal / State
	let isAddModalOpen = $state(false);
	let targetDateForNewEvent = $state('');
	let newEventTitle = $state('');
	let newEventStartTime = $state('09:00');
	let newEventEndTime = $state('10:00');
	let newEventCategory = $state('work');
	let newEventColor = $state('#3b82f6');

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
					class="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto"
				>
					{#each dayColumns[dayIndex] || [] as item (item.id)}
						<article
							class="group relative flex flex-col gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800/90 p-2.5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md cursor-grab active:cursor-grabbing {item.completed
								? 'opacity-60 bg-slate-100/70 dark:bg-slate-900/40 border-dashed'
								: 'bg-white dark:bg-slate-800/90'}"
							style="border-left: 4px solid {item.color || '#3b82f6'};"
						>
							<!-- Time and Complete checkbox -->
							<div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
								<span class="flex items-center gap-1 font-mono font-medium">
									<Clock class="h-3 w-3 text-slate-400 dark:text-slate-500" />
									{item.startTime} - {item.endTime}
								</span>

								<div class="flex items-center gap-1.5">
									<button
										type="button"
										onclick={() => toggleCompleted(item)}
										class="no-export flex h-4 w-4 items-center justify-center rounded border transition-colors cursor-pointer {item.completed
											? 'border-emerald-500 bg-emerald-500 text-white'
											: 'border-slate-300 dark:border-slate-600 hover:border-slate-400 bg-slate-50 dark:bg-slate-800'}"
										title={item.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
									>
										{#if item.completed}
											<Check class="h-3 w-3 stroke-[3]" />
										{/if}
									</button>

									<button
										type="button"
										onclick={() => deleteEvent(item.id)}
										class="no-export opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-all cursor-pointer"
										title="Eliminar bloque"
									>
										<Trash2 class="h-3 w-3" />
									</button>
								</div>
							</div>

							<!-- Title -->
							<h5
								class="text-xs font-semibold leading-snug {item.completed
									? 'line-through text-slate-400 dark:text-slate-500'
									: 'text-slate-900 dark:text-slate-100'}"
							>
								{item.title}
							</h5>

							<!-- Notes or Category Tag -->
							<div class="flex items-center justify-between gap-1 mt-0.5">
								<span
									class="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-transparent"
								>
									{item.category}
								</span>

								{#if item.subtasks && item.subtasks.length > 0}
									<span class="text-[10px] text-slate-500 dark:text-slate-400">
										✓ {item.subtasks.filter((s) => s.completed).length}/{item.subtasks.length}
									</span>
								{/if}
							</div>
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

<!-- Modal de Exportación Gráfica -->
<ExportModal
	bind:isOpen={isExportModalOpen}
	targetElement={boardElement}
	defaultFilename={`dynamic-planner-${weekRangeLabel.replace(/[\s—]/g, '_')}`}
/>
