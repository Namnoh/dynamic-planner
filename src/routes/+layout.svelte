<script lang="ts">
	import './layout.css';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import AboutModal from '$lib/components/AboutModal.svelte';
	import InstallModal from '$lib/components/InstallModal.svelte';
	import ChangelogModal from '$lib/components/ChangelogModal.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { onMount } from 'svelte';
	import { requestNotificationPermission, toastStore } from '$lib/utils/notifications';
	import { pwaInstallStore } from '$lib/stores/pwaInstall';
	import { changelogStore } from '$lib/stores/changelog';
	import { Wifi, WifiOff, Bell, Sun, Moon, Settings, BookOpen, Download, Sparkles } from 'lucide-svelte';

	let { children } = $props();

	let isOnline = $state(true);
	let isDarkMode = $state(true);
	let isSettingsOpen = $state(false);
	let isAboutOpen = $state(false);
	let isInstallOpen = $state(false);
	let isChangelogOpen = $state(false);
	let hasUnreadChangelog = $state(false);
	let initialAboutTab = $state<'overview' | 'features' | 'usecases' | 'examples' | 'privacy'>('overview');
	let notificationPermission = $state<NotificationPermission>('default');
	let installState = $state($pwaInstallStore);

	$effect(() => {
		const unsubscribe = changelogStore.subscribe((val) => {
			hasUnreadChangelog = val;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = pwaInstallStore.subscribe((val) => {
			installState = val;
		});
		return unsubscribe;
	});

	function openAbout(tab: 'overview' | 'features' | 'usecases' | 'examples' | 'privacy' = 'overview') {
		initialAboutTab = tab;
		isAboutOpen = true;
	}

	async function handleInstallClick() {
		const res = await pwaInstallStore.promptInstall();
		if (res === 'show-instructions') {
			isInstallOpen = true;
		} else if (res === 'already-installed') {
			toastStore.show({
				title: 'Aplicación ya instalada',
				message: 'Ya estás usando la aplicación en modo nativo en este dispositivo.',
				type: 'info'
			});
		}
	}

	function handleOnline() {
		isOnline = true;
		toastStore.show({ title: 'Conexión restablecida', type: 'info' });
	}

	function handleOffline() {
		isOnline = false;
		toastStore.show({
			title: 'Modo Offline Activado',
			message: 'Tus datos se guardan en IndexedDB localmente.',
			type: 'warning'
		});
	}

	onMount(() => {
		isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		if ('Notification' in window) {
			notificationPermission = Notification.permission;
		}

		// Initialize theme state from current class on html or localStorage
		const isDark = document.documentElement.classList.contains('dark');
		isDarkMode = isDark;

		// Initialize PWA installation detection
		pwaInstallStore.init();

		// Check unread changelog updates
		changelogStore.checkUnread();

		// Register PWA Service Worker
		if ('serviceWorker' in navigator) {
			import('virtual:pwa-register')
				.then(({ registerSW }) => {
					registerSW({
						immediate: true,
						onOfflineReady() {
							toastStore.show({
								title: '¡App lista para uso 100% Offline!',
								message: 'Todos los recursos han sido almacenados en caché.',
								type: 'success'
							});
						}
					});
				})
				.catch(() => {
					// Direct fallback registration for standard PWA support
					navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
						console.info('PWA Service worker registration skipped in current environment.');
					});
				});
		}

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	function toggleTheme() {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	async function handleRequestNotifications() {
		const result = await requestNotificationPermission();
		notificationPermission = result;
		if (result === 'granted') {
			toastStore.show({
				title: 'Notificaciones activadas',
				message: 'Recibirás avisos de inicio y fin de tus bloques.',
				type: 'success'
			});
		} else {
			toastStore.show({
				title: 'Notificaciones denegadas',
				message: 'Se usarán notificaciones visuales en pantalla.',
				type: 'info'
			});
		}
	}
</script>

<svelte:head>
	<title>Planificador Dinámico (Dynamic Planner) - Planificador Semanal & Time-Blocking</title>
	<meta name="description" content="Planificador Dinámico (Dynamic Planner): Organiza tu semana con bloques de tiempo interactivos (time-blocking), plantillas de rutinas y modo 100% offline. Privacidad total sin registro." />
	<link rel="canonical" href="https://mydynamicplanner.com/" />
</svelte:head>

<div
	class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased transition-colors duration-200"
>
	<!-- Main Navbar -->
	<nav
		class="sticky top-0 z-40 border-b border-slate-200 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md py-3 transition-colors"
	>
		<div class="max-w-360 mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
			<!-- Logo -->
			<div class="flex items-center gap-3">
				<img
					src="/dynamic-planner.svg"
					alt="Planificador Dinámico (Dynamic Planner)"
					class="h-9 w-9 rounded-xl shadow-md shadow-indigo-600/25 shrink-0"
				/>
				<div>
					<h1
						class="text-base font-extrabold tracking-tight bg-linear-to-r from-slate-900 via-indigo-950 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-indigo-300 bg-clip-text text-transparent"
					>
						Planificador Dinámico
					</h1>
					<p class="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
						Dynamic Planner • Organización semanal por bloques
					</p>
				</div>
			</div>

			<!-- Utilities: Offline status, Notifications, Theme -->
			<div class="flex items-center gap-2">
				<!-- Offline / Online Badge -->
				<div
					class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border h-8 {isOnline
						? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
						: 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}"
				>
					{#if isOnline}
						<Wifi class="h-3 w-3" />
						<span class="hidden md:inline">En línea / Guardado local</span>
					{:else}
						<WifiOff class="h-3 w-3" />
						<span>Modo Local (Sin conexión)</span>
					{/if}
				</div>

				<!-- Download / Install App Button -->
				{#if !installState.isStandalone}
					<button
						type="button"
						onclick={handleInstallClick}
						class="inline-flex items-center gap-1.5 h-8 rounded-xl px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shadow-xs"
						title="Descargar o instalar app"
						aria-label="Descargar o instalar app"
					>
						<Download class="h-3.5 w-3.5" />
						<span class="hidden sm:inline">Descargar App</span>
					</button>
				{/if}

				<!-- Notifications Button (Desktop only) -->
				<button
					type="button"
					onclick={handleRequestNotifications}
					class="hidden md:inline-flex rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
					title="Activar notificaciones de escritorio"
				>
					<Bell class="h-4 w-4 {notificationPermission === 'granted' ? 'text-indigo-600 dark:text-indigo-400' : ''}" />
				</button>

				<!-- Dark / Light Mode Toggle (Desktop only) -->
				<button
					type="button"
					onclick={toggleTheme}
					class="hidden md:inline-flex rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
					title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
					aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
				>
					{#if isDarkMode}
						<Sun class="h-4 w-4 text-amber-400" />
					{:else}
						<Moon class="h-4 w-4 text-indigo-600" />
					{/if}
				</button>

				<!-- About / Guide Button (Desktop only) -->
				<button
					type="button"
					onclick={() => openAbout('overview')}
					class="hidden md:inline-flex rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
					title="Guía y funcionalidades"
					aria-label="Acerca del Planificador Dinámico"
				>
					<BookOpen class="h-4 w-4" />
				</button>

				<!-- GitHub Repository Link (Desktop only) -->
				<a
					href="https://github.com/Namnoh/dynamic-planner"
					target="_blank"
					rel="noopener noreferrer"
					class="hidden md:inline-flex rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
					title="Repositorio en GitHub"
					aria-label="Ver código en GitHub"
				>
					<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
				</a>

				<!-- Changelog / Novedades Button (Dynamic on mobile: appears with red dot when unread, hides into settings when read) -->
				<button
					type="button"
					onclick={() => (isChangelogOpen = true)}
					class="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all border border-slate-200 dark:border-slate-800 cursor-pointer {hasUnreadChangelog
						? 'inline-flex bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800/80 shadow-xs'
						: 'hidden md:inline-flex'}"
					title="Novedades y Registro de Cambios (v1.0.0)"
					aria-label="Ver novedades y cambios"
				>
					<Sparkles class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
					{#if hasUnreadChangelog}
						<span class="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="¡Novedades disponibles!">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white dark:ring-slate-950"></span>
						</span>
					{/if}
				</button>

				<!-- Settings Button -->
				<button
					type="button"
					onclick={() => (isSettingsOpen = true)}
					class="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
					title="Configuración"
					aria-label="Abrir configuración"
				>
					<Settings class="h-4 w-4" />
				</button>
			</div>
		</div>
	</nav>

	<!-- Main Content Slot -->
	<main class="flex-1 w-full">
		<div class="max-w-360 mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{@render children()}
		</div>
	</main>

	<!-- Main Footer -->
	<Footer
		onOpenAbout={(tab) => openAbout(tab)}
		onOpenSettings={() => (isSettingsOpen = true)}
		onOpenInstall={handleInstallClick}
		onOpenChangelog={() => (isChangelogOpen = true)}
	/>

	<!-- In-app Toasts -->
	<ToastContainer />

	<!-- Settings Modal -->
	<SettingsModal
		bind:isOpen={isSettingsOpen}
		{isDarkMode}
		onToggleTheme={toggleTheme}
		{notificationPermission}
		onRequestNotifications={handleRequestNotifications}
		onOpenAbout={() => openAbout('overview')}
		onOpenInstall={handleInstallClick}
		onOpenChangelog={() => (isChangelogOpen = true)}
		{hasUnreadChangelog}
	/>

	<!-- About & Project Guide Modal -->
	<AboutModal bind:isOpen={isAboutOpen} initialTab={initialAboutTab} />

	<!-- Install PWA Modal -->
	<InstallModal bind:isOpen={isInstallOpen} />

	<!-- Changelog / Novedades Modal -->
	<ChangelogModal bind:isOpen={isChangelogOpen} />
</div>
