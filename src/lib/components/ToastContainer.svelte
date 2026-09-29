<script lang="ts">
	import { toastStore, type InAppToast } from '$lib/utils/notifications';
	import { CheckCircle2, AlertCircle, Info, X } from 'lucide-svelte';

	let toasts = $state<InAppToast[]>([]);

	$effect(() => {
		const unsubscribe = toastStore.subscribe((updated) => {
			toasts = updated;
		});
		return unsubscribe;
	});
</script>

<div
	class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
	aria-live="polite"
>
	{#each toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-lg dark:shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200"
		>
			<div class="mt-0.5 shrink-0">
				{#if toast.type === 'success'}
					<CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
				{:else if toast.type === 'error'}
					<AlertCircle class="h-4 w-4 text-rose-600 dark:text-rose-400" />
				{:else}
					<Info class="h-4 w-4 text-sky-600 dark:text-sky-400" />
				{/if}
			</div>

			<div class="flex-1 text-xs">
				<p class="font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
				{#if toast.message}
					<p class="mt-0.5 text-slate-600 dark:text-slate-400 leading-relaxed">{toast.message}</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => toastStore.dismiss(toast.id)}
				class="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
				aria-label="Cerrar notificación"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	{/each}
</div>
