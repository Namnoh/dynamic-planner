import { db, ensureDefaultCategories } from '$lib/db';
import {
	DEFAULT_CATEGORIES,
	type CustomCategory,
	type CategoryOption,
	type CategorySortOption,
	sortCategories
} from '$lib/types';

type Listener = (categories: CustomCategory[]) => void;
let listeners: Listener[] = [];
let currentCategories: CustomCategory[] = [...DEFAULT_CATEGORIES];
let currentSort: CategorySortOption = 'default';
let isLoaded = false;

if (typeof window !== 'undefined') {
	const savedSort = localStorage.getItem('planner_categories_sort') as CategorySortOption | null;
	if (savedSort) currentSort = savedSort;
}

function notify() {
	const sorted = sortCategories(currentCategories, currentSort);
	listeners.forEach((fn) => fn(sorted));
}

export const categoriesStore = {
	subscribe(fn: Listener) {
		listeners.push(fn);
		fn(sortCategories(currentCategories, currentSort));
		if (!isLoaded && typeof window !== 'undefined') {
			categoriesStore.load();
		}
		return () => {
			listeners = listeners.filter((l) => l !== fn);
		};
	},

	async load(): Promise<CustomCategory[]> {
		if (typeof window === 'undefined') return currentCategories;
		try {
			await ensureDefaultCategories();
			const all = await db.categories.toArray();
			if (all.length > 0) {
				currentCategories = all;
			} else {
				currentCategories = [...DEFAULT_CATEGORIES];
			}
			isLoaded = true;
			notify();
		} catch (e) {
			console.error('Error loading categories:', e);
		}
		return sortCategories(currentCategories, currentSort);
	},

	setSort(sort: CategorySortOption) {
		currentSort = sort;
		if (typeof window !== 'undefined') {
			localStorage.setItem('planner_categories_sort', sort);
		}
		notify();
	},

	get sortOption(): CategorySortOption {
		return currentSort;
	},

	async addCategory(name: string, color: string): Promise<CustomCategory> {
		const trimmedName = name.trim();
		const now = Date.now();
		const id = `cat-${now}-${Math.random().toString(36).slice(2, 6)}`;
		const newCat: CustomCategory = {
			id,
			name: trimmedName,
			color: color || '#3b82f6',
			createdAt: now,
			updatedAt: now
		};
		await db.categories.add(newCat);
		currentCategories = [...currentCategories, newCat];
		notify();
		return newCat;
	},

	async updateCategory(id: string, updates: Partial<Omit<CustomCategory, 'id'>>): Promise<void> {
		const updatesWithTimestamp = {
			...updates,
			updatedAt: Date.now()
		};
		await db.categories.update(id, updatesWithTimestamp);
		currentCategories = currentCategories.map((c) =>
			c.id === id ? { ...c, ...updatesWithTimestamp } : c
		);
		notify();
	},

	async deleteCategory(id: string): Promise<void> {
		await db.categories.delete(id);
		currentCategories = currentCategories.filter((c) => c.id !== id);
		notify();
	},

	async resetToDefaults(): Promise<void> {
		await db.categories.clear();
		await db.categories.bulkAdd(DEFAULT_CATEGORIES);
		currentCategories = [...DEFAULT_CATEGORIES];
		notify();
	},

	get current(): CustomCategory[] {
		return sortCategories(currentCategories, currentSort);
	},

	get options(): CategoryOption[] {
		const sorted = sortCategories(currentCategories, currentSort);
		return [
			{ value: '', label: 'Sin categoría (Opcional)' },
			...sorted.map((c) => ({
				value: c.id,
				label: c.name,
				color: c.color
			}))
		];
	},

	getCategory(idOrName?: string): CustomCategory | undefined {
		if (!idOrName) return undefined;
		const query = idOrName.toLowerCase().trim();
		return currentCategories.find(
			(c) => c.id.toLowerCase() === query || c.name.toLowerCase() === query
		);
	}
};

