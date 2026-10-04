<script lang="ts">
	import { ChevronDown, Search, X, Check } from 'lucide-svelte';

	export interface SelectOption {
		value: string | number;
		label: string;
		sublabel?: string;
		color?: string;
	}

	let {
		value = $bindable(''),
		options = [],
		placeholder = 'Seleccionar...',
		searchPlaceholder = 'Buscar...',
		disabled = false,
		class: containerClass = 'w-full',
		buttonClass = '',
		dropdownClass = '',
		showSearch = true,
		searchThreshold = 3,
		align = 'left',
		id = undefined,
		ariaLabel = undefined,
		onchange = undefined
	}: {
		value?: any;
		options: SelectOption[];
		placeholder?: string;
		searchPlaceholder?: string;
		disabled?: boolean;
		class?: string;
		buttonClass?: string;
		dropdownClass?: string;
		showSearch?: boolean;
		searchThreshold?: number;
		align?: 'left' | 'right';
		id?: string;
		ariaLabel?: string;
		onchange?: (value: any) => void;
	} = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');
	let highlightedIndex = $state(0);
	let containerRef = $state<HTMLElement | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let optionsListRef = $state<HTMLUListElement | null>(null);

	const selectedOption = $derived.by(() => {
		if (value === undefined || value === null) return undefined;
		return options.find((opt) => String(opt.value) === String(value));
	});

	const filteredOptions = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return options;
		return options.filter((opt) => {
			const label = String(opt.label || '').toLowerCase();
			const sublabel = String(opt.sublabel || '').toLowerCase();
			return label.includes(q) || sublabel.includes(q);
		});
	});

	$effect(() => {
		if (!isOpen) return;
		if (filteredOptions.length > 0) {
			const activeIdx = filteredOptions.findIndex(
				(opt) => String(opt.value) === String(value)
			);
			highlightedIndex = activeIdx >= 0 ? activeIdx : 0;
		} else {
			highlightedIndex = 0;
		}
	});

	function toggleDropdown() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
			if (showSearch && options.length >= searchThreshold) {
				setTimeout(() => {
					searchInputRef?.focus();
				}, 50);
			}
		}
	}

	function selectOption(optValue: string | number) {
		value = optValue;
		isOpen = false;
		searchQuery = '';
		onchange?.(optValue);
	}

	function handleWindowClick(e: MouseEvent) {
		if (!isOpen || !containerRef) return;
		if (!containerRef.contains(e.target as Node)) {
			isOpen = false;
			searchQuery = '';
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			isOpen = false;
			searchQuery = '';
		}
	}

	function handleKeyNav(e: KeyboardEvent) {
		if (!isOpen) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
				e.preventDefault();
				toggleDropdown();
			}
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filteredOptions.length > 0) {
				highlightedIndex = (highlightedIndex + 1) % filteredOptions.length;
				scrollHighlightedIntoView();
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filteredOptions.length > 0) {
				highlightedIndex =
					(highlightedIndex - 1 + filteredOptions.length) % filteredOptions.length;
				scrollHighlightedIntoView();
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredOptions[highlightedIndex]) {
				selectOption(filteredOptions[highlightedIndex].value);
			}
		}
	}

	function scrollHighlightedIntoView() {
		setTimeout(() => {
			if (!optionsListRef) return;
			const items = optionsListRef.querySelectorAll<HTMLButtonElement>('button[role="option"]');
			if (items[highlightedIndex]) {
				items[highlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}, 10);
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div
	bind:this={containerRef}
	class="relative inline-block {containerClass}"
>
	<!-- Trigger Button -->
	<button
		type="button"
		{id}
		{disabled}
		aria-label={ariaLabel || placeholder}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		onclick={toggleDropdown}
		onkeydown={handleKeyNav}
		class="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs {buttonClass}"
	>
		<div class="flex items-center gap-2 truncate">
			{#if selectedOption?.color}
				<span
					class="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
					style="background-color: {selectedOption.color};"
				></span>
			{/if}
			<span class="truncate {selectedOption ? 'font-medium' : 'text-slate-400 dark:text-slate-500'}">
				{selectedOption ? selectedOption.label : placeholder}
			</span>
		</div>
		<ChevronDown
			class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 {isOpen
				? 'rotate-180 text-indigo-600 dark:text-indigo-400'
				: ''}"
		/>
	</button>

	<!-- Dropdown Popover -->
	{#if isOpen}
		<div
			class="absolute top-full mt-1.5 w-full min-w-44 z-[60] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/60 overflow-hidden {align === 'right' ? 'right-0' : 'left-0'} {dropdownClass}"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key !== 'Escape') e.stopPropagation();
			}}
		>
			<!-- Search Bar -->
			{#if showSearch && options.length >= searchThreshold}
				<div class="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
					<div class="relative flex items-center">
						<Search class="h-3.5 w-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
						<input
							bind:this={searchInputRef}
							type="text"
							bind:value={searchQuery}
							placeholder={searchPlaceholder}
							onkeydown={handleKeyNav}
							class="w-full rounded-lg bg-white dark:bg-slate-800 pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 transition-colors"
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={() => (searchQuery = '')}
								class="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
								title="Limpiar búsqueda"
								aria-label="Limpiar búsqueda"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Options List -->
			<ul bind:this={optionsListRef} class="max-h-56 overflow-y-auto p-1 space-y-0.5" role="listbox">
				{#if filteredOptions.length === 0}
					<li class="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
						No se encontraron resultados
					</li>
				{:else}
					{#each filteredOptions as opt, idx}
						<li>
							<button
								type="button"
								role="option"
								aria-selected={String(value) === String(opt.value)}
								onclick={() => selectOption(opt.value)}
								onmouseenter={() => (highlightedIndex = idx)}
								class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left {String(value) === String(opt.value)
									? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
									: highlightedIndex === idx
										? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
										: 'text-slate-700 dark:text-slate-200'}"
							>
								<div class="flex items-center gap-2 truncate">
									{#if opt.color}
										<span
											class="h-2.5 w-2.5 rounded-full shrink-0"
											style="background-color: {opt.color};"
										></span>
									{/if}
									<span class="truncate">{opt.label}</span>
									{#if opt.sublabel}
										<span class="text-[10px] text-slate-400 dark:text-slate-500 truncate">
											{opt.sublabel}
										</span>
									{/if}
								</div>
								{#if String(value) === String(opt.value)}
									<Check class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
								{/if}
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	{/if}
</div>
