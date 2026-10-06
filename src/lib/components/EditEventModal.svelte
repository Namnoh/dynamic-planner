<script lang="ts">
	import { untrack } from 'svelte';
	import { db } from '$lib/db';
	import {
		type ScheduledEvent,
		type ScheduledEventSubtask,
		type CategoryOption,
		type ActivityTemplate
	} from '$lib/types';
	import { categoriesStore } from '$lib/stores/categories';
	import Modal from './Modal.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import SearchableSelect from './SearchableSelect.svelte';
	import ChecklistEditor from './ChecklistEditor.svelte';
	import CategoryManagerModal from './CategoryManagerModal.svelte';
	import { Pencil, Trash2, Layers } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		event,
		weekDays = [],
		onSave,
		onDelete
	}: {
		isOpen: boolean;
		event: ScheduledEvent | null;
		weekDays: { dateStr: string; dayName: string; dayNumber: number }[];
		onSave: (
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
			}
		) => void;
		onDelete: (id: string) => void;
	} = $props();

	let isCategoryModalOpen = $state(false);
	let categoryOptions = $state<CategoryOption[]>(categoriesStore.options);

	$effect(() => {
		const unsubscribe = categoriesStore.subscribe(() => {
			categoryOptions = categoriesStore.options;
		});
		return unsubscribe;
	});

	let title = $state('');
	let date = $state('');
	let startTime = $state('09:00');
	let endTime = $state('10:00');
	let category = $state('');
	let color = $state('#3b82f6');
	let notes = $state('');
	let subtasks = $state<ScheduledEventSubtask[]>([]);
	let completed = $state(false);
	let errors = $state<{ title?: string; date?: string; startTime?: string; endTime?: string }>({});

	// Propagation / sync state
	let applyToOthers = $state(false);
	let propagateScope = $state<'same_title' | 'all'>('same_title');
	let syncColor = $state(true);
	let syncCategory = $state(false);
	let syncNotes = $state(false);
	let syncSubtasks = $state(false);
	let syncBaseTemplate = $state(false);

	let otherEvents = $state<ScheduledEvent[]>([]);
	let matchingTemplate = $state<ActivityTemplate | null>(null);

	async function loadPropagationContext(currentEvent: ScheduledEvent) {
		try {
			const allEvents = await db.scheduledEvents.toArray();
			otherEvents = allEvents.filter((e) => e.id !== currentEvent.id);

			const allTemplates = await db.activityTemplates.toArray();
			matchingTemplate =
				(currentEvent.sourceTemplateId
					? allTemplates.find((t) => t.id === currentEvent.sourceTemplateId)
					: null) ||
				allTemplates.find((t) => t.title.trim().toLowerCase() === currentEvent.title.trim().toLowerCase()) ||
				null;
		} catch (err) {
			console.error('Error loading propagation context:', err);
		}
	}

	const matchingSameTitleCount = $derived.by(() => {
		const trimmed = title.trim().toLowerCase();
		if (!trimmed) return 0;
		return otherEvents.filter((e) => {
			const sameTemplate = Boolean(event?.sourceTemplateId && e.sourceTemplateId === event.sourceTemplateId);
			const sameTitle = Boolean(e.title.trim().toLowerCase() === trimmed);
			return sameTemplate || sameTitle;
		}).length;
	});

	const totalOtherCount = $derived(otherEvents.length);

	let wasOpen = false;
	let lastEventId: string | null = null;

	const dayOptions = $derived.by(() =>
		weekDays.map((d) => ({
			value: d.dateStr,
			label: `${d.dayName} (${d.dayNumber}) - ${d.dateStr}`
		}))
	);

	// Synchronize form when modal opens or active event ID changes
	$effect(() => {
		const currentlyOpen = isOpen;
		const currentEventId = event?.id || null;

		if (currentlyOpen && (!wasOpen || currentEventId !== lastEventId)) {
			untrack(() => {
				if (event) {
					title = event.title;
					date = event.date;
					startTime = event.startTime;
					endTime = event.endTime;
					category = event.category || '';
					color = event.color || '#3b82f6';
					notes = event.notes || '';
					subtasks = event.subtasks ? JSON.parse(JSON.stringify(event.subtasks)) : [];
					completed = event.completed;
					errors = {};

					applyToOthers = false;
					propagateScope = 'same_title';
					syncColor = true;
					syncCategory = false;
					syncNotes = false;
					syncSubtasks = false;
					syncBaseTemplate = false;
					loadPropagationContext(event);
				}
			});
		}
		wasOpen = currentlyOpen;
		lastEventId = currentEventId;
	});

	function handleSubmit() {
		if (!event) return;
		errors = {};
		let hasError = false;

		if (!title.trim()) {
			errors.title = 'Este campo es requerido';
			hasError = true;
		}

		if (!date) {
			errors.date = 'Este campo es requerido';
			hasError = true;
		}

		if (!startTime) {
			errors.startTime = 'Este campo es requerido';
			hasError = true;
		}

		if (!endTime) {
			errors.endTime = 'Este campo es requerido';
			hasError = true;
		} else if (startTime && startTime > endTime) {
			errors.endTime = 'La hora de fin debe ser posterior a la hora de inicio';
			hasError = true;
		}

		if (hasError) return;

		onSave(
			{
				...event,
				title: title.trim(),
				date,
				startTime,
				endTime,
				category: category || undefined,
				color,
				notes: notes.trim() || undefined,
				subtasks: subtasks.length > 0 ? $state.snapshot(subtasks) : undefined,
				completed
			},
			applyToOthers
				? {
						propagate: true,
						scope: propagateScope,
						fields: {
							color: syncColor,
							category: syncCategory,
							notes: syncNotes,
							subtasks: syncSubtasks
						},
						updateBaseTemplate: syncBaseTemplate && Boolean(matchingTemplate)
				  }
				: undefined
		);

		isOpen = false;
	}

	function handleDelete() {
		if (!event) return;
		const id = event.id;
		isOpen = false;
		onDelete(id);
	}
</script>

<Modal
	bind:isOpen
	title="Editar Bloque de Tiempo"
	icon={Pencil}
	maxWidth="max-w-md"
>
	{#snippet children()}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-3.5 text-xs">
			<div>
				<label for="edit-event-title-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Título del Bloque <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
				</label>
				<input
					id="edit-event-title-input"
					type="text"
					bind:value={title}
					oninput={() => { if (errors.title) errors.title = ''; }}
					placeholder="Ej: Deep Work, Gimnasio, Estudio..."
					class="w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {errors.title
						? 'border-rose-500 focus:border-rose-500'
						: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
				/>
				{#if errors.title}
					<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
						{errors.title}
					</p>
				{/if}
			</div>

			<!-- Day Selector -->
			<div>
				<label for="edit-event-date-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Día Asignado <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
				</label>
				<SearchableSelect
					id="edit-event-date-select"
					bind:value={date}
					options={dayOptions}
					placeholder="Selecciona el día..."
					searchPlaceholder="Buscar día..."
					buttonClass={errors.date ? 'border-rose-500 focus:border-rose-500' : ''}
					onchange={() => {
						if (errors.date) errors.date = '';
					}}
				/>
				{#if errors.date}
					<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
						{errors.date}
					</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="edit-event-start-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Inicio <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
					</label>
					<input
						id="edit-event-start-time"
						type="time"
						bind:value={startTime}
						oninput={() => { if (errors.startTime) errors.startTime = ''; }}
						onchange={() => { if (errors.startTime) errors.startTime = ''; }}
						class="w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {errors.startTime
							? 'border-rose-500 focus:border-rose-500'
							: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
					/>
					{#if errors.startTime}
						<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
							{errors.startTime}
						</p>
					{/if}
				</div>
				<div>
					<label for="edit-event-end-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Fin <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
					</label>
					<input
						id="edit-event-end-time"
						type="time"
						bind:value={endTime}
						oninput={() => { if (errors.endTime) errors.endTime = ''; }}
						onchange={() => { if (errors.endTime) errors.endTime = ''; }}
						class="w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {errors.endTime
							? 'border-rose-500 focus:border-rose-500'
							: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
					/>
					{#if errors.endTime}
						<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
							{errors.endTime}
						</p>
					{/if}
				</div>
			</div>

			<div>
				<div class="flex items-center justify-between mb-1">
					<label for="edit-event-category-select" class="block font-medium text-slate-700 dark:text-slate-300">
						Categoría
					</label>
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							onclick={() => (isCategoryModalOpen = true)}
							class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
						>
							+ Gestionar
						</button>
						<span class="text-slate-300 dark:text-slate-700">•</span>
						<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
					</div>
				</div>
				<SearchableSelect
					id="edit-event-category-select"
					bind:value={category}
					options={categoryOptions}
					placeholder="Sin categoría (Opcional)"
					searchPlaceholder="Buscar categoría..."
				/>
			</div>

			<ColorPicker bind:selectedColor={color} label="Color del Bloque" />

			<!-- Additional Notes -->
			<div>
				<div class="flex items-center justify-between mb-1">
					<label for="edit-event-notes-input" class="block font-medium text-slate-700 dark:text-slate-300">
						Notas / Recordatorio
					</label>
					<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
				</div>
				<input
					id="edit-event-notes-input"
					type="text"
					bind:value={notes}
					placeholder="Ej: Revisar documentación antes de empezar..."
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				/>
			</div>

			<ChecklistEditor
				bind:items={subtasks}
				allowCompletion={true}
				label="Checklist / Tareas"
				placeholder="Añadir tarea a este bloque..."
			/>

			<!-- Completed Status Toggle -->
			<label class="flex items-center gap-2 cursor-pointer pt-1">
				<input
					type="checkbox"
					bind:checked={completed}
					class="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
				/>
				<span class="font-medium text-slate-700 dark:text-slate-300">Marcar este bloque como completado</span>
			</label>

			<!-- Propagation / Synchronize with other blocks -->
			<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-3">
				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-800 dark:text-slate-200">
						<input
							type="checkbox"
							bind:checked={applyToOthers}
							class="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
						/>
						<span>Aplicar cambios a otros bloques existentes</span>
					</label>
					<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
				</div>

				{#if applyToOthers}
					<div class="pt-2 space-y-3 border-t border-slate-200 dark:border-slate-700/60 animate-in fade-in duration-150">
						<!-- Scope selector -->
						<div>
							<span class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
								¿A qué bloques aplicar?
							</span>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<label class="flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors {propagateScope === 'same_title' ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}">
									<input
										type="radio"
										name="propagate-scope"
										value="same_title"
										bind:group={propagateScope}
										class="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<div class="text-[11px] leading-snug">
										<span class="font-medium text-slate-800 dark:text-slate-200 block">Mismo nombre</span>
										<span class="text-[10px] text-slate-500 dark:text-slate-400">
											"{title.trim() || 'Sin título'}" ({matchingSameTitleCount} {matchingSameTitleCount === 1 ? 'bloque' : 'bloques'})
										</span>
									</div>
								</label>

								<label class="flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors {propagateScope === 'all' ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}">
									<input
										type="radio"
										name="propagate-scope"
										value="all"
										bind:group={propagateScope}
										class="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<div class="text-[11px] leading-snug">
										<span class="font-medium text-slate-800 dark:text-slate-200 block">Todos los bloques</span>
										<span class="text-[10px] text-slate-500 dark:text-slate-400">
											Todo el planificador ({totalOtherCount} {totalOtherCount === 1 ? 'bloque' : 'bloques'})
										</span>
									</div>
								</label>
							</div>
						</div>

						<!-- Fields to sync -->
						<div>
							<span class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
								Datos a sincronizar:
							</span>
							<div class="grid grid-cols-2 gap-2">
								<label class="flex items-center gap-2 cursor-pointer select-none">
									<input
										type="checkbox"
										bind:checked={syncColor}
										class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<span class="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
										Color
										<span class="inline-block w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style="background-color: {color};"></span>
									</span>
								</label>

								<label class="flex items-center gap-2 cursor-pointer select-none">
									<input
										type="checkbox"
										bind:checked={syncCategory}
										class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<span class="text-[11px] text-slate-700 dark:text-slate-300">Categoría</span>
								</label>

								<label class="flex items-center gap-2 cursor-pointer select-none">
									<input
										type="checkbox"
										bind:checked={syncNotes}
										class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<span class="text-[11px] text-slate-700 dark:text-slate-300">Notas</span>
								</label>

								<label class="flex items-center gap-2 cursor-pointer select-none">
									<input
										type="checkbox"
										bind:checked={syncSubtasks}
										class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<span class="text-[11px] text-slate-700 dark:text-slate-300">Checklist ({subtasks.length})</span>
								</label>
							</div>
						</div>

						<!-- Base template update option -->
						{#if matchingTemplate}
							<div class="pt-2 border-t border-slate-200 dark:border-slate-700/60">
								<label class="flex items-center gap-2 cursor-pointer select-none">
									<input
										type="checkbox"
										bind:checked={syncBaseTemplate}
										class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									/>
									<span class="text-[11px] text-slate-700 dark:text-slate-300">
										Actualizar también la plantilla base ("{matchingTemplate.title}")
									</span>
								</label>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</form>
	{/snippet}

	{#snippet footerSnippet()}
		<div class="flex items-center justify-between w-full">
			<button
				type="button"
				onclick={handleDelete}
				class="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
			>
				<Trash2 class="h-3.5 w-3.5" />
				<span>Eliminar</span>
			</button>

			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (isOpen = false)}
					class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleSubmit}
					class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md"
				>
					Guardar Cambios
				</button>
			</div>
		</div>
	{/snippet}
</Modal>

<CategoryManagerModal
	bind:isOpen={isCategoryModalOpen}
	onCategoryCreated={(newCat) => {
		category = newCat.id;
	}}
/>
