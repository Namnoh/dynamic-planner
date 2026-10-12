<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Clock, Check } from 'lucide-svelte';

	let {
		id,
		value = $bindable('09:00'),
		disabled = false,
		hasError = false,
		class: customClass = '',
		onchange,
		oninput
	}: {
		id?: string;
		value?: string;
		disabled?: boolean;
		hasError?: boolean;
		class?: string;
		onchange?: (val: string) => void;
		oninput?: (val: string) => void;
	} = $props();

	let isOpen = $state(false);
	let containerElement: HTMLElement | null = $state(null);
	let hoursListElement: HTMLElement | null = $state(null);
	let minutesListElement: HTMLElement | null = $state(null);

	// Parse current hour and minute from value
	const parsedTime = $derived.by(() => {
		if (!value || !value.includes(':')) {
			return { hour: 9, minute: 0, hourStr: '09', minuteStr: '00' };
		}
		const [hStr, mStr] = value.split(':');
		const h = parseInt(hStr, 10);
		const m = parseInt(mStr, 10);
		const validH = isNaN(h) ? 9 : Math.min(23, Math.max(0, h));
		const validM = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
		return {
			hour: validH,
			minute: validM,
			hourStr: String(validH).padStart(2, '0'),
			minuteStr: String(validM).padStart(2, '0')
		};
	});

	const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
	const commonMinutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

	function updateTime(newHourStr: string, newMinuteStr: string) {
		const formatted = `${newHourStr}:${newMinuteStr}`;
		value = formatted;
		oninput?.(formatted);
		onchange?.(formatted);
	}

	function handleHourSelect(hStr: string) {
		updateTime(hStr, parsedTime.minuteStr);
	}

	function handleMinuteSelect(mStr: string) {
		updateTime(parsedTime.hourStr, mStr);
	}

	function handleDirectInput(e: Event) {
		const input = e.target as HTMLInputElement;
		let raw = input.value.trim();

		// Filter non-digits except colon
		raw = raw.replace(/[^0-9:]/g, '');

		// Handle raw 4-digit input (e.g. "1345" -> "13:45")
		if (raw.length === 4 && !raw.includes(':')) {
			raw = `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
		}

		if (raw.includes(':')) {
			const [hPart, mPart] = raw.split(':');
			let hNum = parseInt(hPart, 10);
			let mNum = parseInt(mPart, 10);

			if (!isNaN(hNum)) hNum = Math.min(23, Math.max(0, hNum));
			if (!isNaN(mNum)) mNum = Math.min(59, Math.max(0, mNum));

			const finalH = isNaN(hNum) ? '' : String(hNum).padStart(2, '0');
			const finalM = isNaN(mNum) ? '' : String(mNum).padStart(2, '0');

			if (finalH && finalM) {
				const formatted = `${finalH}:${finalM}`;
				value = formatted;
				oninput?.(formatted);
				onchange?.(formatted);
				return;
			}
		}

		value = raw;
		oninput?.(raw);
	}

	function handleBlur() {
		// Ensure standard HH:mm format on blur
		if (!value || !value.includes(':')) {
			value = '09:00';
			onchange?.('09:00');
			return;
		}

		const [hPart, mPart] = value.split(':');
		let hNum = parseInt(hPart, 10);
		let mNum = parseInt(mPart, 10);

		if (isNaN(hNum)) hNum = 9;
		if (isNaN(mNum)) mNum = 0;

		hNum = Math.min(23, Math.max(0, hNum));
		mNum = Math.min(59, Math.max(0, mNum));

		const formatted = `${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`;
		if (value !== formatted) {
			value = formatted;
			onchange?.(formatted);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			incrementMinutes(15);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			incrementMinutes(-15);
		} else if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	function incrementMinutes(delta: number) {
		let total = parsedTime.hour * 60 + parsedTime.minute + delta;
		if (total < 0) total += 24 * 60;
		total = total % (24 * 60);

		const newH = Math.floor(total / 60);
		const newM = total % 60;
		updateTime(String(newH).padStart(2, '0'), String(newM).padStart(2, '0'));
	}

	async function togglePopover() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			await tick();
			scrollToActive();
		}
	}

	function scrollToActive() {
		if (hoursListElement) {
			const activeHourEl = hoursListElement.querySelector('[data-active="true"]');
			if (activeHourEl) {
				activeHourEl.scrollIntoView({ block: 'center', behavior: 'instant' });
			}
		}
		if (minutesListElement) {
			const activeMinEl = minutesListElement.querySelector('[data-active="true"]');
			if (activeMinEl) {
				activeMinEl.scrollIntoView({ block: 'center', behavior: 'instant' });
			}
		}
	}

	onMount(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (isOpen && containerElement && !containerElement.contains(e.target as Node)) {
				isOpen = false;
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
</script>

<div bind:this={containerElement} class="relative w-full">
	<!-- Input Box -->
	<div class="relative flex items-center">
		<input
			{id}
			type="text"
			inputmode="numeric"
			placeholder="00:00"
			maxlength="5"
			value={value}
			{disabled}
			oninput={handleDirectInput}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			class="w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-1.5 pr-8 text-xs font-mono font-semibold tracking-wide text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden transition-colors {hasError
				? 'border-rose-500 focus:border-rose-500'
				: 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'} {customClass}"
		/>

		<!-- Clock Icon Toggle Button -->
		<button
			type="button"
			tabindex="-1"
			onclick={togglePopover}
			{disabled}
			class="absolute right-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer disabled:opacity-40"
			title="Abrir selector de hora 24h"
			aria-label="Abrir selector de hora 24h"
		>
			<Clock class="h-3.5 w-3.5" />
		</button>
	</div>

	<!-- 24-Hour Popover Dropdown -->
	{#if isOpen}
		<div
			class="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 shadow-xl transition-all animate-in fade-in zoom-in-95 duration-150"
			role="dialog"
			aria-modal="true"
		>
			<!-- Popover Header -->
			<div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
				<div class="flex items-center gap-1.5">
					<Clock class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
					<span class="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
						{parsedTime.hourStr}:{parsedTime.minuteStr}
					</span>
				</div>
				<span class="rounded bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
					24 Horas
				</span>
			</div>

			<!-- Hours and Minutes Columns -->
			<div class="grid grid-cols-2 gap-2 text-xs">
				<!-- Hours Column (00 to 23) -->
				<div>
					<span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 px-1">
						Hora
					</span>
					<div
						bind:this={hoursListElement}
						class="h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-1 space-y-0.5 overscroll-contain"
					>
						{#each hours as hStr}
							{@const isActive = hStr === parsedTime.hourStr}
							<button
								type="button"
								data-active={isActive}
								onclick={() => handleHourSelect(hStr)}
								class="w-full rounded-md py-1 px-2 text-center text-xs font-mono font-medium transition-all cursor-pointer {isActive
									? 'bg-indigo-600 text-white font-bold shadow-2xs'
									: 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'}"
							>
								{hStr}
							</button>
						{/each}
					</div>
				</div>

				<!-- Minutes Column -->
				<div>
					<span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 px-1">
						Minutos
					</span>
					<div
						bind:this={minutesListElement}
						class="h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-1 space-y-0.5 overscroll-contain"
					>
						{#each commonMinutes as mStr}
							{@const isActive = mStr === parsedTime.minuteStr}
							<button
								type="button"
								data-active={isActive}
								onclick={() => handleMinuteSelect(mStr)}
								class="w-full rounded-md py-1 px-2 text-center text-xs font-mono font-medium transition-all cursor-pointer {isActive
									? 'bg-indigo-600 text-white font-bold shadow-2xs'
									: 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'}"
							>
								{mStr}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Quick Minute Presets & Close -->
			<div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
				<div class="flex items-center gap-1">
					{#each ['00', '15', '30', '45'] as quickM}
						<button
							type="button"
							onclick={() => handleMinuteSelect(quickM)}
							class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer {parsedTime.minuteStr === quickM
								? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold'
								: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}"
						>
							:{quickM}
						</button>
					{/each}
				</div>

				<button
					type="button"
					onclick={() => (isOpen = false)}
					class="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-0.5 shadow-2xs"
				>
					<Check class="h-3 w-3" />
					<span>Listo</span>
				</button>
			</div>
		</div>
	{/if}
</div>
