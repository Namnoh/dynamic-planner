<script lang="ts">
	import type { ScheduledEvent } from '$lib/types';
	import Modal from './Modal.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { Pencil, Trash2 } from 'lucide-svelte';

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
		onSave: (updatedEvent: ScheduledEvent) => void;
		onDelete: (id: string) => void;
	} = $props();

	let title = $state('');
	let date = $state('');
	let startTime = $state('09:00');
	let endTime = $state('10:00');
	let category = $state('work');
	let color = $state('#3b82f6');
	let notes = $state('');
	let completed = $state(false);

	// Synchronize form when active event changes
	$effect(() => {
		if (event && isOpen) {
			title = event.title;
			date = event.date;
			startTime = event.startTime;
			endTime = event.endTime;
			category = event.category;
			color = event.color || '#3b82f6';
			notes = event.notes || '';
			completed = event.completed;
		}
	});

	function handleSubmit() {
		if (!event || !title.trim()) return;

		onSave({
			...event,
			title: title.trim(),
			date,
			startTime,
			endTime,
			category,
			color,
			notes: notes.trim() || undefined,
			completed
		});

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
					Título del Bloque
				</label>
				<input
					id="edit-event-title-input"
					type="text"
					bind:value={title}
					placeholder="Ej: Deep Work, Gimnasio, Estudio..."
					required
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				/>
			</div>

			<!-- Day Selector -->
			<div>
				<label for="edit-event-date-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Día Asignado
				</label>
				<select
					id="edit-event-date-select"
					bind:value={date}
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				>
					{#each weekDays as d}
						<option value={d.dateStr}>{d.dayName} ({d.dayNumber}) - {d.dateStr}</option>
					{/each}
				</select>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="edit-event-start-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Inicio
					</label>
					<input
						id="edit-event-start-time"
						type="time"
						bind:value={startTime}
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>
				<div>
					<label for="edit-event-end-time" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
						Hora Fin
					</label>
					<input
						id="edit-event-end-time"
						type="time"
						bind:value={endTime}
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
					/>
				</div>
			</div>

			<div>
				<label for="edit-event-category-select" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Categoría
				</label>
				<select
					id="edit-event-category-select"
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

			<!-- Additional Notes -->
			<div>
				<label for="edit-event-notes-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
					Notas / Recordatorio (Opcional)
				</label>
				<input
					id="edit-event-notes-input"
					type="text"
					bind:value={notes}
					placeholder="Ej: Revisar documentación antes de empezar..."
					class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				/>
			</div>

			<!-- Completed Status Toggle -->
			<label class="flex items-center gap-2 cursor-pointer pt-1">
				<input
					type="checkbox"
					bind:checked={completed}
					class="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
				/>
				<span class="font-medium text-slate-700 dark:text-slate-300">Marcar este bloque como completado</span>
			</label>
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
