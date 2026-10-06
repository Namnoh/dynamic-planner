<script lang="ts">
	import Modal from './Modal.svelte';
	import { CHANGELOG_DATA, type Release, type ChangelogCategory } from '$lib/data/changelog';
	import { changelogStore } from '$lib/stores/changelog';
	import {
		Sparkles,
		Rocket,
		Wrench,
		CheckCircle2,
		Calendar,
		Tag,
		History,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';

	let {
		isOpen = $bindable(false)
	}: {
		isOpen: boolean;
	} = $props();

	let expandedVersions = $state<Record<string, boolean>>({
		[CHANGELOG_DATA[0].version]: true
	});

	// Automatically mark as read when opened
	$effect(() => {
		if (isOpen) {
			changelogStore.markAsRead();
		}
	});

	function toggleVersion(version: string) {
		expandedVersions[version] = !expandedVersions[version];
	}

	function getCategoryMeta(type: ChangelogCategory) {
		switch (type) {
			case 'feat':
				return {
					label: 'Novedad',
					icon: Rocket,
					badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
					iconClass: 'text-emerald-600 dark:text-emerald-400'
				};
			case 'fix':
				return {
					label: 'Corrección',
					icon: Wrench,
					badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800/80',
					iconClass: 'text-rose-600 dark:text-rose-400'
				};
			case 'improvement':
				return {
					label: 'Mejora',
					icon: Sparkles,
					badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/80',
					iconClass: 'text-indigo-600 dark:text-indigo-400'
				};
		}
	}
</script>

<Modal
	bind:isOpen
	title="Novedades y Registro de Cambios"
	description="Historial de actualizaciones, nuevas características y correcciones de Dynamic Planner"
	icon={Sparkles}
	maxWidth="max-w-2xl"
>
	{#snippet children()}
		<div class="space-y-4 max-h-[68vh] overflow-y-auto pr-1 text-xs sm:text-sm scrollbar-thin">
			{#each CHANGELOG_DATA as release, index (release.version)}
				{@const isExpanded = expandedVersions[release.version] ?? (index === 0)}
				<article
					class="rounded-2xl border transition-all duration-200 overflow-hidden {index === 0
						? 'border-indigo-500/40 bg-white/90 dark:bg-slate-900/80 shadow-sm ring-1 ring-indigo-500/20'
						: 'border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40'}"
				>
					<!-- Header Button / Accordion Trigger -->
					<button
						type="button"
						onclick={() => toggleVersion(release.version)}
						class="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
					>
						<div class="flex items-center gap-2.5 flex-wrap">
							<!-- Version tag -->
							<span
								class="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold font-mono tracking-tight {index === 0
									? 'bg-indigo-600 text-white shadow-xs'
									: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
							>
								<Tag class="h-3 w-3" />
								v{release.version}
							</span>

							<!-- Release Title -->
							<h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">
								{release.title}
							</h4>

							<!-- Badge for current version -->
							{#if release.badge}
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
								>
									{release.badge}
								</span>
							{/if}
						</div>

						<div class="flex items-center gap-2 shrink-0">
							<!-- Date -->
							<span class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
								<Calendar class="h-3 w-3" />
								{release.date}
							</span>

							<!-- Arrow -->
							<span class="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
								{#if isExpanded}
									<ChevronUp class="h-4 w-4" />
								{:else}
									<ChevronDown class="h-4 w-4" />
								{/if}
							</span>
						</div>
					</button>

					<!-- Content Body -->
					{#if isExpanded}
						<div class="px-3.5 sm:px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/60 space-y-3 animate-in fade-in duration-150">
							{#if release.description}
								<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
									{release.description}
								</p>
							{/if}

							<!-- Changelog Items List -->
							<div class="space-y-2 pt-1">
								{#each release.items as item}
									{@const meta = getCategoryMeta(item.type)}
									<div
										class="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60"
									>
										<!-- Category Pill -->
										<span
											class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0 mt-0.5 {meta.badgeClass}"
										>
											<meta.icon class="h-2.5 w-2.5 {meta.iconClass}" />
											{meta.label}
										</span>

										<!-- Text & Detail -->
										<div class="flex-1 space-y-0.5">
											<p class="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
												{item.text}
											</p>
											{#if item.detail}
												<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
													{item.detail}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/snippet}

	{#snippet footerSnippet()}
		<div class="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
			<span class="flex items-center gap-1 font-mono text-[11px]">
				<History class="h-3.5 w-3.5 text-indigo-500" />
				Versión actual: v{CHANGELOG_DATA[0].version}
			</span>
			<button
				type="button"
				onclick={() => (isOpen = false)}
				class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer shadow-xs"
			>
				Entendido
			</button>
		</div>
	{/snippet}
</Modal>
