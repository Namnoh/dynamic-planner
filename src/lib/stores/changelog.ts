import { writable } from 'svelte/store';
import { LATEST_VERSION } from '$lib/data/changelog';

const STORAGE_KEY = 'dynamic_planner_last_seen_changelog';

function createChangelogStore() {
	const { subscribe, set } = writable<boolean>(false);
	let isInitialized = false;

	function checkUnread() {
		if (typeof window === 'undefined') return;
		try {
			const lastSeen = localStorage.getItem(STORAGE_KEY);
			const hasUnread = lastSeen !== LATEST_VERSION;
			set(hasUnread);
			isInitialized = true;
		} catch {
			set(false);
		}
	}

	function markAsRead() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, LATEST_VERSION);
			set(false);
		} catch {
			// ignore storage errors
		}
	}

	return {
		subscribe,
		checkUnread,
		markAsRead,
		latestVersion: LATEST_VERSION
	};
}

export const changelogStore = createChangelogStore();
