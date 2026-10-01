<script lang="ts">
	import { readOnlyStore } from '$lib/stores/readOnly';
	import { toastStore } from '$lib/utils/notifications';
	import { Lock, Unlock } from 'lucide-svelte';

	let isReadOnly = $state(readOnlyStore.current);

	$effect(() => {
		const unsubscribe = readOnlyStore.subscribe((val) => {
			isReadOnly = val;
		});
		return unsubscribe;
	});

	function handleToggle() {
		const newState = readOnlyStore.toggle();
		toastStore.show({
			title: newState ? 'Modo Lectura activado' : 'Modo Edición activado',
			message: newState
				? 'Arrastre y edición bloqueados para deslizar libremente en pantalla.'
				: 'Arrastre y edición de bloques habilitados.',
			type: newState ? 'info' : 'success',
			durationMs: 2200
		});
	}
</script>

<div class="no-export fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40">
	<button
		type="button"
		onclick={handleToggle}
		class="group flex items-center gap-2 rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer border select-none {isReadOnly
			? 'bg-slate-900/90 dark:bg-slate-900/95 border-emerald-500/40 text-emerald-400 shadow-emerald-950/20 hover:border-emerald-400'
			: 'bg-white/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-slate-950/15 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'}"
		title={isReadOnly
			? 'Modo Lectura activo (Protegido contra toques involuntarios). Toca para editar.'
			: 'Modo Edición activo. Toca para bloquear en modo lectura.'}
		aria-label={isReadOnly ? 'Desactivar modo lectura' : 'Activar modo lectura'}
	>
		<!-- Status indicator pulse dot -->
		<span class="relative flex h-2 w-2">
			{#if isReadOnly}
				<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
				<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
			{:else}
				<span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
			{/if}
		</span>

		<!-- Icon -->
		{#if isReadOnly}
			<Lock class="h-3.5 w-3.5 text-emerald-400 stroke-[2.2]" />
		{:else}
			<Unlock class="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 stroke-[2.2]" />
		{/if}

		<!-- Label -->
		<span class="text-xs font-semibold tracking-tight">
			{isReadOnly ? 'Lectura' : 'Edición'}
		</span>

		<!-- Helper tag on desktop -->
		<span class="hidden md:inline-block text-[10px] opacity-60 font-mono pl-0.5">
			{isReadOnly ? 'Bloqueado' : 'Libre'}
		</span>
	</button>
</div>
