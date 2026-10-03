<script lang="ts">
	import { settingsStore, type BlockColorStyle } from '$lib/stores/settings';
	import { toastStore } from '$lib/utils/notifications';
	import { exportDatabaseToJson, importDatabaseFromJson } from '$lib/db';
	import Modal from './Modal.svelte';
	import {
		Settings,
		Palette,
		CheckCircle2,
		ShieldCheck,
		FileDown,
		FileUp,
		Sun,
		Moon,
		Bell,
		BookOpen,
		Download
	} from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		isDarkMode = false,
		onToggleTheme,
		notificationPermission = 'default',
		onRequestNotifications,
		onOpenAbout,
		onOpenInstall
	}: {
		isOpen: boolean;
		isDarkMode?: boolean;
		onToggleTheme?: () => void;
		notificationPermission?: NotificationPermission;
		onRequestNotifications?: () => void;
		onOpenAbout?: () => void;
		onOpenInstall?: () => void;
	} = $props();

	let currentStyle = $state<BlockColorStyle>(settingsStore.current);

	$effect(() => {
		const unsubscribe = settingsStore.subscribe((val) => {
			currentStyle = val;
		});
		return unsubscribe;
	});

	function selectStyle(style: BlockColorStyle) {
		settingsStore.setBlockColorStyle(style);
		toastStore.show({
			title: 'Preferencia guardada',
			message: `Estilo de bloques cambiado a: ${style === 'full' ? 'Color completo' : 'Solo borde izquierdo'}`,
			type: 'info',
			durationMs: 2500
		});
	}

	async function handleExportJson() {
		const json = await exportDatabaseToJson();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dynamic-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toastStore.show({
			title: 'Copia de seguridad descargada',
			message: 'Archivo JSON generado localmente en tu dispositivo.',
			type: 'success'
		});
	}

	async function handleImportJson(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const text = await file.text();
		try {
			await importDatabaseFromJson(text);
			toastStore.show({
				title: 'Copia de seguridad restaurada',
				message: 'Los datos locales han sido actualizados con éxito.',
				type: 'success'
			});
			window.location.reload();
		} catch (err: any) {
			toastStore.show({
				title: 'Error al restaurar',
				message: err.message,
				type: 'error'
			});
		}
		input.value = '';
	}
</script>

<Modal
	bind:isOpen
	title="Configuración"
	description="Personaliza la interfaz y visualización del planificador"
	icon={Settings}
	maxWidth="max-w-lg"
>
	{#snippet children()}
		<div class="space-y-6">

			<!-- Mobile Quick Actions: Theme, Notifications, Guide -->
			<div class="md:hidden space-y-2.5 pb-5 border-b border-slate-200 dark:border-slate-800">
				<h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					Accesos Rápidos
				</h4>

				<div class="grid grid-cols-1 gap-2">
					<!-- Dark / Light Mode Toggle -->
					<button
						type="button"
						onclick={onToggleTheme}
						class="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
					>
						<div class="flex items-center gap-2.5">
							{#if isDarkMode}
								<Sun class="h-4 w-4 text-amber-400" />
								<span class="text-xs font-medium text-slate-800 dark:text-slate-200">Tema Claro / Oscuro</span>
							{:else}
								<Moon class="h-4 w-4 text-indigo-600" />
								<span class="text-xs font-medium text-slate-800 dark:text-slate-200">Tema Claro / Oscuro</span>
							{/if}
						</div>
						<span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
							{isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}
						</span>
					</button>

					<!-- Notifications -->
					<button
						type="button"
						onclick={onRequestNotifications}
						class="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
					>
						<div class="flex items-center gap-2.5">
							<Bell class="h-4 w-4 {notificationPermission === 'granted' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}" />
							<span class="text-xs font-medium text-slate-800 dark:text-slate-200">Notificaciones</span>
						</div>
						<span class="text-[11px] font-semibold {notificationPermission === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}">
							{notificationPermission === 'granted' ? 'Activadas' : 'Activar avisos'}
						</span>
					</button>

					<!-- About / Guide -->
					<button
						type="button"
						onclick={() => {
							isOpen = false;
							onOpenAbout?.();
						}}
						class="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
					>
						<div class="flex items-center gap-2.5">
							<BookOpen class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							<span class="text-xs font-medium text-slate-800 dark:text-slate-200">Guía y Documentación</span>
						</div>
						<span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
							Ver Guía →
						</span>
					</button>
				</div>
			</div>

			<!-- Setting: Block Color Style -->
			<div class="space-y-3.5">
				<div class="flex items-center gap-2">
					<Palette class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
					<h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">
						Estilo visual de los bloques de tiempo
					</h4>
				</div>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Define cómo se aplican los colores de categoría en tus tarjetas de planificación:
				</p>

				<!-- Interactive Visual Selector with Previews -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<!-- Option 1: Left Border Only -->
					<button
						type="button"
						onclick={() => selectStyle('border')}
						class="flex flex-col items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer {currentStyle === 'border'
							? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/15 shadow-sm'
							: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'}"
					>
						<div class="flex items-center justify-between w-full">
							<span class="font-semibold text-xs text-slate-800 dark:text-slate-200">
								Solo borde izquierdo
							</span>
							{#if currentStyle === 'border'}
								<CheckCircle2 class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							{/if}
						</div>

						<!-- Left Border Mini Preview -->
						<div
							class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2.5 py-2 shadow-2xs space-y-1"
							style="border-left: 3.5px solid #3b82f6;"
						>
							<div class="flex justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-sans tabular-nums font-medium tracking-tight">
								<span>09:30 – 11:30</span>
								<span class="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-slate-300">WORK</span>
							</div>
							<p class="text-xs font-semibold text-slate-800 dark:text-slate-100">Deep Work: Arquitectura</p>
						</div>

						<span class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
							Fondo neutro y limpio con una franja lateral que identifica la categoría.
						</span>
					</button>

					<!-- Option 2: Full Color -->
					<button
						type="button"
						onclick={() => selectStyle('full')}
						class="flex flex-col items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer {currentStyle === 'full'
							? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/15 shadow-sm'
							: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'}"
					>
						<div class="flex items-center justify-between w-full">
							<span class="font-semibold text-xs text-slate-800 dark:text-slate-200">
								Color completo
							</span>
							{#if currentStyle === 'full'}
								<CheckCircle2 class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							{/if}
						</div>

						<!-- Full Color Mini Preview -->
						<div
							class="w-full rounded-xl px-2.5 py-2 shadow-2xs space-y-1 border"
							style="border-left: 3.5px solid #3b82f6; background-color: color-mix(in srgb, #3b82f6 14%, transparent); border-color: color-mix(in srgb, #3b82f6 35%, transparent);"
						>
							<div class="flex justify-between text-[10.5px] text-slate-600 dark:text-slate-300 font-sans tabular-nums font-medium tracking-tight">
								<span>09:30 – 11:30</span>
								<span class="rounded bg-indigo-600/20 px-1.5 py-0.5 text-[9px] text-indigo-700 dark:text-indigo-300 font-semibold">WORK</span>
							</div>
							<p class="text-xs font-semibold text-slate-900 dark:text-slate-100">Deep Work: Arquitectura</p>
						</div>

						<span class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
							Tarjeta completamente teñida con el color temático para un vistazo rápido.
						</span>
					</button>
				</div>
			</div>

			<!-- Install Application Option -->
			{#if onOpenInstall}
				<div class="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 flex items-center justify-between gap-3">
					<div>
						<h5 class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
							<Download class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
							<span>Instalar aplicación en tu dispositivo</span>
						</h5>
						<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
							Úsala a pantalla completa y con acceso directo sin conexión.
						</p>
					</div>
					<button
						type="button"
						onclick={() => {
							isOpen = false;
							onOpenInstall?.();
						}}
						class="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
					>
						<span>Instalar</span>
					</button>
				</div>
			{/if}

			<!-- Local-First Privacy Section (Obsidian-Style) -->
			<div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2">
					<ShieldCheck class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
					<h4 class="font-bold text-sm text-slate-800 dark:text-slate-200">Privacidad y Soberanía Local</h4>
				</div>

				<div class="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs space-y-2 text-slate-700 dark:text-slate-300">
					<p class="leading-relaxed">
						<strong>Tus datos te pertenecen al 100%:</strong> La aplicación funciona de manera completamente local y aislada. No existen servidores externos, ni telemetría, ni analíticas, ni almacenamiento en la nube.
					</p>
					<div class="flex flex-wrap gap-1.5 pt-1">
						<span class="rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
							✓ IndexedDB Local
						</span>
						<span class="rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
							✓ Cero Telemetría
						</span>
						<span class="rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
							✓ Air-Gapped / CSP Bloqueo Total
						</span>
					</div>
				</div>

				<!-- Data Portability (JSON Import/Export) -->
				<div class="space-y-1.5 pt-1">
					<span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
						Portabilidad y Respaldo (Importar / Exportar JSON):
					</span>
					<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
						Para mover tus rutinas a otro navegador o dispositivo, descarga tu archivo JSON y luego impórtalo allí.
					</p>
					<div class="flex items-center gap-2 pt-1">
						<button
							type="button"
							onclick={handleExportJson}
							class="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
						>
							<FileDown class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
							<span>Exportar JSON</span>
						</button>

						<label
							class="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
						>
							<FileUp class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
							<span>Importar JSON</span>
							<input type="file" accept=".json" onchange={handleImportJson} class="hidden" />
						</label>
					</div>
				</div>
			</div>

		</div>
	{/snippet}

	{#snippet footerSnippet()}
		<button
			type="button"
			onclick={() => (isOpen = false)}
			class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
		>
			Entendido
		</button>
	{/snippet}
</Modal>
