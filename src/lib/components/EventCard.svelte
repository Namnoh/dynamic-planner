<script lang="ts">
	import type { ScheduledEvent } from '$lib/types';
	import type { BlockColorStyle } from '$lib/stores/settings';
	import { Check, Pencil, Trash2 } from 'lucide-svelte';

	let {
		event,
		blockColorStyle = 'border',
		onEdit,
		onToggleComplete,
		onDelete
	}: {
		event: ScheduledEvent;
		blockColorStyle?: BlockColorStyle;
		onEdit: (item: ScheduledEvent) => void;
		onToggleComplete: (item: ScheduledEvent) => void;
		onDelete: (id: string) => void;
	} = $props();

	function getBlockStyle(item: ScheduledEvent, styleMode: BlockColorStyle): string {
		const color = item.color || '#3b82f6';
		if (styleMode === 'full') {
			const tintPercent = item.completed ? '8%' : '14%';
			const borderPercent = item.completed ? '25%' : '35%';
			return `border-left: 3.5px solid ${color}; background-color: color-mix(in srgb, ${color} ${tintPercent}, var(--card-bg-base)); border-color: color-mix(in srgb, ${color} ${borderPercent}, transparent);`;
		}
		return `border-left: 3.5px solid ${color};`;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
	class="group relative flex flex-col gap-1 rounded-xl px-2.5 py-2 shadow-2xs transition-all duration-150 cursor-pointer {event.completed
		? 'opacity-65 border-dashed'
		: ''} {blockColorStyle === 'border'
		? (event.completed
			? 'border border-slate-200 dark:border-slate-800/90 bg-slate-100/70 dark:bg-slate-900/40'
			: 'border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs')
		: (event.completed
			? 'border'
			: 'border hover:shadow-xs hover:brightness-[1.02]')}"
	style={getBlockStyle(event, blockColorStyle)}
	onclick={() => onEdit(event)}
>
	<!-- Floating Top Action Tab (Smooth Hover) -->
	<div
		class="no-export absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-800/95 px-1 py-0.5 shadow-md backdrop-blur-md transition-all duration-150 ease-out opacity-0 -translate-y-1 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto"
	>
		<!-- Check / Complete Button -->
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onToggleComplete(event);
			}}
			class="flex h-5 w-5 items-center justify-center rounded-md transition-all duration-150 cursor-pointer {event.completed
				? 'bg-emerald-500 text-white shadow-xs'
				: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400'}"
			title={event.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
			aria-label={event.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
		>
			<Check class="h-3 w-3 stroke-[2.5]" />
		</button>

		<!-- Subtle Vertical Divider -->
		<div class="h-3 w-px bg-slate-200 dark:bg-slate-700/80 my-auto"></div>

		<!-- Edit Button -->
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onEdit(event);
			}}
			class="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 transition-all duration-150 cursor-pointer"
			title="Editar bloque"
			aria-label="Editar bloque"
		>
			<Pencil class="h-3 w-3 stroke-[2]" />
		</button>

		<!-- Delete Button -->
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onDelete(event.id);
			}}
			class="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-all duration-150 cursor-pointer"
			title="Eliminar bloque"
			aria-label="Eliminar bloque"
		>
			<Trash2 class="h-3 w-3 stroke-[2]" />
		</button>
	</div>

	<!-- Row 1: Time (clean typography) and Category -->
	<div class="flex items-center justify-between gap-1 leading-none">
		<span class="inline-flex items-center gap-1 font-sans text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400 tracking-tight">
			{#if event.completed}
				<Check class="h-3 w-3 text-emerald-500 stroke-[2.5]" />
			{/if}
			<span>{event.startTime} – {event.endTime}</span>
		</span>

		<span
			class="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider {blockColorStyle === 'full'
				? 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200'
				: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-transparent'}"
		>
			{event.category}
		</span>
	</div>

	<!-- Row 2: Block Title -->
	<h5
		class="text-xs font-semibold leading-snug tracking-tight {event.completed
			? 'line-through text-slate-400 dark:text-slate-500'
			: 'text-slate-800 dark:text-slate-100'}"
	>
		{event.title}
	</h5>

	<!-- Row 3: Subtasks or Notes (if present) -->
	{#if (event.subtasks && event.subtasks.length > 0) || event.notes}
		<div class="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
			{#if event.notes}
				<span class="truncate italic max-w-[130px]" title={event.notes}>
					{event.notes}
				</span>
			{/if}
			{#if event.subtasks && event.subtasks.length > 0}
				<span class="ml-auto font-sans tabular-nums text-[9.5px]">
					✓ {event.subtasks.filter((s) => s.completed).length}/{event.subtasks.length}
				</span>
			{/if}
		</div>
	{/if}
</article>
