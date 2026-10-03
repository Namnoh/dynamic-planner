<script lang="ts">
	import type { ScheduledEvent, ActivityTemplate } from '$lib/types';
	import { addMinutesToTime } from '$lib/db';
	import Modal from './Modal.svelte';
	import ColorPicker from './ColorPicker.svelte';
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

	// Reset form when modal opens
	$effect(() => {
		if (isOpen) {
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

	function handleActivitySelectChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const actId = target.value;
		if (!actId) {
			selectedActivityId = '';
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

	function handleStartTimeInput(e: Event) {
		const newStart = (e.target as HTMLInputElement).value;
		startTime = newStart;
		if (errors.startTime) errors.startTime = '';
		if (newStart && currentDuration > 0) {
			endTime = addMinutesToTime(newStart, currentDuration);
			if (errors.endTime) errors.endTime = '';
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

					<select
						id="base-activity-select"
						value={selectedActivityId}
						onchange={handleActivitySelectChange}
						class="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden cursor-pointer shadow-xs"
					>
						<option value="">-- Elige un bloque de actividad base --</option>
						{#each activityTemplates as act}
							<option value={act.id}>
								{act.title} ({act.defaultDuration} min){act.category ? ` • ${act.category}` : ''}
							</option>
						{/each}
					</select>

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
						value={startTime}
						oninput={handleStartTimeInput}
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
						oninput={() => { if (errors.endTime) errors.endTime = ''; }}
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
				<select
					id="new-event-category-select"
					bind:value={category}
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden cursor-pointer"
				>
					<option value="">Sin categoría (Opcional)</option>
					<option value="work">Trabajo (Work)</option>
					<option value="study">Estudio (Study)</option>
					<option value="sport">Deporte (Sport)</option>
					<option value="social">Social</option>
					<option value="hobby">Hobby / Creativo</option>
					<option value="rest">Descanso (Rest)</option>
				</select>
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
