<script lang="ts">
	import { db } from '$lib/db';
	import { type ActivityTemplate, type DayTemplate, type DayTemplateBlock, type ScheduledEventSubtask, type CategoryOption, type CustomCategory } from '$lib/types';
	import { categoriesStore } from '$lib/stores/categories';
	import { toastStore } from '$lib/utils/notifications';
	import ColorPicker from './ColorPicker.svelte';
	import SearchableSelect from './SearchableSelect.svelte';
	import ChecklistEditor from './ChecklistEditor.svelte';
	import CategoryManagerModal from './CategoryManagerModal.svelte';
	import { Plus, Trash2, Clock, Layers, Tag, Pencil, ArrowUpDown, ListChecks } from 'lucide-svelte';

	let { onTemplatesUpdated }: { onTemplatesUpdated?: () => void } = $props();

	let activities = $state<ActivityTemplate[]>([]);
	let dayTemplates = $state<DayTemplate[]>([]);
	let isCategoryModalOpen = $state(false);
	let categoryOptions = $state<CategoryOption[]>(categoriesStore.options);
	let categoriesList = $state<CustomCategory[]>(categoriesStore.current);

	$effect(() => {
		const unsubscribe = categoriesStore.subscribe((cats) => {
			categoriesList = cats;
			categoryOptions = categoriesStore.options;
		});
		return unsubscribe;
	});

	// Activity Form State (Creation & Editing)
	let isCreatingActivity = $state(false);
	let editingActivityId = $state<string | null>(null);
	let actTitle = $state('');
	let actCategory = $state('');
	let actDuration = $state(60);
	let actColor = $state('#3b82f6');
	let actNotes = $state('');
	let actSubtasks = $state<ScheduledEventSubtask[]>([]);
	let activityErrors = $state<{ title?: string; duration?: string }>({});

	// Day Template Form State (Creation & Editing)
	let isCreatingDayTemplate = $state(false);
	let editingDayTemplateId = $state<string | null>(null);
	let tplName = $state('');
	let tplDescription = $state('');
	let tplBlocks = $state<DayTemplateBlock[]>([]);
	let dayTemplateErrors = $state<{ name?: string; blocks?: string }>({});

	// Block Form State (for inserting or updating a block within the template)
	let editingBlockIndex = $state<number | null>(null);
	let selectedActivityIdForBlock = $state('');
	let blockStartTime = $state('09:00');
	let blockDuration = $state(60);
	let blockCustomTitle = $state('');
	let blockErrors = $state<{ activityId?: string; startTime?: string; duration?: string }>({});

	const blockActivityOptions = $derived.by(() =>
		activities.map((act) => ({
			value: act.id,
			label: act.title,
			sublabel: `${act.defaultDuration} min${act.category ? ` • ${act.category}` : ''}`,
			color: act.color
		}))
	);

	async function loadData() {
		activities = await db.activityTemplates.toArray();
		dayTemplates = await db.dayTemplates.toArray();
		if (activities.length > 0 && !selectedActivityIdForBlock) {
			selectedActivityIdForBlock = activities[0].id;
			blockDuration = activities[0].defaultDuration;
		}
	}

	$effect(() => {
		loadData();
	});

	function handleStartCreateActivity() {
		editingActivityId = null;
		actTitle = '';
		actCategory = '';
		actDuration = 60;
		actColor = '#3b82f6';
		actNotes = '';
		actSubtasks = [];
		activityErrors = {};
		isCreatingActivity = true;
	}

	function handleStartEditActivity(act: ActivityTemplate) {
		editingActivityId = act.id;
		actTitle = act.title;
		actCategory = act.category || '';
		actDuration = act.defaultDuration;
		actColor = act.color;
		actNotes = act.notes || '';
		actSubtasks = (act.subtasks || []).map((st, i) => ({
			id: `act-st-${i}`,
			title: st,
			completed: false
		}));
		activityErrors = {};
		isCreatingActivity = true;

		if (typeof document !== 'undefined') {
			setTimeout(() => {
				const formEl = document.getElementById('activity-template-form');
				formEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}, 50);
		}
	}

	function handleToggleActivityForm() {
		if (isCreatingActivity) {
			isCreatingActivity = false;
			editingActivityId = null;
			actTitle = '';
			actCategory = '';
			actNotes = '';
			actSubtasks = [];
			activityErrors = {};
		} else {
			handleStartCreateActivity();
		}
	}

	async function handleSaveActivity() {
		activityErrors = {};
		let hasError = false;

		if (!actTitle.trim()) {
			activityErrors.title = 'Este campo es requerido';
			hasError = true;
		}

		if (!actDuration || Number(actDuration) < 1) {
			activityErrors.duration = 'Este campo es requerido';
			hasError = true;
		}

		if (hasError) return;

		const cleanSubtasks = actSubtasks.map((s) => s.title.trim()).filter(Boolean);

		if (editingActivityId) {
			await db.activityTemplates.update(editingActivityId, $state.snapshot({
				title: actTitle.trim(),
				category: actCategory || undefined,
				defaultDuration: Number(actDuration),
				color: actColor,
				notes: actNotes.trim() || undefined,
				subtasks: cleanSubtasks.length > 0 ? cleanSubtasks : undefined
			}));
			toastStore.show({
				title: 'Bloque de actividad actualizado',
				type: 'success'
			});
		} else {
			const id = crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}`;
			const newAct: ActivityTemplate = {
				id,
				title: actTitle.trim(),
				category: actCategory || undefined,
				defaultDuration: Number(actDuration),
				color: actColor,
				notes: actNotes.trim() || undefined,
				subtasks: cleanSubtasks.length > 0 ? cleanSubtasks : undefined
			};

			await db.activityTemplates.add($state.snapshot(newAct));
			toastStore.show({
				title: 'Bloque base creado',
				type: 'success'
			});
		}

		isCreatingActivity = false;
		editingActivityId = null;
		actTitle = '';
		actCategory = '';
		actNotes = '';
		actSubtasks = [];
		activityErrors = {};
		await loadData();
		onTemplatesUpdated?.();
	}

	async function handleDeleteActivity(id: string) {
		await db.activityTemplates.delete(id);
		if (editingActivityId === id) {
			isCreatingActivity = false;
			editingActivityId = null;
			actTitle = '';
			actCategory = '';
			actNotes = '';
			activityErrors = {};
		}
		toastStore.show({ title: 'Actividad eliminada', type: 'info' });
		await loadData();
		onTemplatesUpdated?.();
	}

	function handleStartCreateDayTemplate() {
		editingDayTemplateId = null;
		tplName = '';
		tplDescription = '';
		tplBlocks = [];
		editingBlockIndex = null;
		blockCustomTitle = '';
		dayTemplateErrors = {};
		blockErrors = {};
		isCreatingDayTemplate = true;
	}

	function handleStartEditDayTemplate(tpl: DayTemplate) {
		editingDayTemplateId = tpl.id;
		tplName = tpl.name;
		tplDescription = tpl.description || '';
		tplBlocks = tpl.blocks.map((b) => ({ ...b }));
		editingBlockIndex = null;
		blockCustomTitle = '';
		dayTemplateErrors = {};
		blockErrors = {};
		isCreatingDayTemplate = true;

		if (typeof window !== 'undefined') {
			setTimeout(() => {
				const builderElem = document.getElementById('day-template-builder');
				if (builderElem) {
					builderElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			}, 50);
		}
	}

	function handleToggleDayTemplateBuilder() {
		if (isCreatingDayTemplate) {
			isCreatingDayTemplate = false;
			editingDayTemplateId = null;
			tplName = '';
			tplDescription = '';
			tplBlocks = [];
			editingBlockIndex = null;
			blockCustomTitle = '';
			dayTemplateErrors = {};
			blockErrors = {};
		} else {
			handleStartCreateDayTemplate();
		}
	}

	function handleAddOrUpdateBlock() {
		blockErrors = {};
		let hasError = false;

		if (!selectedActivityIdForBlock) {
			blockErrors.activityId = 'Este campo es requerido';
			hasError = true;
		}

		if (!blockStartTime) {
			blockErrors.startTime = 'Este campo es requerido';
			hasError = true;
		}

		if (!blockDuration || Number(blockDuration) < 1) {
			blockErrors.duration = 'Este campo es requerido';
			hasError = true;
		}

		if (hasError) return;

		const blockData: DayTemplateBlock = {
			activityId: selectedActivityIdForBlock,
			startTime: blockStartTime,
			duration: Number(blockDuration),
			customTitle: blockCustomTitle.trim() || undefined
		};

		if (editingBlockIndex !== null && editingBlockIndex >= 0 && editingBlockIndex < tplBlocks.length) {
			tplBlocks[editingBlockIndex] = blockData;
			editingBlockIndex = null;
			toastStore.show({ title: 'Bloque actualizado en la secuencia', type: 'info' });
		} else {
			tplBlocks.push(blockData);
			// Auto increment start time for convenience
			const [h, m] = blockStartTime.split(':').map(Number);
			const totalMin = h * 60 + m + Number(blockDuration);
			const nextH = Math.floor(totalMin / 60) % 24;
			const nextM = totalMin % 60;
			blockStartTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
		}

		blockCustomTitle = '';
		blockErrors = {};
		if (dayTemplateErrors.blocks) dayTemplateErrors.blocks = '';
	}

	function handleStartEditBlock(index: number) {
		const blk = tplBlocks[index];
		if (!blk) return;
		editingBlockIndex = index;
		selectedActivityIdForBlock = blk.activityId;
		blockStartTime = blk.startTime;
		blockDuration = blk.duration;
		blockCustomTitle = blk.customTitle || '';
		blockErrors = {};
	}

	function handleCancelEditBlock() {
		editingBlockIndex = null;
		blockCustomTitle = '';
		blockErrors = {};
	}

	function handleRemoveBlockFromTemplate(index: number) {
		if (editingBlockIndex === index) {
			editingBlockIndex = null;
			blockCustomTitle = '';
		} else if (editingBlockIndex !== null && editingBlockIndex > index) {
			editingBlockIndex -= 1;
		}
		tplBlocks = tplBlocks.filter((_, i) => i !== index);
	}

	function handleSortBlocksByTime() {
		tplBlocks = [...tplBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
		editingBlockIndex = null;
	}

	async function handleSaveDayTemplate() {
		dayTemplateErrors = {};
		let hasError = false;

		if (!tplName.trim()) {
			dayTemplateErrors.name = 'Este campo es requerido';
			hasError = true;
		}
		if (tplBlocks.length === 0) {
			dayTemplateErrors.blocks = 'Debes agregar al menos un bloque a la plantilla';
			toastStore.show({
				title: 'Agrega al menos un bloque a la plantilla',
				message: 'No puedes guardar una plantilla de día sin bloques.',
				type: 'error'
			});
			hasError = true;
		}

		if (hasError) return;

		const cleanBlocks: DayTemplateBlock[] = $state.snapshot(tplBlocks).map((b) => ({
			activityId: b.activityId,
			startTime: b.startTime,
			duration: Number(b.duration),
			customTitle: b.customTitle ? b.customTitle.trim() : undefined
		}));

		if (editingDayTemplateId) {
			const updatedTpl: DayTemplate = {
				id: editingDayTemplateId,
				name: tplName.trim(),
				description: tplDescription.trim() || undefined,
				blocks: cleanBlocks
			};
			await db.dayTemplates.put($state.snapshot(updatedTpl));
			toastStore.show({
				title: 'Plantilla de Día actualizada con éxito',
				type: 'success'
			});
		} else {
			const id = crypto.randomUUID ? crypto.randomUUID() : `tpl-${Date.now()}`;
			const newTpl: DayTemplate = {
				id,
				name: tplName.trim(),
				description: tplDescription.trim() || undefined,
				blocks: cleanBlocks
			};
			await db.dayTemplates.add($state.snapshot(newTpl));
			toastStore.show({
				title: 'Plantilla de Día creada con éxito',
				type: 'success'
			});
		}

		isCreatingDayTemplate = false;
		editingDayTemplateId = null;
		tplName = '';
		tplDescription = '';
		tplBlocks = [];
		editingBlockIndex = null;
		blockCustomTitle = '';
		dayTemplateErrors = {};
		blockErrors = {};
		await loadData();
		onTemplatesUpdated?.();
	}

	async function handleDeleteDayTemplate(id: string) {
		await db.dayTemplates.delete(id);
		if (editingDayTemplateId === id) {
			isCreatingDayTemplate = false;
			editingDayTemplateId = null;
			tplName = '';
			tplDescription = '';
			tplBlocks = [];
			editingBlockIndex = null;
			blockCustomTitle = '';
			dayTemplateErrors = {};
			blockErrors = {};
		}
		toastStore.show({ title: 'Plantilla eliminada', type: 'info' });
		await loadData();
		onTemplatesUpdated?.();
	}
</script>

<div class="space-y-8 w-full">
	<!-- Section 1: Modular Day Templates -->
	<section
		class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 shadow-md dark:shadow-xl backdrop-blur-md space-y-6 transition-colors"
	>
		<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
			<div>
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
					<Layers class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					Plantillas de Día Modulares
				</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Ensambla rutinas completas pre-armadas ("Día Enfoque", "Día Balance", etc.) para aplicar con un solo clic.
				</p>
			</div>

			<button
				type="button"
				onclick={handleToggleDayTemplateBuilder}
				class="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md cursor-pointer"
			>
				<Plus class="h-4 w-4" />
				<span class="hidden sm:inline-block">
					{#if isCreatingDayTemplate}
						{editingDayTemplateId ? 'Cancelar Edición' : 'Cerrar Creador'}
					{:else}
						Nueva Plantilla de Día
					{/if}
				</span>
			</button>
		</div>

		<!-- Visual Day Template Builder -->
		{#if isCreatingDayTemplate}
			<div
				id="day-template-builder"
				class="rounded-2xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-slate-900/90 p-5 space-y-5 animate-in fade-in duration-200"
			>
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
						{#if editingDayTemplateId}
							<Pencil class="h-4 w-4" />
							<span>Editar Rutina Diaria</span>
						{:else}
							<Layers class="h-4 w-4" />
							<span>Constructor de Rutina Diaria</span>
						{/if}
					</h4>
					{#if editingDayTemplateId}
						<span class="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 rounded-lg px-2.5 py-0.5">
							Modo Edición
						</span>
					{/if}
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
					<div>
						<label for="tpl-name-input" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
							Nombre de la Plantilla <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
						</label>
						<input
							id="tpl-name-input"
							type="text"
							bind:value={tplName}
							oninput={() => { if (dayTemplateErrors.name) dayTemplateErrors.name = ''; }}
							placeholder="Ej: Día Enfoque Remoto"
							class="w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {dayTemplateErrors.name
								? 'border-rose-500 focus:border-rose-500'
								: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
						/>
						{#if dayTemplateErrors.name}
							<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
								{dayTemplateErrors.name}
							</p>
						{/if}
					</div>
					<div>
						<label for="tpl-desc-input" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
							Descripción <span class="text-slate-400 dark:text-slate-500 font-normal text-[10px] ml-1">(Opcional)</span>
						</label>
						<input
							id="tpl-desc-input"
							type="text"
							bind:value={tplDescription}
							placeholder="Ej: Enfoque matutino, código en la tarde y deporte."
							class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
				</div>

				<!-- Add/Edit Block in Template -->
				<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 p-4 space-y-3">
					<div class="flex items-center justify-between">
						<h5 class="text-xs font-semibold text-slate-700 dark:text-slate-300">
							{editingBlockIndex !== null ? 'Modificar Bloque en la Secuencia' : 'Añadir Bloque de Tiempo a la Secuencia'}
						</h5>
						{#if editingBlockIndex !== null}
							<button
								type="button"
								onclick={handleCancelEditBlock}
								class="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
							>
								Cancelar modificación de bloque
							</button>
						{/if}
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-start">
						<div class="lg:col-span-2">
							<label for="block-act-select" class="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
								Actividad Base <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
							</label>
							<SearchableSelect
								id="block-act-select"
								bind:value={selectedActivityIdForBlock}
								options={blockActivityOptions}
								placeholder="Seleccionar actividad..."
								searchPlaceholder="Buscar actividad..."
								buttonClass={blockErrors.activityId ? 'border-rose-500 focus:border-rose-500' : ''}
								onchange={(val) => {
									if (blockErrors.activityId) blockErrors.activityId = '';
									const found = activities.find((a) => a.id === val);
									if (found && editingBlockIndex === null) {
										blockDuration = found.defaultDuration;
									}
								}}
							/>
							{#if blockErrors.activityId}
								<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
									{blockErrors.activityId}
								</p>
							{/if}
						</div>
						<div>
							<label for="block-start-input" class="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
								Hora Inicio <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
							</label>
							<input
								id="block-start-input"
								type="time"
								bind:value={blockStartTime}
								oninput={() => { if (blockErrors.startTime) blockErrors.startTime = ''; }}
								class="w-full rounded-lg border bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden transition-colors {blockErrors.startTime
									? 'border-rose-500 focus:border-rose-500'
									: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
							/>
							{#if blockErrors.startTime}
								<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
									{blockErrors.startTime}
								</p>
							{/if}
						</div>
						<div>
							<label for="block-dur-input" class="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
								Duración (min) <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
							</label>
							<input
								id="block-dur-input"
								type="number"
								min="15"
								step="15"
								bind:value={blockDuration}
								oninput={() => { if (blockErrors.duration) blockErrors.duration = ''; }}
								class="w-full rounded-lg border bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden transition-colors {blockErrors.duration
									? 'border-rose-500 focus:border-rose-500'
									: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
							/>
							{#if blockErrors.duration}
								<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
									{blockErrors.duration}
								</p>
							{/if}
						</div>
						<div class="flex items-center pt-5 sm:pt-5.5">
							<button
								type="button"
								onclick={handleAddOrUpdateBlock}
								class="w-full rounded-lg {editingBlockIndex !== null ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'} py-1.5 text-xs font-medium text-white transition-all cursor-pointer shadow-xs"
							>
								{editingBlockIndex !== null ? 'Guardar Bloque' : '+ Insertar Bloque'}
							</button>
						</div>
					</div>

					<div>
						<label for="block-custom-title-input" class="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
							Título específico del bloque <span class="text-slate-400 dark:text-slate-500 font-normal text-[10px] ml-1">(Opcional, sobreescribe el nombre base)</span>
						</label>
						<input
							id="block-custom-title-input"
							type="text"
							bind:value={blockCustomTitle}
							placeholder="Ej: Sprint de backend prioritario, Clase de matemáticas..."
							class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
				</div>

				<!-- Assembled Blocks List -->
				{#if tplBlocks.length > 0}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Secuencia Ensamblada ({tplBlocks.length} bloques):</span>
							<button
								type="button"
								onclick={handleSortBlocksByTime}
								class="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
								title="Ordenar bloques cronológicamente"
							>
								<ArrowUpDown class="h-3 w-3" />
								<span>Ordenar por hora</span>
							</button>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{#each tplBlocks as blk, idx}
								<div class="flex items-center justify-between rounded-xl border bg-white dark:bg-slate-800/80 p-2.5 text-xs shadow-xs transition-all {editingBlockIndex === idx
									? 'border-amber-500 ring-2 ring-amber-500/30'
									: 'border-slate-200 dark:border-slate-800'}">
									<div class="min-w-0 pr-2">
										<span class="font-sans tabular-nums font-semibold text-indigo-600 dark:text-indigo-400 tracking-tight">{blk.startTime}</span>
										<span class="text-slate-500 dark:text-slate-400 text-[10px]">({blk.duration}m)</span>
										<p class="font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
											{blk.customTitle || activities.find((a) => a.id === blk.activityId)?.title || 'Bloque'}
										</p>
									</div>
									<div class="flex items-center gap-0.5 shrink-0">
										<button
											type="button"
											onclick={() => handleStartEditBlock(idx)}
											class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
											title="Modificar este bloque"
										>
											<Pencil class="h-3.5 w-3.5" />
										</button>
										<button
											type="button"
											onclick={() => handleRemoveBlockFromTemplate(idx)}
											class="p-1 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
											title="Quitar bloque"
										>
											<Trash2 class="h-3.5 w-3.5" />
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="rounded-xl border border-dashed p-4 text-center transition-colors {dayTemplateErrors.blocks
						? 'border-rose-400 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20'
						: 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'}">
						<p class="text-xs font-medium {dayTemplateErrors.blocks ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">
							{dayTemplateErrors.blocks || 'Aún no has agregado bloques a esta plantilla. Configura los datos arriba y presiona "+ Insertar Bloque".'}
						</p>
					</div>
				{/if}

				<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
					<div class="text-[11px]">
						{#if tplBlocks.length === 0}
							<span class="text-amber-600 dark:text-amber-400 font-medium">
								⚠️ Agrega al menos 1 bloque para poder guardar
							</span>
						{:else}
							<span class="text-slate-500 dark:text-slate-400">
								{tplBlocks.length} bloque{tplBlocks.length === 1 ? '' : 's'} en la plantilla
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => {
								isCreatingDayTemplate = false;
								editingDayTemplateId = null;
								tplName = '';
								tplDescription = '';
								tplBlocks = [];
								editingBlockIndex = null;
								blockCustomTitle = '';
								dayTemplateErrors = {};
								blockErrors = {};
							}}
							class="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="button"
							onclick={handleSaveDayTemplate}
							disabled={tplBlocks.length === 0}
							class="rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-md transition-all {tplBlocks.length === 0
								? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
								: 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'}"
							title={tplBlocks.length === 0 ? 'Debes agregar al menos un bloque a la plantilla' : undefined}
						>
							{editingDayTemplateId ? 'Actualizar Plantilla de Día' : 'Guardar Plantilla de Día'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Grid of Existing Day Templates -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each dayTemplates as tpl}
				<div class="flex flex-col justify-between rounded-2xl border bg-slate-50/70 dark:bg-slate-900/40 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs {editingDayTemplateId === tpl.id
					? 'border-indigo-500 ring-2 ring-indigo-500/20'
					: 'border-slate-200 dark:border-slate-800'}">
					<div class="space-y-2">
						<div class="flex items-start justify-between gap-2">
							<div>
								<h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">{tpl.name}</h4>
								{#if editingDayTemplateId === tpl.id}
									<span class="inline-block mt-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded px-1.5 py-0.5">
										En edición
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-1">
								<button
									type="button"
									onclick={() => handleStartEditDayTemplate(tpl)}
									class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 cursor-pointer transition-colors"
									title="Editar plantilla"
								>
									<Pencil class="h-4 w-4" />
								</button>
								<button
									type="button"
									onclick={() => handleDeleteDayTemplate(tpl.id)}
									class="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
									title="Eliminar plantilla"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</div>
						{#if tpl.description}
							<p class="text-xs text-slate-600 dark:text-slate-400">{tpl.description}</p>
						{/if}
						<div class="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
							<Clock class="h-3 w-3" />
							<span>{tpl.blocks.length} bloques programados</span>
						</div>
					</div>

					<div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap gap-1">
						{#each tpl.blocks.slice(0, 4) as b}
							<span class="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent px-2 py-0.5 text-[10px] font-sans tabular-nums font-medium tracking-tight text-slate-700 dark:text-slate-300">
								{b.startTime} ({b.duration}m)
							</span>
						{/each}
						{#if tpl.blocks.length > 4}
							<span class="rounded-md bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500">
								+{tpl.blocks.length - 4} más
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Section 2: Base Activity Template Catalog -->
	<section
		class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 shadow-md dark:shadow-xl backdrop-blur-md space-y-6 transition-colors"
	>
		<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
			<div>
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
					<Tag class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					Bloques de Actividad
				</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Bloques personalizables (categoría, duración habitual, color) para reutilizar en cualquier día.
				</p>
			</div>

			<button
				type="button"
				onclick={handleToggleActivityForm}
				class="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer"
			>
				<Plus class="h-4 w-4" />
				<span class="hidden sm:inline-block">
					{#if isCreatingActivity}
						{editingActivityId ? 'Cancelar Edición' : 'Cerrar'}
					{:else}
						Crear Bloque
					{/if}
				</span>
			</button>
		</div>

		{#if isCreatingActivity}
			<div
				id="activity-template-form"
				class="rounded-2xl border {editingActivityId
					? 'border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/30 dark:bg-slate-900/90'
					: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90'} p-5 space-y-4 animate-in fade-in duration-200"
			>
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
						{#if editingActivityId}
							<Pencil class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							<span>Editar Bloque de Actividad</span>
						{:else}
							<Plus class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							<span>Nuevo Bloque Base</span>
						{/if}
					</h4>
					{#if editingActivityId}
						<span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
							Modo Edición
						</span>
					{/if}
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
					<div>
						<label for="act-title-input" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
							Título <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
						</label>
						<input
							id="act-title-input"
							type="text"
							bind:value={actTitle}
							oninput={() => { if (activityErrors.title) activityErrors.title = ''; }}
							placeholder="Ej: Sprint de Programación"
							class="w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {activityErrors.title
								? 'border-rose-500 focus:border-rose-500'
								: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
						/>
						{#if activityErrors.title}
							<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
								{activityErrors.title}
							</p>
						{/if}
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="act-cat-select" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
								Categoría
							</label>
							<div class="flex items-center gap-1.5">
								<button
									type="button"
									onclick={() => (isCategoryModalOpen = true)}
									class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
								>
									+ Gestionar
								</button>
								<span class="text-slate-300 dark:text-slate-700">•</span>
								<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
							</div>
						</div>
						<SearchableSelect
							id="act-cat-select"
							bind:value={actCategory}
							options={categoryOptions}
							placeholder="Sin categoría (Opcional)"
							searchPlaceholder="Buscar categoría..."
						/>
					</div>
					<div>
						<label for="act-dur-input" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
							Duración habitual (min) <span class="text-rose-500 font-bold ml-0.5" title="Obligatorio">*</span>
						</label>
						<input
							id="act-dur-input"
							type="number"
							step="15"
							min="15"
							bind:value={actDuration}
							oninput={() => { if (activityErrors.duration) activityErrors.duration = ''; }}
							class="w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden transition-colors {activityErrors.duration
								? 'border-rose-500 focus:border-rose-500'
								: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'}"
						/>
						{#if activityErrors.duration}
							<p class="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-in fade-in duration-150">
								{activityErrors.duration}
							</p>
						{/if}
					</div>
				</div>

				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="act-notes-input" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
							Notas o descripción del bloque
						</label>
						<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Opcional</span>
					</div>
					<input
						id="act-notes-input"
						type="text"
						bind:value={actNotes}
						placeholder="Ej: Preparar apuntes, modo avión, hidratación..."
						class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden transition-colors"
					/>
				</div>

				<ChecklistEditor
					bind:items={actSubtasks}
					allowCompletion={false}
					label="Checklist / Tareas base"
					placeholder="Ej: Calentamiento 10 min, Práctica..."
				/>

				<ColorPicker bind:selectedColor={actColor} label="Color de la Actividad" />

				<div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => {
							isCreatingActivity = false;
							editingActivityId = null;
							actTitle = '';
							actCategory = '';
							actNotes = '';
							actSubtasks = [];
							activityErrors = {};
						}}
						class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={handleSaveActivity}
						class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md cursor-pointer transition-colors"
					>
						{editingActivityId ? 'Actualizar Bloque' : 'Guardar Bloque'}
					</button>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
			{#each activities as act}
				<div
					class="flex items-center justify-between rounded-xl border p-3 transition-all shadow-xs {editingActivityId === act.id
						? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/40'
						: 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'}"
					style="border-left: 4px solid {act.color};"
				>
					<div class="space-y-0.5 min-w-0 pr-2">
						<h5 class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{act.title}</h5>
						<div class="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
							{#if act.category}
								{@const cat = categoriesStore.getCategory(act.category)}
								<span
									class="uppercase tracking-wider font-bold text-[9px] px-1.5 py-0.5 rounded"
									style={cat?.color
										? `color: ${cat.color}; background-color: color-mix(in srgb, ${cat.color} 15%, transparent);`
										: ''}
								>
									{cat?.name || act.category}
								</span>
								<span>•</span>
							{/if}
							<span>{act.defaultDuration} min</span>
						</div>
						{#if act.notes}
							<p class="text-[10px] text-slate-400 dark:text-slate-500 truncate">{act.notes}</p>
						{/if}
						{#if act.subtasks && act.subtasks.length > 0}
							<div class="flex items-center gap-1 text-[9.5px] text-indigo-600 dark:text-indigo-400 font-medium pt-0.5">
								<ListChecks class="h-3 w-3" />
								<span>{act.subtasks.length} {act.subtasks.length === 1 ? 'tarea' : 'tareas'}</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-0.5 shrink-0">
						<button
							type="button"
							onclick={() => handleStartEditActivity(act)}
							class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 cursor-pointer transition-colors"
							title="Editar bloque de actividad"
						>
							<Pencil class="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							onclick={() => handleDeleteActivity(act.id)}
							class="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
							title="Eliminar bloque base"
						>
							<Trash2 class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Section 3: Custom Categories Management -->
	<section class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
			<div class="space-y-0.5">
				<div class="flex items-center gap-2">
					<Tag class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
					<h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Categorías Personalizadas</h3>
				</div>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Etiquetas y colores asignados a tus bloques de tiempo y actividades.
				</p>
			</div>

			<button
				type="button"
				onclick={() => (isCategoryModalOpen = true)}
				class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
			>
				<Tag class="h-3.5 w-3.5" />
				<span>Gestionar Categorías ({categoriesList.length})</span>
			</button>
		</div>

		<!-- Chips of current categories -->
		<div class="flex flex-wrap gap-2 pt-1">
			{#each categoriesList as cat}
				<div
					class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shadow-2xs"
				>
					<span
						class="h-3 w-3 rounded-full shrink-0 shadow-2xs"
						style="background-color: {cat.color};"
					></span>
					<span class="text-slate-800 dark:text-slate-200 font-semibold">{cat.name}</span>
				</div>
			{/each}
		</div>
	</section>
</div>

<CategoryManagerModal
	bind:isOpen={isCategoryModalOpen}
	onCategoryCreated={(newCat) => {
		if (isCreatingActivity) {
			actCategory = newCat.id;
		}
	}}
/>
