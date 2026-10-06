<script lang="ts">
	import type { ScheduledEventSubtask } from '$lib/types';
	import { ListChecks, Plus, Trash2, Check } from 'lucide-svelte';

	let {
		items = $bindable([]),
		allowCompletion = true,
		label = 'Checklist / Subtareas',
		placeholder = 'Escribe un ítem y presiona Enter...'
	}: {
		items: ScheduledEventSubtask[];
		allowCompletion?: boolean;
		label?: string;
		placeholder?: string;
	} = $props();

	let newItemText = $state('');

	function handleAddItem() {
		const trimmed = newItemText.trim();
		if (!trimmed) return;

		const id = crypto.randomUUID ? crypto.randomUUID() : `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		items = [
			...items,
			{
				id,
				title: trimmed,
				completed: false
			}
		];
		newItemText = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddItem();
		}
	}

	function handleRemoveItem(idx: number) {
		items = items.filter((_, i) => i !== idx);
	}

	function handleToggleItem(idx: number) {
		items = items.map((item, i) => (i === idx ? { ...item, completed: !item.completed } : item));
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<label class="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 text-xs">
			<ListChecks class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
			<span>{label}</span>
			{#if items.length > 0}
				{#if allowCompletion}
					{@const completedCount = items.filter((s) => s.completed).length}
					<span
						class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums {completedCount === items.length
							? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
							: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'}"
					>
						{completedCount}/{items.length}
					</span>
				{:else}
					<span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 tabular-nums">
						{items.length}
					</span>
				{/if}
			{/if}
		</label>
		<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
	</div>

	<!-- Existing Items List -->
	{#if items.length > 0}
		<div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
			{#each items as item, idx (item.id || idx)}
				<div
					class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
				>
					{#if allowCompletion}
						<button
							type="button"
							onclick={() => handleToggleItem(idx)}
							class="h-4 w-4 shrink-0 rounded flex items-center justify-center transition-all cursor-pointer {item.completed
								? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
								: 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-indigo-400'}"
							title={item.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
						>
							{#if item.completed}
								<Check class="h-3 w-3 stroke-[3]" />
							{/if}
						</button>
					{:else}
						<span class="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mx-1"></span>
					{/if}

					<input
						type="text"
						bind:value={item.title}
						class="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden transition-colors {item.completed
							? 'line-through text-slate-400 dark:text-slate-500'
							: ''}"
						placeholder="Descripción de la tarea..."
					/>

					<button
						type="button"
						onclick={() => handleRemoveItem(idx)}
						class="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
						title="Eliminar ítem"
					>
						<Trash2 class="h-3.5 w-3.5" />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add New Item Input Row -->
	<div class="flex items-center gap-1.5">
		<input
			type="text"
			bind:value={newItemText}
			onkeydown={handleKeydown}
			placeholder={placeholder}
			class="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden transition-colors"
		/>
		<button
			type="button"
			onclick={handleAddItem}
			disabled={!newItemText.trim()}
			class="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition-all shadow-2xs {newItemText.trim()
				? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'
				: 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}"
			title="Añadir ítem al checklist"
		>
			<Plus class="h-3.5 w-3.5" />
			<span>Añadir</span>
		</button>
	</div>
</div>
