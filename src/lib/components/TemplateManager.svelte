<script lang="ts">
	import { db } from '$lib/db';
	import type { ActivityTemplate, DayTemplate, DayTemplateBlock } from '$lib/types';
	import { toastStore } from '$lib/utils/notifications';
	import { Plus, Trash2, Edit2, Clock, Layers, Sparkles, Check, Tag } from 'lucide-svelte';

	let { onTemplatesUpdated }: { onTemplatesUpdated?: () => void } = $props();

	let activities = $state<ActivityTemplate[]>([]);
	let dayTemplates = $state<DayTemplate[]>([]);

	// New Activity Form State
	let isCreatingActivity = $state(false);
	let actTitle = $state('');
	let actCategory = $state('work');
	let actDuration = $state(60);
	let actColor = $state('#3b82f6');
	let actNotes = $state('');

	// New Day Template Form State
	let isCreatingDayTemplate = $state(false);
	let tplName = $state('');
	let tplDescription = $state('');
	let tplBlocks = $state<DayTemplateBlock[]>([]);

	// Selected block to add into the new day template
	let selectedActivityIdForBlock = $state('');
	let blockStartTime = $state('09:00');
	let blockDuration = $state(60);
	let blockCustomTitle = $state('');

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

	async function handleSaveActivity() {
		if (!actTitle.trim()) return;
		const id = crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}`;
		const newAct: ActivityTemplate = {
			id,
			title: actTitle.trim(),
			category: actCategory,
			defaultDuration: Number(actDuration),
			color: actColor,
			notes: actNotes.trim() || undefined
		};

		await db.activityTemplates.add(newAct);
		toastStore.show({
			title: 'Bloque base creado',
			type: 'success'
		});
		isCreatingActivity = false;
		actTitle = '';
		actNotes = '';
		await loadData();
		onTemplatesUpdated?.();
	}

	async function handleDeleteActivity(id: string) {
		await db.activityTemplates.delete(id);
		toastStore.show({ title: 'Actividad eliminada', type: 'info' });
		await loadData();
		onTemplatesUpdated?.();
	}

	function handleAddBlockToTemplate() {
		if (!selectedActivityIdForBlock) return;
		tplBlocks.push({
			activityId: selectedActivityIdForBlock,
			startTime: blockStartTime,
			duration: Number(blockDuration),
			customTitle: blockCustomTitle.trim() || undefined
		});
		// Auto increment start time for convenience
		const [h, m] = blockStartTime.split(':').map(Number);
		const totalMin = h * 60 + m + Number(blockDuration);
		const nextH = Math.floor(totalMin / 60) % 24;
		const nextM = totalMin % 60;
		blockStartTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
		blockCustomTitle = '';
	}

	function handleRemoveBlockFromTemplate(index: number) {
		tplBlocks = tplBlocks.filter((_, i) => i !== index);
	}

	async function handleSaveDayTemplate() {
		if (!tplName.trim()) return;
		if (tplBlocks.length === 0) {
			toastStore.show({
				title: 'Agrega al menos un bloque a la plantilla',
				type: 'error'
			});
			return;
		}

		const id = crypto.randomUUID ? crypto.randomUUID() : `tpl-${Date.now()}`;
		const newTpl: DayTemplate = {
			id,
			name: tplName.trim(),
			description: tplDescription.trim() || undefined,
			blocks: [...tplBlocks]
		};

		await db.dayTemplates.add(newTpl);
		toastStore.show({
			title: 'Plantilla de Día creada con éxito',
			type: 'success'
		});

		isCreatingDayTemplate = false;
		tplName = '';
		tplDescription = '';
		tplBlocks = [];
		await loadData();
		onTemplatesUpdated?.();
	}

	async function handleDeleteDayTemplate(id: string) {
		await db.dayTemplates.delete(id);
		toastStore.show({ title: 'Plantilla eliminada', type: 'info' });
		await loadData();
		onTemplatesUpdated?.();
	}
</script>

<div class="space-y-8 w-full">
	<!-- Sección 1: Plantillas de Día Modulares -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-6">
		<div class="flex items-center justify-between border-b border-slate-800 pb-4">
			<div>
				<h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
					<Layers class="h-5 w-5 text-indigo-400" />
					Plantillas de Día Modulares
				</h3>
				<p class="text-xs text-slate-400">
					Ensambla rutinas completas pre-armadas ("Día Enfoque", "Día Balance", etc.) para aplicar con un solo clic.
				</p>
			</div>

			<button
				type="button"
				onclick={() => (isCreatingDayTemplate = !isCreatingDayTemplate)}
				class="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md cursor-pointer"
			>
				<Plus class="h-4 w-4" />
				<span>{isCreatingDayTemplate ? 'Cerrar Creador' : 'Nueva Plantilla de Día'}</span>
			</button>
		</div>

		<!-- Constructor Visual de Plantilla de Día -->
		{#if isCreatingDayTemplate}
			<div class="rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-5 space-y-5 animate-in fade-in duration-200">
				<h4 class="text-sm font-bold text-indigo-300">Constructor de Rutina Diaria</h4>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-medium text-slate-300 mb-1">Nombre de la Plantilla</label>
						<input
							type="text"
							bind:value={tplName}
							placeholder="Ej: Día Enfoque Remoto"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
					<div>
						<label class="block text-xs font-medium text-slate-300 mb-1">Descripción (Opcional)</label>
						<input
							type="text"
							bind:value={tplDescription}
							placeholder="Ej: Enfoque matutino, código en la tarde y deporte."
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
				</div>

				<!-- Añadir bloque a la plantilla -->
				<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
					<h5 class="text-xs font-semibold text-slate-300">Añadir Bloque de Tiempo a la Secuencia</h5>
					<div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
						<div>
							<label class="block text-[11px] text-slate-400 mb-1">Actividad Base</label>
							<select
								bind:value={selectedActivityIdForBlock}
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
							>
								{#each activities as act}
									<option value={act.id}>{act.title}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-[11px] text-slate-400 mb-1">Hora Inicio</label>
							<input
								type="time"
								bind:value={blockStartTime}
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
							/>
						</div>
						<div>
							<label class="block text-[11px] text-slate-400 mb-1">Duración (minutos)</label>
							<input
								type="number"
								min="15"
								step="15"
								bind:value={blockDuration}
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
							/>
						</div>
						<div class="flex items-end">
							<button
								type="button"
								onclick={handleAddBlockToTemplate}
								class="w-full rounded-lg bg-indigo-600/80 hover:bg-indigo-600 py-1.5 text-xs font-medium text-white transition-all cursor-pointer"
							>
								+ Insertar Bloque
							</button>
						</div>
					</div>
				</div>

				<!-- Lista de bloques ensamblados -->
				{#if tplBlocks.length > 0}
					<div class="space-y-2">
						<span class="text-xs font-semibold text-slate-300">Secuencia Ensamblada:</span>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{#each tplBlocks as blk, idx}
								<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/80 p-2.5 text-xs">
									<div>
										<span class="font-mono text-indigo-400 font-bold">{blk.startTime}</span>
										<span class="text-slate-400 text-[10px]">({blk.duration}m)</span>
										<p class="font-medium text-slate-200 mt-0.5">
											{blk.customTitle || activities.find((a) => a.id === blk.activityId)?.title || 'Bloque'}
										</p>
									</div>
									<button
										type="button"
										onclick={() => handleRemoveBlockFromTemplate(idx)}
										class="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
									>
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
					<button
						type="button"
						onclick={() => (isCreatingDayTemplate = false)}
						class="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={handleSaveDayTemplate}
						class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-md cursor-pointer"
					>
						Guardar Plantilla de Día
					</button>
				</div>
			</div>
		{/if}

		<!-- Grid de Plantillas de Día Existentes -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each dayTemplates as tpl}
				<div class="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 transition-all">
					<div class="space-y-2">
						<div class="flex items-start justify-between">
							<h4 class="font-bold text-sm text-slate-100">{tpl.name}</h4>
							<button
								type="button"
								onclick={() => handleDeleteDayTemplate(tpl.id)}
								class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
								title="Eliminar plantilla"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
						{#if tpl.description}
							<p class="text-xs text-slate-400">{tpl.description}</p>
						{/if}
						<div class="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
							<Clock class="h-3 w-3" />
							<span>{tpl.blocks.length} bloques programados</span>
						</div>
					</div>

					<div class="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1">
						{#each tpl.blocks.slice(0, 4) as b}
							<span class="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
								{b.startTime} ({b.duration}m)
							</span>
						{/each}
						{#if tpl.blocks.length > 4}
							<span class="rounded-md bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500">
								+{tpl.blocks.length - 4} más
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Sección 2: Catálogo de Bloques de Actividad Base -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-6">
		<div class="flex items-center justify-between border-b border-slate-800 pb-4">
			<div>
				<h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
					<Tag class="h-5 w-5 text-indigo-400" />
					Catálogo de Bloques de Actividad
				</h3>
				<p class="text-xs text-slate-400">
					Bloques atómicos personalizables (categoría, duración habitual, color) para reutilizar en cualquier día.
				</p>
			</div>

			<button
				type="button"
				onclick={() => (isCreatingActivity = !isCreatingActivity)}
				class="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
			>
				<Plus class="h-4 w-4" />
				<span>{isCreatingActivity ? 'Cerrar' : 'Crear Bloque'}</span>
			</button>
		</div>

		{#if isCreatingActivity}
			<div class="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 space-y-4 animate-in fade-in duration-200">
				<h4 class="text-sm font-bold text-slate-200">Nuevo Bloque Base</h4>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label class="block text-xs font-medium text-slate-300 mb-1">Título</label>
						<input
							type="text"
							bind:value={actTitle}
							placeholder="Ej: Sprint de Programación"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-hidden"
						/>
					</div>
					<div>
						<label class="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
						<select
							bind:value={actCategory}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
						>
							<option value="work">Trabajo (Work)</option>
							<option value="study">Estudio (Study)</option>
							<option value="sport">Deporte (Sport)</option>
							<option value="social">Social</option>
							<option value="hobby">Hobby / Creativo</option>
							<option value="rest">Descanso (Rest)</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-medium text-slate-300 mb-1">Duración habitual (min)</label>
						<input
							type="number"
							step="15"
							min="15"
							bind:value={actDuration}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100"
						/>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-xs text-slate-300 font-medium">Color:</span>
						<div class="flex items-center gap-1.5">
							{#each ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6'] as clr}
								<button
									type="button"
									onclick={() => (actColor = clr)}
									class="h-5 w-5 rounded-full border-2 transition-transform cursor-pointer {actColor === clr
										? 'border-white scale-110'
										: 'border-transparent opacity-70 hover:opacity-100'}"
									style="background-color: {clr};"
								></button>
							{/each}
						</div>
					</div>

					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (isCreatingActivity = false)}
							class="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
						>
							Cancelar
						</button>
						<button
							type="button"
							onclick={handleSaveActivity}
							class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md cursor-pointer"
						>
							Guardar Bloque
						</button>
					</div>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
			{#each activities as act}
				<div
					class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3 hover:border-slate-700 transition-all"
					style="border-left: 4px solid {act.color};"
				>
					<div class="space-y-0.5">
						<h5 class="text-xs font-semibold text-slate-100">{act.title}</h5>
						<div class="flex items-center gap-1.5 text-[10px] text-slate-400">
							<span class="uppercase tracking-wider font-bold">{act.category}</span>
							<span>•</span>
							<span>{act.defaultDuration} min</span>
						</div>
					</div>
					<button
						type="button"
						onclick={() => handleDeleteActivity(act.id)}
						class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
						title="Eliminar bloque base"
					>
						<Trash2 class="h-3.5 w-3.5" />
					</button>
				</div>
			{/each}
		</div>
	</section>
</div>
