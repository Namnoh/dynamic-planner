<script lang="ts">
	import type { ScheduledEvent } from '$lib/types';
	import Modal from './Modal.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { Plus } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		targetDate,
		onSave
	}: {
		isOpen: boolean;
		targetDate: string;
		onSave: (newEvent: Omit<ScheduledEvent, 'id'>) => void;
	} = $props();

	let title = $state('');
	let startTime = $state('09:00');
	let endTime = $state('10:00');
	let category = $state('work');
	let color = $state('#3b82f6');

	// Reset form when modal opens
	$effect(() => {
		if (isOpen) {
			title = '';
			startTime = '09:00';
			endTime = '10:00';
			category = 'work';
			color = '#3b82f6';
		}
	});

	function handleSubmit() {
		if (!title.trim()) return;

		onSave({
			date: targetDate,
			title: title.trim(),
			startTime,
			endTime,
			category,
			color,
			completed: false
		});

		isOpen = false;
	}
</script>

<Modal
	bind:isOpen
	title="Nuevo Bloque de Tiempo"
	icon={Plus}
	maxWidth="max-w-sm"
>
	{#snippet children()}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-3 text-xs">
			<div>
				<label for="new-event-title-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Título del Bloque
				</label>
				<input
					id="new-event-title-input"
					type="text"
					bind:value={title}
					placeholder="Ej: Deep Work, Gimnasio, Estudio..."
					required
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				/>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="new-event-start-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Inicio
					</label>
					<input
						id="new-event-start-time"
						type="time"
						bind:value={startTime}
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>
				<div>
					<label for="new-event-end-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Fin
					</label>
					<input
						id="new-event-end-time"
						type="time"
						bind:value={endTime}
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>
			</div>

			<div>
				<label for="new-event-category-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Categoría
				</label>
				<select
					id="new-event-category-select"
					bind:value={category}
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				>
					<option value="work">Trabajo (Work)</option>
					<option value="study">Estudio (Study)</option>
					<option value="sport">Deporte (Sport)</option>
					<option value="social">Social</option>
					<option value="hobby">Hobby / Creativo</option>
					<option value="rest">Descanso (Rest)</option>
				</select>
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
