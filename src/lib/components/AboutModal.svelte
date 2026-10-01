<script lang="ts">
	import Modal from './Modal.svelte';
	import {
		BookOpen,
		Sparkles,
		CheckCircle2,
		Layers,
		CalendarDays,
		Palette,
		ShieldCheck,
		Laptop,
		GraduationCap,
		Briefcase,
		HeartPulse,
		ArrowRight,
		FileDown,
		Cpu,
		Clock,
		Flame
	} from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		initialTab = 'overview'
	}: {
		isOpen: boolean;
		initialTab?: 'overview' | 'features' | 'usecases' | 'examples' | 'privacy';
	} = $props();

	type TabId = 'overview' | 'features' | 'usecases' | 'examples' | 'privacy';
	let activeTab = $state<TabId>('overview');

	$effect(() => {
		if (isOpen && initialTab) {
			activeTab = initialTab;
		}
	});

	const tabs: { id: TabId; label: string; icon: any }[] = [
		{ id: 'overview', label: '¿Qué es y Para qué sirve?', icon: Sparkles },
		{ id: 'features', label: 'Funcionalidades', icon: Layers },
		{ id: 'usecases', label: 'Casos de Uso', icon: Briefcase },
		{ id: 'examples', label: 'Ejemplos Prácticos', icon: Clock },
		{ id: 'privacy', label: 'Privacidad Local-First', icon: ShieldCheck }
	];
</script>

<Modal
	bind:isOpen
	title="Acerca de Dynamic Planner"
	description="Guía completa del proyecto, filosofía de time-blocking y funcionalidades"
	icon={BookOpen}
	maxWidth="max-w-4xl"
>
	{#snippet children()}
		<div class="space-y-6 text-xs sm:text-sm">
			<!-- Navigation Tabs inside the Modal -->
			<div class="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
				{#each tabs as tab}
					<button
						type="button"
						onclick={() => (activeTab = tab.id)}
						class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer {activeTab ===
						tab.id
							? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
							: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}"
					>
						<tab.icon class="h-3.5 w-3.5" />
						<span>{tab.label}</span>
					</button>
				{/each}
			</div>

			<!-- Tab 1: Overview (¿Qué es y Para qué sirve?) -->
			{#if activeTab === 'overview'}
				<div class="space-y-5 animate-in fade-in duration-200">
					<!-- Hero Box -->
					<div class="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900/60 p-5 space-y-3">
						<div class="flex items-center gap-3">
							<img
								src="/dynamic-planner.svg"
								alt="Dynamic Planner Logo"
								class="h-11 w-11 rounded-2xl shadow-md shadow-indigo-600/25 shrink-0"
							/>
							<div>
								<div class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
									<Flame class="h-3 w-3" />
									<span>Productividad con Propósito</span>
								</div>
								<h4 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug mt-1">
									¿Qué es Dynamic Planner?
								</h4>
							</div>
						</div>
						<p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
							<strong>Dynamic Planner</strong> es una aplicación web progresiva (PWA) de <strong>time-blocking adaptativo y modular</strong>, diseñada bajo la arquitectura <em>Local-First</em>. Combina la flexibilidad de armar rutinas reutilizables con un tablero interactivo semanal donde cada tarea tiene un espacio temporal delimitado, sin rastreadores ni servidores externos.
						</p>
					</div>

					<!-- Problem vs Solution Comparison -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-4 space-y-2">
							<h5 class="font-bold text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-1.5">
								<span>❌ El Problema de las To-Do Lists y Calendarios Tradicionales</span>
							</h5>
							<ul class="space-y-1.5 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
								<li>• <strong>Listas interminables:</strong> Crear listas de tareas sin asignarles hora genera frustración y postergación (ley de Parkinson).</li>
								<li>• <strong>Calendarios rígidos:</strong> Reagendar eventos en calendarios corporativos tradicionales es lento y engorroso.</li>
								<li>• <strong>Pérdida de privacidad:</strong> Casi todas las apps guardan tus hábitos, rutinas y horarios en servidores de terceros.</li>
							</ul>
						</div>

						<div class="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-2">
							<h5 class="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5">
								<span>✅ La Solución de Dynamic Planner</span>
							</h5>
							<ul class="space-y-1.5 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
								<li>• <strong>Time-blocking visual:</strong> Si tiene hora de inicio y fin, es realizable; si no cabe en el día, se prioriza.</li>
								<li>• <strong>Plantillas de Día Modulares:</strong> Arma un "Día Enfoque" o "Día Deporte" una sola vez y aplícalo con un clic.</li>
								<li>• <strong>Soberanía total:</strong> Los datos viven en el IndexedDB de tu propio navegador. Nada sale a la nube.</li>
							</ul>
						</div>
					</div>

					<!-- Key Pillars -->
					<div class="space-y-2.5 pt-2">
						<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
							Los 3 Pilares Fundamentales:
						</h5>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 space-y-1">
								<span class="font-bold text-indigo-600 dark:text-indigo-400 text-xs">1. Modularidad</span>
								<p class="text-slate-600 dark:text-slate-400 text-xs leading-normal">
									Bloques de actividad atómicos que se ensamblan en plantillas completas y reutilizables.
								</p>
							</div>
							<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 space-y-1">
								<span class="font-bold text-indigo-600 dark:text-indigo-400 text-xs">2. Adaptabilidad</span>
								<p class="text-slate-600 dark:text-slate-400 text-xs leading-normal">
									Reordena y desplaza eventos entre días mediante Drag and Drop fluido sin romper el resto de la semana.
								</p>
							</div>
							<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 space-y-1">
								<span class="font-bold text-indigo-600 dark:text-indigo-400 text-xs">3. Local-First</span>
								<p class="text-slate-600 dark:text-slate-400 text-xs leading-normal">
									Inspirado en Obsidian: tu información es tuya, offline, respaldable en JSON con un clic.
								</p>
							</div>
						</div>
					</div>
				</div>

			<!-- Tab 2: Features (Funcionalidades) -->
			{:else if activeTab === 'features'}
				<div class="space-y-4 animate-in fade-in duration-200">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
								<Layers class="h-4 w-4" />
							</div>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Plantillas de Día Modulares</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Crea secuencias preconfiguradas con horas y duraciones. Edita plantillas existentes y modifica bloques de forma individual o reordénalos por hora.
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
								<CalendarDays class="h-4 w-4" />
							</div>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Tablero Semanal con Drag and Drop</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Visualiza tus 7 días simultáneamente. Arrastra actividades entre días o reubica el orden dentro de una columna al instante.
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
								<Palette class="h-4 w-4" />
							</div>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Paletas de Colores Personalizadas</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Escoge colores predefinidos o añade tus propios tonos HEX con nombres únicos. Crea paletas personalizadas para distinguir áreas de tu vida.
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
								<FileDown class="h-4 w-4" />
							</div>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Exportación en Imagen HD</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Descarga tu horario semanal en PNG, JPEG o WebP con resolución hasta 3x. Perfecto para fondos de escritorio, tablets o impresión física.
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
								<Cpu class="h-4 w-4" />
							</div>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">PWA y Modo 100% Offline</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Instalable como aplicación nativa en Windows, macOS, Linux, Android e iOS. Funciona de manera completa sin conexión a internet.
								</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
								<CheckCircle2 class="h-4 w-4" />
							</div>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Checklist & Estado Completado</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Marca tareas finalizadas con un check interactivo, notificaciones de éxito con borde verde y tachado visual que premia tu avance.
								</p>
							</div>
						</div>
					</div>
				</div>

			<!-- Tab 3: Use Cases (Casos de Uso) -->
			{:else if activeTab === 'usecases'}
				<div class="space-y-4 animate-in fade-in duration-200">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<!-- Case 1: Software Engineer / Remote Worker -->
						<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2.5">
							<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<Laptop class="h-4 w-4" />
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Desarrollador / Profesional Remoto
								</h5>
							</div>
							<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
								Protege 2 a 3 horas de <em>Deep Work</em> matutino para arquitectura y código complejo. Programa sincronizaciones de equipo (Daily) antes del mediodía y bloques de revisión de PRs por la tarde.
							</p>
							<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
								Ej: 09:00 Core Architecture • 11:30 Standup • 14:00 Code Review
							</div>
						</div>

						<!-- Case 2: University Student / Self-learner -->
						<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2.5">
							<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<GraduationCap class="h-4 w-4" />
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Estudiante Universitario & Autodidacta
								</h5>
							</div>
							<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
								Divide materias difíciles en bloques de 60 a 90 minutos usando repetición espaciada. Asigna tiempo exclusivo para lectura técnica, laboratorios y práctica de idiomas sin mezclar asignaturas.
							</p>
							<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
								Ej: 08:00 Algoritmos • 10:00 Idiomas • 16:00 Tesis
							</div>
						</div>

						<!-- Case 3: Entrepreneur / Creator -->
						<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2.5">
							<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<Briefcase class="h-4 w-4" />
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Emprendedor & Creador de Contenido
								</h5>
							</div>
							<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
								Separa los días de "creación pura" (escribir, grabar, diseñar producto) de los días "operativos" (emails, facturación, llamadas comerciales) para evitar el cambio constante de contexto.
							</p>
							<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
								Ej: Martes Creación • Jueves Ventas & Finanzas
							</div>
						</div>

						<!-- Case 4: Wellness & Healthy Routine -->
						<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2.5">
							<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<HeartPulse class="h-4 w-4" />
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Equilibrio Personal & Deporte
								</h5>
							</div>
							<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
								Bloquea innegociablemente tus sesiones de entrenamiento, caminatas al aire libre y tiempo en familia. El planificador garantiza que el trabajo no invada tu descanso.
							</p>
							<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
								Ej: 07:00 Running • 19:30 Gimnasio • 21:00 Desconexión
							</div>
						</div>
					</div>
				</div>

			<!-- Tab 4: Practical Examples (Ejemplos Prácticos) -->
			{:else if activeTab === 'examples'}
				<div class="space-y-4 animate-in fade-in duration-200">
					<div class="space-y-3">
						<!-- Step 1 -->
						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0 mt-0.5">
								1
							</span>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Crea tus bloques base en el Gestor de Plantillas
								</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Ve a la pestaña <em>"Gestor de Plantillas & Bloques"</em> y crea bloques atómicos como "Sprint de Programación (90m)", "Lectura Técnica (45m)" o "Cardio (45m)" con sus colores correspondientes.
								</p>
							</div>
						</div>

						<!-- Step 2 -->
						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0 mt-0.5">
								2
							</span>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Ensambla una Plantilla de Día Modular
								</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Nómbrala como <em>"Día Enfoque Remoto"</em> y añade la secuencia de bloques con sus horas de inicio. Puedes editarlos en cualquier momento o reordenarlos con un clic.
								</p>
							</div>
						</div>

						<!-- Step 3 -->
						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0 mt-0.5">
								3
							</span>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Aplica la rutina a cualquier día de tu semana
								</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Regresa al <em>Planificador Semanal</em>, selecciona tu plantilla ("Día Enfoque Remoto"), elige el día destino (ej. "Martes") y pulsa <em>"Aplicar Rutina"</em>. Toda tu jornada se poblará automáticamente.
								</p>
							</div>
						</div>

						<!-- Step 4 -->
						<div class="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0 mt-0.5">
								4
							</span>
							<div class="space-y-1">
								<h5 class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
									Exporta o Respalda cuando quieras
								</h5>
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									Usa <em>"Exportar Horario"</em> para descargar una imagen nítida en PNG para tu celular o pantalla, y <em>"Exportar JSON"</em> para llevar tu base de datos a cualquier otro dispositivo sin nube.
								</p>
							</div>
						</div>
					</div>
				</div>

			<!-- Tab 5: Privacy & Local-First (Privacidad) -->
			{:else if activeTab === 'privacy'}
				<div class="space-y-4 animate-in fade-in duration-200">
					<div class="rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2.5">
						<div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
							<ShieldCheck class="h-5 w-5" />
							<h5 class="font-bold text-sm sm:text-base">Arquitectura Air-Gapped y Soberanía Total</h5>
						</div>
						<p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
							Al igual que herramientas de culto como <strong>Obsidian</strong>, Dynamic Planner asume que tus notas, horarios y hábitos son <strong>estrictamente personales</strong>.
						</p>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
						<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1.5">
							<span class="font-bold text-slate-900 dark:text-slate-100">🔒 IndexedDB en el Navegador</span>
							<p class="text-slate-600 dark:text-slate-400 leading-normal">
								Todos los eventos, plantillas y configuraciones se guardan localmente en la base de datos de tu navegador.
							</p>
						</div>

						<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1.5">
							<span class="font-bold text-slate-900 dark:text-slate-100">🚫 Cero Telemetría o Rastreo</span>
							<p class="text-slate-600 dark:text-slate-400 leading-normal">
								No hay Google Analytics, ni Mixpanel, ni cookies de rastreo, ni llamadas a APIs secretas en segundo plano.
							</p>
						</div>

						<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1.5">
							<span class="font-bold text-slate-900 dark:text-slate-100">🛡️ Content Security Policy Estricto</span>
							<p class="text-slate-600 dark:text-slate-400 leading-normal">
								Las cabeceras CSP bloquean cualquier envío de datos fuera de la aplicación.
							</p>
						</div>

						<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1.5">
							<span class="font-bold text-slate-900 dark:text-slate-100">💾 Portabilidad JSON Abierta</span>
							<p class="text-slate-600 dark:text-slate-400 leading-normal">
								Tus datos nunca quedan secuestrados (no vendor lock-in). Puedes exportar e importar en formato JSON estándar.
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet footerSnippet()}
		<div class="flex items-center justify-between w-full">
			<span class="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
				Dynamic Planner • Creado por Fernando Muñoz
			</span>
			<button
				type="button"
				onclick={() => (isOpen = false)}
				class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
			>
				Cerrar Guía
			</button>
		</div>
	{/snippet}
</Modal>
