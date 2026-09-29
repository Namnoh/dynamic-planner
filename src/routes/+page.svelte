<script lang="ts">
	import { onMount } from 'svelte';
	import { seedDemoData } from '$lib/db';
	import WeeklyPlanner from '$lib/components/WeeklyPlanner.svelte';
	import TemplateManager from '$lib/components/TemplateManager.svelte';
	import { Calendar, Layers } from 'lucide-svelte';

	let activeTab = $state<'planner' | 'templates'>('planner');
	let isInitializing = $state(true);
	let plannerKey = $state(0);

	onMount(async () => {
		// Initialize demo data on first load if DB is empty
		try {
			await seedDemoData(false);
		} catch (e) {
			console.error('Error al inicializar datos:', e);
		} finally {
			isInitializing = false;
		}
	});

	function handleTemplatesUpdated() {
		// Increment plannerKey to trigger refresh in WeeklyPlanner
		plannerKey++;
	}
</script>

<div class="space-y-6">
	<!-- Tab Switcher -->
	<div class="flex items-center justify-between border-b border-slate-800 pb-3">
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => (activeTab = 'planner')}
				class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer {activeTab ===
				'planner'
					? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
					: 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
			>
				<Calendar class="h-4 w-4" />
				<span>Planificador Semanal (DnD)</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'templates')}
				class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer {activeTab ===
				'templates'
					? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
					: 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
			>
				<Layers class="h-4 w-4" />
				<span>Gestor de Plantillas & Bloques</span>
			</button>
		</div>
	</div>

	<!-- Content -->
	{#if isInitializing}
		<div class="flex h-64 items-center justify-center text-slate-500 text-sm">
			Cargando planificador offline...
		</div>
	{:else if activeTab === 'planner'}
		{#key plannerKey}
			<WeeklyPlanner />
		{/key}
	{:else}
		<TemplateManager onTemplatesUpdated={handleTemplatesUpdated} />
	{/if}
</div>
