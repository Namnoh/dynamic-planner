import { db, ensureDefaultCategories } from '$lib/db';
import { DEFAULT_CATEGORIES, type CustomCategory, type CategoryOption } from '$lib/types';

type Listener = (categories: CustomCategory[]) => void;
let listeners: Listener[] = [];
let currentCategories: CustomCategory[] = [...DEFAULT_CATEGORIES];
let isLoaded = false;

function notify() {
	listeners.forEach((fn) => fn(currentCategories));
}

export const categoriesStore = {
	subscribe(fn: Listener) {
		listeners.push(fn);
		fn(currentCategories);
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
		return currentCategories;
	},

	async addCategory(name: string, color: string): Promise<CustomCategory> {
		const trimmedName = name.trim();
		const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const newCat: CustomCategory = {
			id,
			name: trimmedName,
			color: color || '#3b82f6'
		};
		await db.categories.add(newCat);
		currentCategories = [...currentCategories, newCat];
		notify();
		return newCat;
	},

	async updateCategory(id: string, updates: Partial<Omit<CustomCategory, 'id'>>): Promise<void> {
		await db.categories.update(id, updates);
		currentCategories = currentCategories.map((c) => (c.id === id ? { ...c, ...updates } : c));
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
		return currentCategories;
	},

	get options(): CategoryOption[] {
		return [
			{ value: '', label: 'Sin categoría (Opcional)' },
			...currentCategories.map((c) => ({
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
