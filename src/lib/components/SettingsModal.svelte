<script lang="ts">
	import { settingsStore, type BlockColorStyle } from '$lib/stores/settings';
	import { toastStore } from '$lib/utils/notifications';
	import { Settings, X, Palette, CheckCircle2 } from 'lucide-svelte';

	let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

	let currentStyle = $state<BlockColorStyle>(settingsStore.current);

	$effect(() => {
		const unsubscribe = settingsStore.subscribe((val) => {
			currentStyle = val;
		});
		return unsubscribe;
	});

	function selectStyle(style: BlockColorStyle) {
		settingsStore.setBlockColorStyle(style);
		toastStore.show({
			title: 'Preferencia guardada',
			message: `Estilo de bloques cambiado a: ${style === 'full' ? 'Color completo' : 'Solo borde izquierdo'}`,
			type: 'info',
			durationMs: 2500
		});
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-6 transition-colors"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2.5 text-indigo-600 dark:text-indigo-400">
						<Settings class="h-5 w-5" />
					</div>
					<div>
						<h3 class="font-bold text-lg">Configuración</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400">Personaliza la interfaz y visualización del planificador</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (isOpen = false)}
					class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
					aria-label="Cerrar configuración"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Opción: Estilo de Color de Bloques -->
			<div class="space-y-3.5">
				<div class="flex items-center gap-2">
					<Palette class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
					<h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">
						Estilo visual de los bloques de tiempo
					</h4>
				</div>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Define cómo se aplican los colores de categoría en tus tarjetas de planificación:
				</p>

				<!-- Selector visual interactivo con previews -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<!-- Opción 1: Solo Borde Izquierdo -->
					<button
						type="button"
						onclick={() => selectStyle('border')}
						class="flex flex-col items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer {currentStyle === 'border'
							? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/15 shadow-sm'
							: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'}"
					>
						<div class="flex items-center justify-between w-full">
							<span class="font-semibold text-xs text-slate-800 dark:text-slate-200">
								Solo borde izquierdo
							</span>
							{#if currentStyle === 'border'}
								<CheckCircle2 class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							{/if}
						</div>

						<!-- Mini preview de Borde Izquierdo -->
						<div
							class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2.5 py-2 shadow-2xs space-y-1"
							style="border-left: 3.5px solid #3b82f6;"
						>
							<div class="flex justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-sans tabular-nums font-medium tracking-tight">
								<span>09:30 – 11:30</span>
								<span class="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-slate-300">WORK</span>
							</div>
							<p class="text-xs font-semibold text-slate-800 dark:text-slate-100">Deep Work: Arquitectura</p>
						</div>

						<span class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
							Fondo neutro y limpio con una franja lateral que identifica la categoría.
						</span>
					</button>

					<!-- Opción 2: Color Completo -->
					<button
						type="button"
						onclick={() => selectStyle('full')}
						class="flex flex-col items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer {currentStyle === 'full'
							? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/15 shadow-sm'
							: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'}"
					>
						<div class="flex items-center justify-between w-full">
							<span class="font-semibold text-xs text-slate-800 dark:text-slate-200">
								Color completo
							</span>
							{#if currentStyle === 'full'}
								<CheckCircle2 class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							{/if}
						</div>

						<!-- Mini preview de Color Completo -->
						<div
							class="w-full rounded-xl px-2.5 py-2 shadow-2xs space-y-1 border"
							style="border-left: 3.5px solid #3b82f6; background-color: color-mix(in srgb, #3b82f6 14%, transparent); border-color: color-mix(in srgb, #3b82f6 35%, transparent);"
						>
							<div class="flex justify-between text-[10.5px] text-slate-600 dark:text-slate-300 font-sans tabular-nums font-medium tracking-tight">
								<span>09:30 – 11:30</span>
								<span class="rounded bg-indigo-600/20 px-1.5 py-0.5 text-[9px] text-indigo-700 dark:text-indigo-300 font-semibold">WORK</span>
							</div>
							<p class="text-xs font-semibold text-slate-900 dark:text-slate-100">Deep Work: Arquitectura</p>
						</div>

						<span class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
							Tarjeta completamente teñida con el color temático para un vistazo rápido.
						</span>
					</button>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
				<button
					type="button"
					onclick={() => (isOpen = false)}
					class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
				>
					Entendido
				</button>
			</div>
		</div>
	</div>
{/if}
