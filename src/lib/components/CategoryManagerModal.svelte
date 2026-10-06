<script lang="ts">
	import { categoriesStore } from '$lib/stores/categories';
	import type { CustomCategory } from '$lib/types';
	import { toastStore } from '$lib/utils/notifications';
	import Modal from './Modal.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { Tag, Plus, Pencil, Trash2, RotateCcw } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		onCategoryCreated = undefined
	}: {
		isOpen: boolean;
		onCategoryCreated?: (created: CustomCategory) => void;
	} = $props();

	let categories = $state<CustomCategory[]>(categoriesStore.current);
	let isCreating = $state(false);
	let editingId = $state<string | null>(null);
	let name = $state('');
	let color = $state('#3b82f6');
	let error = $state('');

	$effect(() => {
		const unsubscribe = categoriesStore.subscribe((cats) => {
			categories = cats;
		});
		return unsubscribe;
	});

	function handleStartCreate() {
		editingId = null;
		name = '';
		color = '#3b82f6';
		error = '';
		isCreating = true;
	}

	function handleStartEdit(cat: CustomCategory) {
		editingId = cat.id;
		name = cat.name;
		color = cat.color;
		error = '';
		isCreating = true;
	}

	function handleCancel() {
		isCreating = false;
		editingId = null;
		name = '';
		error = '';
	}

	async function handleSave() {
		const trimmed = name.trim();
		if (!trimmed) {
			error = 'El nombre de la categoría es obligatorio';
			return;
		}

		// Check for duplicate names (excluding the one being edited)
		const exists = categories.some(
			(c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editingId
		);
		if (exists) {
			error = 'Ya existe una categoría con ese nombre';
			return;
		}

		if (editingId) {
			await categoriesStore.updateCategory(editingId, { name: trimmed, color });
			toastStore.show({
				title: 'Categoría actualizada',
				type: 'success'
			});
		} else {
			const newCat = await categoriesStore.addCategory(trimmed, color);
			toastStore.show({
				title: 'Categoría creada con éxito',
				type: 'success'
			});
			onCategoryCreated?.(newCat);
		}

		handleCancel();
	}

	async function handleDelete(cat: CustomCategory) {
		if (categories.length <= 1) {
			toastStore.show({
				title: 'No se puede eliminar',
				message: 'Debes mantener al menos una categoría en el sistema.',
				type: 'error'
			});
			return;
		}

		await categoriesStore.deleteCategory(cat.id);
		toastStore.show({
			title: 'Categoría eliminada',
			message: `"${cat.name}" ha sido eliminada.`,
			type: 'info'
		});
	}

	async function handleResetDefaults() {
		if (confirm('¿Restablecer las categorías a los valores predeterminados? Se perderán las categorías personalizadas creadas.')) {
			await categoriesStore.resetToDefaults();
			toastStore.show({
				title: 'Categorías restablecidas',
				type: 'success'
			});
		}
	}
</script>

<Modal
	bind:isOpen
	title="Gestionar Categorías"
	description="Crea, personaliza o edita las etiquetas de categorías y sus colores"
	icon={Tag}
	maxWidth="max-w-md"
>
	{#snippet children()}
		<div class="space-y-4 text-xs">
			<!-- Header Action: Create button -->
			<div class="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
				<span class="font-medium text-slate-700 dark:text-slate-300">
					{categories.length} categoría{categories.length === 1 ? '' : 's'} disponible{categories.length === 1 ? '' : 's'}
				</span>
				{#if !isCreating}
					<button
						type="button"
						onclick={handleStartCreate}
						class="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-2xs cursor-pointer"
					>
						<Plus class="h-3.5 w-3.5" />
						<span>Nueva Categoría</span>
					</button>
				{/if}
			</div>

			<!-- Inline Creator / Editor Form -->
			{#if isCreating}
				<div class="rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5 space-y-3">
					<div class="flex items-center justify-between">
						<span class="font-bold text-indigo-950 dark:text-indigo-200">
							{editingId ? 'Editar Categoría' : 'Nueva Categoría Personalizada'}
						</span>
					</div>

					<div>
						<label for="cat-name-input" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
							Nombre de la Categoría <span class="text-rose-500 font-bold ml-0.5">*</span>
						</label>
						<input
							id="cat-name-input"
							type="text"
							bind:value={name}
							oninput={() => { if (error) error = ''; }}
							placeholder="Ej: Gym, Finanzas, Universidad..."
							class="w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {error
								? 'border-rose-500 focus:border-rose-500'
								: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
						/>
						{#if error}
							<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400">
								{error}
							</p>
						{/if}
					</div>

					<ColorPicker bind:selectedColor={color} label="Color de la Categoría" />

					<div class="flex justify-end gap-2 pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
						<button
							type="button"
							onclick={handleCancel}
							class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="button"
							onclick={handleSave}
							class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs cursor-pointer"
						>
							{editingId ? 'Actualizar' : 'Guardar'}
						</button>
					</div>
				</div>
			{/if}

			<!-- Categories List -->
			<div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
				{#each categories as cat (cat.id)}
					<div
						class="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
					>
						<div class="flex items-center gap-2.5 min-w-0 pr-2">
							<span
								class="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs"
								style="background-color: {cat.color};"
							></span>
							<span class="font-medium text-slate-900 dark:text-slate-100 truncate">
								{cat.name}
							</span>
						</div>

						<div class="flex items-center gap-1 shrink-0">
							<button
								type="button"
								onclick={() => handleStartEdit(cat)}
								class="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
								title="Editar categoría"
							>
								<Pencil class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onclick={() => handleDelete(cat)}
								class="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
								title="Eliminar categoría"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Footer helper: Reset to defaults -->
			<div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px]">
				<span class="text-slate-400 dark:text-slate-500">Total: {categories.length} categorías</span>
				<button
					type="button"
					onclick={handleResetDefaults}
					class="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
					title="Restablecer a las categorías predeterminadas del sistema"
				>
					<RotateCcw class="h-3 w-3" />
					<span>Restablecer predeterminadas</span>
				</button>
			</div>
		</div>
	{/snippet}

	{#snippet footerSnippet()}
		<div class="flex justify-end w-full">
			<button
				type="button"
				onclick={() => (isOpen = false)}
				class="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
			>
				Cerrar
			</button>
		</div>
	{/snippet}
</Modal>
