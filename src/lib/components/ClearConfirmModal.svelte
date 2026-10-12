<script lang="ts">
	import Modal from './Modal.svelte';
	import { Trash2, AlertTriangle } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		scope = 'day',
		targetTitle = '',
		itemsCount = 0,
		onConfirm
	}: {
		isOpen: boolean;
		scope?: 'day' | 'week';
		targetTitle?: string;
		itemsCount?: number;
		onConfirm: () => Promise<void> | void;
	} = $props();

	let isDeleting = $state(false);

	async function handleConfirm() {
		if (isDeleting) return;
		isDeleting = true;
		try {
			await onConfirm();
			isOpen = false;
		} finally {
			isDeleting = false;
		}
	}
</script>

<Modal
	bind:isOpen
	title={scope === 'day' ? 'Limpiar Día' : 'Limpiar Semana'}
	icon={Trash2}
	maxWidth="max-w-sm"
>
	{#snippet children()}
		<div class="space-y-3.5 text-xs">
			<div class="flex items-start gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-3 text-rose-800 dark:text-rose-200">
				<AlertTriangle class="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
				<div class="space-y-1">
					<p class="font-semibold text-rose-950 dark:text-rose-100">
						¿Eliminar todos los bloques {scope === 'day' ? 'de este día' : 'de esta semana'}?
					</p>
					<p class="text-[11px] text-rose-700 dark:text-rose-300">
						Se {itemsCount === 1 ? 'eliminará' : 'eliminarán'} <strong>{itemsCount} {itemsCount === 1 ? 'bloque' : 'bloques'}</strong> de <strong>{targetTitle}</strong>.
					</p>
				</div>
			</div>

			<p class="text-[11px] text-slate-500 dark:text-slate-400">
				Esta acción despejará el calendario en el período seleccionado. Tus plantillas guardadas y las configuraciones no se verán afectadas.
			</p>

			<div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
				<button
					type="button"
					onclick={() => (isOpen = false)}
					disabled={isDeleting}
					class="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={isDeleting}
					class="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3.5 py-1.5 text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
				>
					<Trash2 class="h-3.5 w-3.5" />
					<span>{isDeleting ? 'Eliminando...' : scope === 'day' ? 'Limpiar Día' : 'Limpiar Semana'}</span>
				</button>
			</div>
		</div>
	{/snippet}
</Modal>
