<script lang="ts">
	import {
		ShieldCheck,
		Layers,
		BookOpen,
		HelpCircle,
		Database
	} from 'lucide-svelte';

	let {
		onOpenAbout,
		onOpenSettings,
		onOpenInstall,
		onOpenChangelog
	}: {
		onOpenAbout?: (tab?: 'overview' | 'features' | 'usecases' | 'examples' | 'privacy') => void;
		onOpenSettings?: () => void;
		onOpenInstall?: () => void;
		onOpenChangelog?: () => void;
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
					<img
						src="/dynamic-planner.svg"
						alt="Dynamic Planner Logo"
						class="h-8 w-8 rounded-xl shadow-md shadow-indigo-600/25 shrink-0"
					/>
					<span class="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
						Planificador Dinámico
					</span>
				</div>

				<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
					Organización personal y semanal por bloques de tiempo. Diseñado para ofrecer máxima concentración y privacidad, guardando tus datos directamente en tu navegador sin depender de servidores ni cuentas.
				</p>

				<!-- Privacy & Storage Badges -->
				<div class="flex flex-wrap gap-1.5 pt-1">
					<span class="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
						<ShieldCheck class="h-3 w-3" />
						100% Privado
					</span>
					<span class="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
						<Database class="h-3 w-3" />
						Guardado en tu equipo
					</span>
					<span class="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
						Funciona sin internet
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
							<span>Privacidad y Seguridad</span>
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
							Planificador Semanal
						</button>
					</li>
					<li>
						<button
							type="button"
							onclick={() => handleSwitchTab('templates')}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer"
						>
							Plantillas y Rutinas
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
							onclick={() => onOpenInstall?.()}
							class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400"
						>
							<span>Descargar / Instalar App</span>
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
				<span>© {currentYear} <strong>Planificador Dinámico</strong> (Dynamic Planner).</span>
				<span class="hidden sm:inline">•</span>
				<a href="https://mydynamicplanner.com" class="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">mydynamicplanner.com</a>
				<span class="hidden sm:inline">•</span>
				<span>Creado por <span class="font-medium text-slate-700 dark:text-slate-300">Fernando Muñoz</span>.</span>
				<span class="hidden sm:inline">•</span>
				<span class="hidden sm:inline">Tus datos nunca salen de tu ordenador.</span>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="https://github.com/Namnoh/dynamic-planner"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
					title="Repositorio en GitHub"
				>
					<svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
					<span>GitHub</span>
				</a>
				<span>•</span>
				<button
					type="button"
					onclick={() => onOpenAbout?.('overview')}
					class="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
				>
					<HelpCircle class="h-3.5 w-3.5" />
					<span>Documentación & Guía</span>
				</button>
				<span>•</span>
				<button
					type="button"
					onclick={() => onOpenChangelog?.()}
					class="rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
					title="Ver historial de versiones y novedades"
				>
					v1.0.0
				</button>
			</div>
		</div>
	</div>
</footer>
