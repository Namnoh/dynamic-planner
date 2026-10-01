export interface InAppToast {
	id: string;
	title: string;
	message?: string;
	type: 'info' | 'success' | 'warning' | 'error';
	durationMs?: number;
}

// Global in-app toast subscriber registry (Svelte store-compatible)
type ToastListener = (toasts: InAppToast[]) => void;
let listeners: ToastListener[] = [];
let activeToasts: InAppToast[] = [];

function notifyListeners() {
	listeners.forEach((fn) => fn([...activeToasts]));
}

export const toastStore = {
	subscribe(fn: ToastListener) {
		listeners.push(fn);
		fn([...activeToasts]);
		return () => {
			listeners = listeners.filter((l) => l !== fn);
		};
	},
	dismiss(id: string) {
		activeToasts = activeToasts.filter((t) => t.id !== id);
		notifyListeners();
	},
	show(toast: Omit<InAppToast, 'id'>) {
		const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const fullToast: InAppToast = { id, ...toast };
		activeToasts = [...activeToasts, fullToast];
		notifyListeners();

		const duration = toast.durationMs ?? 4000;
		if (duration > 0) {
			setTimeout(() => {
				toastStore.dismiss(id);
			}, duration);
		}
		return id;
	}
};

/**
 * Requests browser permission for the native Web Notifications API.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!('Notification' in window)) {
		console.warn('Este navegador no soporta notificaciones de escritorio.');
		return 'denied';
	}
	return await Notification.requestPermission();
}

/**
 * Dispatches an offline event notification using Web Notifications API with an automatic in-app toast fallback.
 */
export async function sendPlannerNotification(
	title: string,
	options?: {
		body?: string;
		icon?: string;
		tag?: string;
		type?: 'info' | 'success' | 'warning' | 'error';
	}
): Promise<void> {
	if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
		try {
			new Notification(title, {
				body: options?.body,
				icon: options?.icon || '/dynamic-planner.svg',
				tag: options?.tag,
				badge: '/dynamic-planner.svg'
			});
		} catch (err) {
			console.warn('Error al disparar notificación nativa:', err);
		}
	}

	// Always trigger in-app visual toast for immediate user feedback
	toastStore.show({
		title,
		message: options?.body,
		type: options?.type || 'success',
		durationMs: 4000
	});
}
