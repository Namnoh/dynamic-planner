<script lang="ts">
	import { paletteStore, DEFAULT_COLORS } from '$lib/stores/palettes';
	import { toastStore } from '$lib/utils/notifications';
	import { Check, Plus, X, Palette, BookmarkPlus } from 'lucide-svelte';

	let {
		selectedColor = $bindable('#3b82f6'),
		label = 'Color'
	}: {
		selectedColor: string;
		label?: string;
	} = $props();

	let customHex = $state<string>(selectedColor);
	let customColors = $state<string[]>(paletteStore.current);

	$effect(() => {
		const unsubscribe = paletteStore.subscribe((colors) => {
			customColors = colors;
		});
		return unsubscribe;
	});

	// Sync local customHex when selectedColor is changed from outside
	$effect(() => {
		if (selectedColor && selectedColor.startsWith('#')) {
			customHex = selectedColor;
		}
	});

	function selectColor(hex: string) {
		selectedColor = hex;
		customHex = hex;
	}

	function handleHexInput(e: Event) {
		const val = (e.target as HTMLInputElement).value.trim();
		customHex = val;
		if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) {
			selectedColor = val.toLowerCase();
		}
	}

	function handleSaveToCustomPalette() {
		const normalized = customHex.trim().toLowerCase();
		if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
			toastStore.show({
				title: 'Color inválido',
				message: 'Ingresa un formato hexadecimal válido (ej: #3b82f6)',
				type: 'warning'
			});
			return;
		}

		const added = paletteStore.addColor(normalized);
		if (added) {
			toastStore.show({
				title: 'Color guardado',
				message: `Se añadió ${normalized.toUpperCase()} a tu paleta personalizada`,
				type: 'success',
				durationMs: 2500
			});
		} else {
			toastStore.show({
				title: 'Color existente',
				message: 'Este color ya se encuentra en tu paleta personalizada',
				type: 'info',
				durationMs: 2000
			});
		}
	}

	function handleRemoveCustomColor(e: MouseEvent, hex: string) {
		e.stopPropagation();
		paletteStore.removeColor(hex);
		toastStore.show({
			title: 'Color eliminado',
			message: `Se quitó ${hex.toUpperCase()} de tu paleta`,
			type: 'info',
			durationMs: 2000
		});
	}

	const isCustomHexSaved = $derived.by(() => {
		const current = customHex.trim().toLowerCase();
		return customColors.includes(current);
	});
</script>

<div class="space-y-2.5 w-full">
	<!-- Header row: Label & Current Active Color Chip -->
	<div class="flex items-center justify-between">
		<span class="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
			{label}
		</span>
		<div
			class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10.5px] font-sans font-medium tabular-nums shadow-2xs"
		>
			<span
				class="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shrink-0"
				style="background-color: {selectedColor};"
			></span>
			<span class="text-slate-700 dark:text-slate-200">{selectedColor.toUpperCase()}</span>
		</div>
	</div>

	<!-- Section 1: Default Presets -->
	<div>
		<span class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
			Predeterminados
		</span>
		<div class="flex flex-wrap items-center gap-1.5">
			{#each DEFAULT_COLORS as clr}
				<button
					type="button"
					onclick={() => selectColor(clr)}
					aria-label="Color predeterminado {clr}"
					class="relative h-6 w-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center {selectedColor.toLowerCase() === clr.toLowerCase()
						? 'border-indigo-600 dark:border-white scale-110 shadow-xs'
						: 'border-transparent opacity-85 hover:opacity-100 hover:scale-105'}"
					style="background-color: {clr};"
				>
					{#if selectedColor.toLowerCase() === clr.toLowerCase()}
						<Check class="h-3 w-3 text-white drop-shadow-xs stroke-[3]" />
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Section 2: Custom Saved Palette -->
	<div>
		<div class="flex items-center justify-between mb-1.5">
			<span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
				Mi Paleta Personalizada ({customColors.length})
			</span>
		</div>

		{#if customColors.length > 0}
			<div class="flex flex-wrap items-center gap-1.5">
				{#each customColors as clr}
					<div class="group relative inline-flex items-center">
						<button
							type="button"
							onclick={() => selectColor(clr)}
							aria-label="Color personalizado {clr}"
							class="relative h-6 w-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center {selectedColor.toLowerCase() === clr.toLowerCase()
								? 'border-indigo-600 dark:border-white scale-110 shadow-xs'
								: 'border-transparent opacity-85 hover:opacity-100 hover:scale-105'}"
							style="background-color: {clr};"
						>
							{#if selectedColor.toLowerCase() === clr.toLowerCase()}
								<Check class="h-3 w-3 text-white drop-shadow-xs stroke-[3]" />
							{/if}
						</button>

						<!-- Remove button on hover -->
						<button
							type="button"
							onclick={(e) => handleRemoveCustomColor(e, clr)}
							class="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs hover:bg-rose-600"
							title="Eliminar de mi paleta"
							aria-label="Eliminar color {clr} de mi paleta"
						>
							<X class="h-2 w-2 stroke-[3]" />
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-[11px] text-slate-400 dark:text-slate-500 italic py-0.5">
				Aún no tienes colores guardados. Elige uno abajo y guárdalo.
			</p>
		{/if}
	</div>

	<!-- Section 3: Custom Color Picker & Save Action -->
	<div class="pt-1 border-t border-slate-200 dark:border-slate-800">
		<span class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
			Personalizar Color (Selector / HEX)
		</span>

		<div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
			<!-- Native color input swatch -->
			<div class="relative shrink-0">
				<input
					type="color"
					bind:value={customHex}
					oninput={(e) => {
						const val = (e.target as HTMLInputElement).value;
						selectColor(val);
					}}
					class="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 transition-colors"
					title="Abrir selector de color nativo"
					aria-label="Selector de color"
				/>
			</div>

			<!-- HEX text input -->
			<div class="relative flex-1 min-w-[100px]">
				<input
					type="text"
					value={customHex}
					oninput={handleHexInput}
					placeholder="#3b82f6"
					maxlength="7"
					class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono uppercase text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
				/>
			</div>

			<!-- Button to Save to Custom Palette -->
			<button
				type="button"
				onclick={handleSaveToCustomPalette}
				disabled={isCustomHexSaved}
				class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed {isCustomHexSaved
					? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
					: 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30'}"
				title={isCustomHexSaved ? 'Este color ya está en tu paleta' : 'Guardar este color en tu paleta personalizada'}
			>
				<BookmarkPlus class="h-3.5 w-3.5" />
				<span>{isCustomHexSaved ? 'Guardado' : 'Guardar a mi paleta'}</span>
			</button>
		</div>
	</div>
</div>
