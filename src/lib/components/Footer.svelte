<script lang="ts">
	import {
		CalendarDays,
		ShieldCheck,
		Layers,
		BookOpen,
		HelpCircle,
		Database
	} from 'lucide-svelte';

	let {
		onOpenAbout,
		onOpenSettings
	}: {
		onOpenAbout?: (tab?: 'overview' | 'features' | 'usecases' | 'examples' | 'privacy') => void;
		onOpenSettings?: () => void;
	} = $props();

	const currentYear = new Date().getFullYear();

	function handleSwitchTab(tab: 'planner' | 'templates') {
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('switch-tab', { detail: tab }));
		}
	}
</script>

<footer class="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/80 backdrop-blur-md transition-colors text-slate-600 dark:text-slate-400">
	<div class="max-w-360 mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
		<!-- Main Footer Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
			<!-- Col 1: Brand & Identity -->
			<div class="space-y-4">
				<div class="flex items-center gap-2.5">
					<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30">
						<CalendarDays class="h-4.5 w-4.5" />
					</div>
					<span class="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
						Dynamic Planner
					</span>
				</div>

				<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
					Sistema de time-blocking inteligente, modular y adaptativo. Diseñado bajo la filosofía <em>Local-First</em> para una productividad personal sin distracciones ni pérdida de privacidad.
				</p>

				<!-- Privacy & Arch Badges -->
				<div class="flex flex-wrap gap-1.5 pt-1">
					<span class="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
						<ShieldCheck class="h-3 w-3" />
						100% Local-First
					</span>
					<span class="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
						<Database class="h-3 w-3" />
						IndexedDB
					</span>
					<span class="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
						PWA Offline
					</span>
				</div>
			</div>

			<!-- Col 2: Conoce el Proyecto (Guía & Acerca de) -->
			<div class="space-y-3">
				<h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
					<BookOpen class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
					<span>Conoce el Proyecto</span>
				</h4>
				<ul class="space-y-2 text-xs">
					<li>
						<button
							type="button"
							onclick={() => onOpenAbout?.('overview')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
						>
							<span>¿Qué es y para qué sirve?</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => onOpenAbout?.('features')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
						>
							<span>Funcionalidades principales</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => onOpenAbout?.('examples')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
						>
							<span>Ejemplos prácticos paso a paso</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => onOpenAbout?.('privacy')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
						>
							<span>Soberanía de datos & Seguridad</span>
						</button>
					</li>
				</ul>
			</div>

			<!-- Col 3: Navegación & Herramientas -->
			<div class="space-y-3">
				<h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
					<Layers class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
					<span>Herramientas Rápidas</span>
				</h4>
				<ul class="space-y-2 text-xs">
					<li>
						<button
							type="button"
							onclick={() => handleSwitchTab('planner')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer"
						>
							Planificador Semanal interactivo
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => handleSwitchTab('templates')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer"
						>
							Gestor de Plantillas & Rutinas
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => onOpenSettings?.()}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
						>
							<span>Ajustes & Paletas de Colores</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => onOpenSettings?.()}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
						>
							<span>Exportar / Importar Copia JSON</span>
						</button>
					</li>
				</ul>
			</div>
		</div>

		<!-- Bottom Bar -->
		<div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
			<div class="flex flex-wrap items-center gap-1.5 text-center sm:text-left justify-center sm:justify-start">
				<span>© {currentYear} <strong>Dynamic Planner</strong>.</span>
				<span class="hidden sm:inline">•</span>
				<span>Creado por <span class="font-medium text-slate-700 dark:text-slate-300">Fernando Muñoz</span>.</span>
				<span class="hidden sm:inline">•</span>
				<span class="hidden sm:inline">Tus datos nunca salen de tu ordenador.</span>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={() => onOpenAbout?.('overview')}
					class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
				>
					<HelpCircle class="h-3.5 w-3.5" />
					<span>Documentación & Guía</span>
				</button>
				<span>•</span>
				<span class="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
					v1.0.0
				</span>
			</div>
		</div>
	</div>
</footer>
