/**
 * Storage persistence and emergency recovery utilities for Dynamic Planner
 *
 * Provides:
 * 1. Native persistent storage requests (navigator.storage.persist).
 * 2. Storage quota and persistence diagnostics.
 * 3. Rolling emergency snapshots stored in secondary local storage (localStorage)
 *    to prevent accidental data loss if IndexedDB is cleared or corrupted.
 */

export interface EmergencySnapshotMeta {
	timestamp: string;
	eventsCount: number;
	templatesCount: number;
	categoriesCount: number;
	dataJson: string;
}

export interface StorageDiagnostics {
	isSupported: boolean;
	isPersisted: boolean;
	quotaBytes?: number;
	usageBytes?: number;
	usageFormatted?: string;
	quotaFormatted?: string;
	origin: string;
	hasEmergencySnapshot: boolean;
	snapshotTimestamp?: string;
	snapshotEventsCount?: number;
	snapshotTemplatesCount?: number;
	snapshotCategoriesCount?: number;
}

const EMERGENCY_SNAPSHOT_KEY = 'dp_emergency_snapshot_v1';
const EMERGENCY_SNAPSHOT_META_KEY = 'dp_emergency_snapshot_meta_v1';

/**
 * Formats byte values into readable strings (KB, MB, GB).
 */
export function formatBytes(bytes?: number): string {
	if (bytes === undefined || bytes === null || isNaN(bytes)) return 'N/A';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Checks if the browser has granted persistent storage permission.
 */
export async function isStoragePersisted(): Promise<boolean> {
	if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persisted) {
		return false;
	}
	try {
		return await navigator.storage.persisted();
	} catch {
		return false;
	}
}

/**
 * Requests persistent storage from the browser.
 * When granted, the browser guarantees it will not evict IndexedDB data under storage pressure.
 */
export async function requestPersistentStorage(): Promise<boolean> {
	if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
		return false;
	}
	try {
		const isAlreadyPersisted = await navigator.storage.persisted();
		if (isAlreadyPersisted) return true;
		return await navigator.storage.persist();
	} catch (err) {
		console.warn('Storage persistence request failed:', err);
		return false;
	}
}

/**
 * Retrieves storage diagnostics including persistence, quota usage, origin, and backup status.
 */
export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const isSupported = typeof window !== 'undefined' && Boolean(navigator.storage);

	let isPersisted = false;
	let quotaBytes: number | undefined;
	let usageBytes: number | undefined;

	if (isSupported) {
		try {
			if (navigator.storage.persisted) {
				isPersisted = await navigator.storage.persisted();
			}
			if (navigator.storage.estimate) {
				const estimate = await navigator.storage.estimate();
				quotaBytes = estimate.quota;
				usageBytes = estimate.usage;
			}
		} catch (err) {
			console.warn('Failed to retrieve storage estimates:', err);
		}
	}

	const snapshot = getEmergencySnapshot();

	return {
		isSupported,
		isPersisted,
		quotaBytes,
		usageBytes,
		usageFormatted: formatBytes(usageBytes),
		quotaFormatted: formatBytes(quotaBytes),
		origin,
		hasEmergencySnapshot: Boolean(snapshot),
		snapshotTimestamp: snapshot?.timestamp,
		snapshotEventsCount: snapshot?.eventsCount,
		snapshotTemplatesCount: snapshot?.templatesCount,
		snapshotCategoriesCount: snapshot?.categoriesCount
	};
}

/**
 * Saves a secondary emergency snapshot of the database into localStorage.
 * Automatically called during significant database updates.
 */
export function saveEmergencySnapshot(jsonString: string): boolean {
	if (typeof window === 'undefined') return false;
	try {
		const parsed = JSON.parse(jsonString);
		const data = parsed.data || parsed;
		const eventsCount = Array.isArray(data.events) ? data.events.length : 0;
		const templatesCount = Array.isArray(data.dayTemplates) ? data.dayTemplates.length : 0;
		const categoriesCount = Array.isArray(data.categories) ? data.categories.length : 0;

		// Only store snapshot if there is meaningful data to preserve
		if (eventsCount === 0 && templatesCount === 0 && categoriesCount === 0) {
			return false;
		}

		const meta: Omit<EmergencySnapshotMeta, 'dataJson'> = {
			timestamp: new Date().toISOString(),
			eventsCount,
			templatesCount,
			categoriesCount
		};

		localStorage.setItem(EMERGENCY_SNAPSHOT_META_KEY, JSON.stringify(meta));
		localStorage.setItem(EMERGENCY_SNAPSHOT_KEY, jsonString);
		return true;
	} catch (err) {
		// localStorage might be full or blocked in private mode
		console.warn('Emergency snapshot could not be saved to localStorage:', err);
		return false;
	}
}

/**
 * Retrieves the emergency snapshot from localStorage if available.
 */
export function getEmergencySnapshot(): EmergencySnapshotMeta | null {
	if (typeof window === 'undefined') return null;
	try {
		const dataJson = localStorage.getItem(EMERGENCY_SNAPSHOT_KEY);
		const metaRaw = localStorage.getItem(EMERGENCY_SNAPSHOT_META_KEY);
		if (!dataJson || !metaRaw) return null;

		const meta = JSON.parse(metaRaw);
		return {
			...meta,
			dataJson
		};
	} catch {
		return null;
	}
}

/**
 * Clears the emergency snapshot from localStorage.
 */
export function clearEmergencySnapshot(): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(EMERGENCY_SNAPSHOT_KEY);
		localStorage.removeItem(EMERGENCY_SNAPSHOT_META_KEY);
	} catch {
		// Ignore storage errors
	}
}
