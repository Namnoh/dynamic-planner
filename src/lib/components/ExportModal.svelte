<script lang="ts">
	import { exportElementAsImage } from '$lib/utils/exportImage';
	import type { ExportImageOptions } from '$lib/types';
	import { toastStore } from '$lib/utils/notifications';
	import { Download, X, Image as ImageIcon, Loader2 } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		targetElement,
		defaultFilename = 'dynamic-planner-export'
	}: {
		isOpen: boolean;
		targetElement: HTMLElement | null;
		defaultFilename?: string;
	} = $props();

	let format = $state<'png' | 'jpeg' | 'webp'>('png');
	let scale = $state<number>(2); // 2x Retina default
	let quality = $state<number>(0.95);
	let isExporting = $state<boolean>(false);

	async function handleExport() {
		if (!targetElement) {
			toastStore.show({
				title: 'Error de exportación',
				message: 'No se encontró el contenedor a exportar.',
				type: 'error'
			});
			return;
		}

		isExporting = true;
		try {
			const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
			const options: ExportImageOptions = {
				format,
				scale,
				quality,
				filename: defaultFilename,
				backgroundColor: isDark ? '#0b0f19' : '#f8fafc'
			};

			await exportElementAsImage(targetElement, options);

			toastStore.show({
				title: '¡Imagen exportada!',
				message: `Archivo descargado en formato ${format.toUpperCase()} (${scale}x).`,
				type: 'success'
			});
			isOpen = false;
		} catch (error) {
			console.error('Error al exportar imagen:', error);
			toastStore.show({
				title: 'Error al exportar',
				message: 'No se pudo generar la imagen del horario.',
				type: 'error'
			});
		} finally {
			isExporting = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-5 transition-colors"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2.5">
					<div class="rounded-lg bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400">
						<ImageIcon class="h-5 w-5" />
					</div>
					<div>
						<h3 class="font-semibold text-lg">Exportar Horario</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400">Descarga una captura limpia de tu planificación</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (isOpen = false)}
					class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
					aria-label="Cerrar modal"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Format Selection -->
			<fieldset class="space-y-2 border-0 p-0 m-0">
				<legend class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
					Formato de Imagen
				</legend>
				<div class="grid grid-cols-3 gap-2">
					{#each ['png', 'jpeg', 'webp'] as fmt}
						<button
							type="button"
							class="flex flex-col items-center justify-center rounded-xl border py-2.5 px-3 text-xs font-medium transition-all cursor-pointer {format ===
							fmt
								? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 shadow-xs'
								: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-300'}"
							onclick={() => (format = fmt as any)}
						>
							<span class="font-bold text-sm uppercase">{fmt}</span>
							<span class="text-[10px] text-slate-500">
								{fmt === 'png' ? 'Sin pérdida' : fmt === 'webp' ? 'Ultra ligero' : 'Comprimido'}
							</span>
						</button>
					{/each}
				</div>
			</fieldset>

			<!-- Resolution / Scale -->
			<fieldset class="space-y-2 border-0 p-0 m-0">
				<legend class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
					Resolución & Nitidez
				</legend>
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="rounded-xl border py-2 px-3 text-xs font-medium transition-all cursor-pointer {scale === 1
							? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300'
							: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:border-slate-700'}"
						onclick={() => (scale = 1)}
					>
						<span class="font-semibold block text-sm">1x Estándar</span>
						<span class="text-[10px] text-slate-500">Tamaño real de pantalla</span>
					</button>
					<button
						type="button"
						class="rounded-xl border py-2 px-3 text-xs font-medium transition-all cursor-pointer {scale === 2
							? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300'
							: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:border-slate-700'}"
						onclick={() => (scale = 2)}
					>
						<span class="font-semibold block text-sm">2x Alta Definición (Retina)</span>
						<span class="text-[10px] text-slate-500">Ideal para fondos o imprimir</span>
					</button>
				</div>
			</fieldset>

			<!-- Compression quality (JPEG and WebP only) -->
			{#if format !== 'png'}
				<div class="space-y-1.5 animate-in fade-in duration-100">
					<div class="flex justify-between text-xs">
						<span class="font-medium text-slate-700 dark:text-slate-300">Calidad:</span>
						<span class="text-indigo-600 dark:text-indigo-400 font-semibold">{Math.round(quality * 100)}%</span>
					</div>
					<input
						type="range"
						min="0.5"
						max="1"
						step="0.05"
						bind:value={quality}
						class="w-full accent-indigo-600 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer h-1.5"
					/>
				</div>
			{/if}

			<!-- Info badge -->
			<div class="rounded-xl bg-slate-100 dark:bg-slate-800/60 p-3 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/80">
				💡 <strong class="text-slate-800 dark:text-slate-300">Modo Limpio Activo:</strong> Los botones de acción, menús y
				herramientas se ocultarán automáticamente durante la captura para una imagen perfecta.
			</div>

			<!-- Action buttons footer -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={() => (isOpen = false)}
					disabled={isExporting}
					class="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleExport}
					disabled={isExporting}
					class="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
				>
					{#if isExporting}
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Generando...</span>
					{:else}
						<Download class="h-4 w-4" />
						<span>Descargar {format.toUpperCase()}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
