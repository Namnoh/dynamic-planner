<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { X } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		title,
		description,
		icon: IconComponent,
		maxWidth = 'max-w-md',
		closeOnBackdrop = true,
		closeOnEscape = true,
		headerSnippet,
		footerSnippet,
		children,
		onclose
	}: {
		isOpen: boolean;
		title?: string;
		description?: string;
		icon?: any;
		maxWidth?: string;
		closeOnBackdrop?: boolean;
		closeOnEscape?: boolean;
		headerSnippet?: Snippet;
		footerSnippet?: Snippet;
		children?: Snippet;
		onclose?: () => void;
	} = $props();

	function closeModal() {
		isOpen = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (closeOnEscape && e.key === 'Escape' && isOpen) {
			closeModal();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (closeOnBackdrop && e.target === e.currentTarget) {
			closeModal();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeModal();
		}}
	>
		<div
			class="w-full {maxWidth} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors"
		>
			<!-- Header -->
			{#if headerSnippet}
				{@render headerSnippet()}
			{:else if title}
				<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
					<div class="flex items-center gap-2.5">
						{#if IconComponent}
							<div class="rounded-xl bg-indigo-50 dark:bg-indigo-600/20 p-2 text-indigo-600 dark:text-indigo-400">
								<IconComponent class="h-5 w-5" />
							</div>
						{/if}
						<div>
							<h3 class="font-bold text-base sm:text-lg leading-tight">{title}</h3>
							{#if description}
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
							{/if}
						</div>
					</div>

					<button
						type="button"
						onclick={closeModal}
						class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
						aria-label="Cerrar modal"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			{/if}

			<!-- Content Body -->
			{#if children}
				{@render children()}
			{/if}

			<!-- Footer (if provided) -->
			{#if footerSnippet}
				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					{@render footerSnippet()}
				</div>
			{/if}
		</div>
	</div>
{/if}
