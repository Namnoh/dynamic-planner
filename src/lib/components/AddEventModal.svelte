<script lang="ts">
	import { untrack } from 'svelte';
	import { CATEGORY_OPTIONS, type ScheduledEvent, type ActivityTemplate } from '$lib/types';
	import { addMinutesToTime } from '$lib/db';
	import Modal from './Modal.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import SearchableSelect from './SearchableSelect.svelte';
	import { Plus, Tag } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		targetDate,
		initialStartTime = '09:00',
		activityTemplates = [],
		onSave
	}: {
		isOpen: boolean;
		targetDate: string;
		initialStartTime?: string;
		activityTemplates?: ActivityTemplate[];
		onSave: (newEvent: Omit<ScheduledEvent, 'id'>) => void;
	} = $props();

	let selectedActivityId = $state('');
	let title = $state('');
	let startTime = $state('09:00');
	let endTime = $state('10:00');
	let category = $state('');
	let color = $state('#3b82f6');
	let notes = $state('');
	let currentDuration = $state(60);
	let errors = $state<{ title?: string; startTime?: string; endTime?: string }>({});

	let wasOpen = false;

	function resetForm() {
		selectedActivityId = '';
		title = '';
		startTime = initialStartTime || '09:00';
		currentDuration = 60;
		endTime = addMinutesToTime(startTime, currentDuration);
		category = '';
		color = '#3b82f6';
		notes = '';
		errors = {};
	}

	// Reset form ONLY when modal transitions from closed to open
	$effect(() => {
		const currentlyOpen = isOpen;
		if (currentlyOpen && !wasOpen) {
			untrack(() => {
				resetForm();
			});
		}
		wasOpen = currentlyOpen;
	});

	function handleSelectActivity(act: ActivityTemplate) {
		selectedActivityId = act.id;
		title = act.title;
		category = act.category || '';
		color = act.color;
		currentDuration = act.defaultDuration || 60;
		endTime = addMinutesToTime(startTime, currentDuration);
		if (act.notes) {
			notes = act.notes;
		}
		if (errors.title) errors.title = '';
		if (errors.endTime) errors.endTime = '';
	}

	const activityOptions = $derived.by(() => [
		{ value: '', label: '-- Elige un bloque de actividad base --' },
		...activityTemplates.map((act) => ({
			value: act.id,
			label: act.title,
			sublabel: `${act.defaultDuration} min${act.category ? ` • ${act.category}` : ''}`,
			color: act.color
		}))
	]);

	function handleActivityChosen(actId: string) {
		selectedActivityId = actId;
		if (!actId) {
			handleClearSelection();
			return;
		}
		const found = activityTemplates.find((a) => a.id === actId);
		if (found) {
			handleSelectActivity(found);
		}
	}

	function handleClearSelection() {
		selectedActivityId = '';
		title = '';
		category = '';
		color = '#3b82f6';
		notes = '';
		currentDuration = 60;
		endTime = addMinutesToTime(startTime, currentDuration);
	}

	function getMinutesDifference(start: string, end: string): number {
		const [h1, m1] = start.split(':').map(Number);
		const [h2, m2] = end.split(':').map(Number);
		return (h2 * 60 + m2) - (h1 * 60 + m1);
	}

	function handleStartTimeChange(e: Event) {
		const newStart = (e.target as HTMLInputElement).value;
		startTime = newStart;
		if (errors.startTime) errors.startTime = '';
		if (newStart && currentDuration > 0) {
			endTime = addMinutesToTime(newStart, currentDuration);
			if (errors.endTime) errors.endTime = '';
		}
	}

	function handleEndTimeChange(e: Event) {
		const newEnd = (e.target as HTMLInputElement).value;
		endTime = newEnd;
		if (errors.endTime) errors.endTime = '';
		if (startTime && newEnd) {
			const diff = getMinutesDifference(startTime, newEnd);
			if (diff > 0) {
				currentDuration = diff;
			}
		}
	}

	function handleSubmit() {
		errors = {};
		let hasError = false;

		if (!title.trim()) {
			errors.title = 'Este campo es requerido';
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

		onSave({
			date: targetDate,
			title: title.trim(),
			startTime,
			endTime,
			category: category || undefined,
			color,
			notes: notes.trim() || undefined,
			sourceTemplateId: selectedActivityId || undefined,
			completed: false
		});

		isOpen = false;
	}
</script>

<Modal
	bind:isOpen
	title="Nuevo Bloque de Tiempo"
	description={targetDate ? `Programar para el día ${targetDate}` : undefined}
	icon={Plus}
	maxWidth="max-w-md"
>
	{#snippet children()}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-3.5 text-xs">
			<!-- Predetermined Activity Template Selector (if any exist) -->
			{#if activityTemplates && activityTemplates.length > 0}
				<div class="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 space-y-2">
					<div class="flex items-center justify-between">
						<label for="base-activity-select" class="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
							<Tag class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
							<span>Cargar desde bloque predeterminado</span>
						</label>
						{#if selectedActivityId}
							<button
								type="button"
								onclick={handleClearSelection}
								class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
							>
								Limpiar selección
							</button>
						{/if}
					</div>

					<SearchableSelect
						id="base-activity-select"
						value={selectedActivityId}
						options={activityOptions}
						placeholder="-- Elige un bloque de actividad base --"
						searchPlaceholder="Buscar bloque de actividad..."
						buttonClass="border-indigo-200 dark:border-indigo-800"
						onchange={(val) => handleActivityChosen(String(val))}
					/>

					<!-- Quick Chips for 1-Click Pick -->
					<div class="flex flex-wrap gap-1.5 pt-0.5">
						{#each activityTemplates.slice(0, 5) as act}
							<button
								type="button"
								onclick={() => handleSelectActivity(act)}
								class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer {selectedActivityId === act.id
									? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
									: 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}"
								style={selectedActivityId !== act.id ? `border-left: 3px solid ${act.color};` : ''}
								title="Cargar {act.title} ({act.defaultDuration} min)"
							>
								<span>{act.title}</span>
								<span class="opacity-70 text-[9px]">({act.defaultDuration}m)</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div>
				<label for="new-event-title-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Título del Bloque <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
				</label>
				<input
					id="new-event-title-input"
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

			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="new-event-start-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Inicio <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
					</label>
					<input
						id="new-event-start-time"
						type="time"
						bind:value={startTime}
						oninput={handleStartTimeChange}
						onchange={handleStartTimeChange}
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
					<label for="new-event-end-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Fin <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
					</label>
					<input
						id="new-event-end-time"
						type="time"
						bind:value={endTime}
						oninput={handleEndTimeChange}
						onchange={handleEndTimeChange}
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
					<label for="new-event-category-select" class="block font-medium text-slate-700 dark:text-slate-300">
						Categoría
					</label>
					<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
				</div>
				<SearchableSelect
					id="new-event-category-select"
					bind:value={category}
					options={CATEGORY_OPTIONS}
					placeholder="Sin categoría (Opcional)"
					searchPlaceholder="Buscar categoría..."
				/>
			</div>

			<div>
				<div class="flex items-center justify-between mb-1">
					<label for="new-event-notes-input" class="block font-medium text-slate-700 dark:text-slate-300">
						Notas o descripción
					</label>
					<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
				</div>
				<input
					id="new-event-notes-input"
					type="text"
					bind:value={notes}
					placeholder="Ej: Preparar apuntes, modo concentración..."
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden transition-colors"
				/>
			</div>

			<ColorPicker bind:selectedColor={color} label="Color del Bloque" />
		</form>
	{/snippet}

	{#snippet footerSnippet()}
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
			Añadir Bloque
		</button>
	{/snippet}
</Modal>
