<script lang="ts">
	import { onMount } from 'svelte';
	import WeeklyPlanner from '$lib/components/WeeklyPlanner.svelte';
	import TemplateManager from '$lib/components/TemplateManager.svelte';
	import { Calendar, Layers } from 'lucide-svelte';

	let activeTab = $state<'planner' | 'templates'>('planner');
	let isInitializing = $state(true);
	let plannerKey = $state(0);

	onMount(() => {
		const handleSwitchTab = (e: Event) => {
			const customEvent = e as CustomEvent<'planner' | 'templates'>;
			if (customEvent.detail) {
				activeTab = customEvent.detail;
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
		};

		window.addEventListener('switch-tab', handleSwitchTab);

		// Only seed demo data in local development mode (never in production)
		if (import.meta.env.DEV) {
			import('$lib/db/demoData')
				.then(({ seedDemoData }) => seedDemoData(false))
				.catch((e) => console.error('Error al inicializar datos de desarrollo:', e))
				.finally(() => {
					isInitializing = false;
				});
		} else {
			isInitializing = false;
		}

		return () => {
			window.removeEventListener('switch-tab', handleSwitchTab);
		};
	});

	function handleTemplatesUpdated() {
		// Increment plannerKey to trigger refresh in WeeklyPlanner
		plannerKey++;
	}
</script>

<div class="space-y-6">
	<!-- Tab Switcher -->
	<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 transition-colors">
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => (activeTab = 'planner')}
				class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer {activeTab ===
				'planner'
					? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
					: 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}"
			>
				<Calendar class="h-4 w-4" />
				<span>Planificador Semanal</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'templates')}
				class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer {activeTab ===
				'templates'
					? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
					: 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}"
			>
				<Layers class="h-4 w-4" />
				<span>Plantillas y Rutinas</span>
			</button>
		</div>
	</div>

	<!-- Content -->
	{#if isInitializing}
		<div class="flex h-64 items-center justify-center text-slate-500 text-sm">
			Cargando tu planificador...
		</div>
	{:else if activeTab === 'planner'}
		{#key plannerKey}
			<WeeklyPlanner />
		{/key}
	{:else}
		<TemplateManager onTemplatesUpdated={handleTemplatesUpdated} />
	{/if}
</div>
