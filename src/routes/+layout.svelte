<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { requestNotificationPermission, toastStore } from '$lib/utils/notifications';
	import { Wifi, WifiOff, Bell, Sun, Moon, CalendarDays } from 'lucide-svelte';

	let { children } = $props();

	let isOnline = $state(true);
	let isDarkMode = $state(true);
	let notificationPermission = $state<NotificationPermission>('default');

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
		// Online / Offline listeners
		isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Notification permission status
		if ('Notification' in window) {
			notificationPermission = Notification.permission;
		}

		// Dark mode initialization
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'light') {
			isDarkMode = false;
			document.documentElement.classList.remove('dark');
		} else {
			isDarkMode = true;
			document.documentElement.classList.add('dark');
		}

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
					console.info('PWA Service worker registration skipped in current environment.');
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
	<link rel="icon" href={favicon} />
	<title>Dynamic Planner - Time-blocking Modular Offline</title>
</svelte:head>

<div
	class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased"
>
	<!-- Navbar Principal -->
	<nav
		class="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3"
	>
		<div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
			<!-- Logo -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-600/30"
				>
					<CalendarDays class="h-5 w-5" />
				</div>
				<div>
					<h1
						class="text-base font-extrabold tracking-tight bg-linear-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent"
					>
						Dynamic Planner
					</h1>
					<p class="text-[10px] text-slate-400 hidden sm:block">
						Planificación modular & Time-blocking Offline
					</p>
				</div>
			</div>

			<!-- Utilities: Offline status, Notifications, Theme -->
			<div class="flex items-center gap-2">
				<!-- Offline / Online Badge -->
				<div
					class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border {isOnline
						? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
						: 'border-amber-500/30 bg-amber-500/10 text-amber-400'}"
				>
					{#if isOnline}
						<Wifi class="h-3 w-3" />
						<span class="hidden md:inline">Online / PWA Cache</span>
					{:else}
						<WifiOff class="h-3 w-3" />
						<span>Offline</span>
					{/if}
				</div>

				<!-- Notifications Button -->
				<button
					type="button"
					onclick={handleRequestNotifications}
					class="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer"
					title="Activar notificaciones de escritorio"
				>
					<Bell class="h-4 w-4 {notificationPermission === 'granted' ? 'text-indigo-400' : ''}" />
				</button>

				<!-- Dark / Light Mode Toggle -->
				<button
					type="button"
					onclick={toggleTheme}
					class="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer"
					title="Cambiar tema"
				>
					{#if isDarkMode}
						<Sun class="h-4 w-4 text-amber-400" />
					{:else}
						<Moon class="h-4 w-4 text-indigo-400" />
					{/if}
				</button>
			</div>
		</div>
	</nav>

	<!-- Main Content Slot -->
	<main class="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
		{@render children()}
	</main>

	<!-- In-app Toasts -->
	<ToastContainer />
</div>
