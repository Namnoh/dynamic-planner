import { writable } from 'svelte/store';

export interface PwaInstallState {
	canInstall: boolean;
	isInstalled: boolean;
	isIOS: boolean;
	isStandalone: boolean;
	platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

let deferredPrompt: any = null;

function createPwaInstallStore() {
	const { subscribe, set, update } = writable<PwaInstallState>({
		canInstall: false,
		isInstalled: false,
		isIOS: false,
		isStandalone: false,
		platform: 'unknown'
	});

	return {
		subscribe,
		init() {
			if (typeof window === 'undefined') return;

			const isStandalone =
				window.matchMedia('(display-mode: standalone)').matches ||
				(window.navigator as any).standalone === true;

			const ua = window.navigator.userAgent;
			const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
			const isAndroid = /Android/.test(ua);
			const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

			update((s) => ({
				...s,
				isInstalled: isStandalone,
				isStandalone,
				isIOS,
				platform,
				canInstall: !isStandalone
			}));

			window.addEventListener('beforeinstallprompt', (e: Event) => {
				e.preventDefault();
				deferredPrompt = e;
				update((s) => ({ ...s, canInstall: !s.isStandalone }));
			});

			window.addEventListener('appinstalled', () => {
				deferredPrompt = null;
				update((s) => ({ ...s, canInstall: false, isInstalled: true, isStandalone: true }));
			});
		},
		async promptInstall(): Promise<'accepted' | 'dismissed' | 'show-instructions' | 'already-installed'> {
			if (typeof window === 'undefined') return 'dismissed';

			const isStandalone =
				window.matchMedia('(display-mode: standalone)').matches ||
				(window.navigator as any).standalone === true;

			if (isStandalone) {
				return 'already-installed';
			}

			if (deferredPrompt) {
				try {
					deferredPrompt.prompt();
					const choiceResult = await deferredPrompt.userChoice;
					if (choiceResult && choiceResult.outcome === 'accepted') {
						deferredPrompt = null;
						update((s) => ({ ...s, canInstall: false, isInstalled: true, isStandalone: true }));
						return 'accepted';
					} else {
						return 'dismissed';
					}
				} catch {
					return 'show-instructions';
				}
			}

			return 'show-instructions';
		}
	};
}

export const pwaInstallStore = createPwaInstallStore();
