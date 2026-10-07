<script lang="ts">
	import {
		type RecurrenceConfig,
		type RecurrenceFrequency,
		type RecurrenceRangeType,
		ISO_DAY_NAMES,
		calculateRecurrenceDates,
		getRecurrenceLabel
	} from '$lib/types';
	import { Repeat, Calendar, Info } from 'lucide-svelte';

	let {
		value = $bindable<RecurrenceConfig>({ frequency: 'none' }),
		showRangeOptions = true,
		startDate = '',
		allowNone = true
	}: {
		value: RecurrenceConfig;
		showRangeOptions?: boolean;
		startDate?: string;
		allowNone?: boolean;
	} = $props();

	const frequencies = $derived.by(() => [
		...(allowNone ? [{ value: 'none' as RecurrenceFrequency, label: 'Sin repetición' }] : []),
		{ value: 'daily' as RecurrenceFrequency, label: 'Todos los días' },
		{ value: 'weekdays' as RecurrenceFrequency, label: 'Lunes a Viernes' },
		{ value: 'weekends' as RecurrenceFrequency, label: 'Sábados y Domingos' },
		{ value: 'custom_days' as RecurrenceFrequency, label: 'Días específicos' },
		{ value: 'monthly_day' as RecurrenceFrequency, label: 'Mismo día cada mes' }
	]);

	const daysList = [
		{ id: 1, short: 'Lun', full: 'Lunes' },
		{ id: 2, short: 'Mar', full: 'Martes' },
		{ id: 3, short: 'Mié', full: 'Miércoles' },
		{ id: 4, short: 'Jue', full: 'Jueves' },
		{ id: 5, short: 'Vie', full: 'Viernes' },
		{ id: 6, short: 'Sáb', full: 'Sábado' },
		{ id: 7, short: 'Dom', full: 'Domingo' }
	];

	function handleFrequencyChange(freq: RecurrenceFrequency) {
		value.frequency = freq;
		if (freq === 'custom_days' && (!value.customDays || value.customDays.length === 0)) {
			value.customDays = [1, 2, 3, 4, 5]; // Default Mon-Fri
		}
		if (freq === 'monthly_day' && !value.dayOfMonth) {
			const d = startDate ? new Date(startDate) : new Date();
			value.dayOfMonth = d.getDate() || 1;
		}
		if (showRangeOptions && !value.rangeType) {
			value.rangeType = 'weeks';
			value.weeksCount = 4;
		}
	}

	function toggleDay(dayId: number) {
		const current = value.customDays || [];
		if (current.includes(dayId)) {
			// Don't remove if it's the last selected day
			if (current.length > 1) {
				value.customDays = current.filter((d) => d !== dayId);
			}
		} else {
			value.customDays = [...current, dayId].sort((a, b) => a - b);
		}
	}

	const previewDates = $derived.by(() => {
		if (!startDate || value.frequency === 'none') return [];
		try {
			return calculateRecurrenceDates(startDate, value);
		} catch {
			return [];
		}
	});
</script>

<div class="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div class="flex h-6 w-6 items-center center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
				<Repeat class="h-3.5 w-3.5" />
			</div>
			<span class="text-xs font-semibold text-slate-800 dark:text-slate-200">
				Configuración de Recurrencia
			</span>
		</div>
		{#if value.frequency !== 'none'}
			<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
				{getRecurrenceLabel(value)}
			</span>
		{/if}
	</div>

	<!-- Frequency selection -->
	<div>
		<label for="recurrence-freq-select" class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
			Frecuencia de repetición
		</label>
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
			{#each frequencies as freq}
				<button
					type="button"
					onclick={() => handleFrequencyChange(freq.value)}
					class="px-2.5 py-1.5 text-[11px] rounded-xl border text-center font-medium transition-all cursor-pointer {value.frequency === freq.value
						? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
						: 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'}"
				>
					{freq.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Custom Days Selection -->
	{#if value.frequency === 'custom_days'}
		<div class="space-y-1.5 pt-1">
			<span class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
				Días de la semana
			</span>
			<div class="flex items-center gap-1 sm:gap-1.5 flex-wrap">
				{#each daysList as day}
					{@const isSelected = (value.customDays || []).includes(day.id)}
					<button
						type="button"
						title={day.full}
						onclick={() => toggleDay(day.id)}
						class="flex-1 min-w-[36px] py-1.5 text-[11px] rounded-lg border font-semibold text-center transition-all cursor-pointer {isSelected
							? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
							: 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}"
					>
						{day.short}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Day of Month Selection -->
	{#if value.frequency === 'monthly_day'}
		<div class="flex items-center gap-2 pt-1">
			<label for="day-of-month-input" class="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
				Repetir el día:
			</label>
			<input
				id="day-of-month-input"
				type="number"
				min="1"
				max="31"
				bind:value={value.dayOfMonth}
				class="w-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
			/>
			<span class="text-[11px] text-slate-500 dark:text-slate-400">de cada mes (1 - 31)</span>
		</div>
	{/if}

	<!-- Range Selection (for Blocks or manual scheduling) -->
	{#if showRangeOptions && value.frequency !== 'none'}
		<div class="border-t border-slate-200/80 dark:border-slate-800/80 pt-3 space-y-2.5">
			<span class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
				Rango de repetición
			</span>

			<div class="grid grid-cols-3 gap-1.5 text-[11px]">
				<button
					type="button"
					onclick={() => { value.rangeType = 'current_week'; }}
					class="px-2 py-1.5 rounded-xl border font-medium text-center transition-all cursor-pointer {value.rangeType === 'current_week'
						? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
						: 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
				>
					Esta semana
				</button>
				<button
					type="button"
					onclick={() => { value.rangeType = 'weeks'; if (!value.weeksCount) value.weeksCount = 4; }}
					class="px-2 py-1.5 rounded-xl border font-medium text-center transition-all cursor-pointer {value.rangeType === 'weeks'
						? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
						: 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
				>
					Varias semanas
				</button>
				<button
					type="button"
					onclick={() => { value.rangeType = 'until_date'; }}
					class="px-2 py-1.5 rounded-xl border font-medium text-center transition-all cursor-pointer {value.rangeType === 'until_date'
						? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
						: 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
				>
					Hasta fecha
				</button>
			</div>

			{#if value.rangeType === 'weeks'}
				<div class="flex items-center gap-1.5 flex-wrap pt-0.5">
					<span class="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Repetir por:</span>
					{#each [2, 4, 8, 12, 26] as w}
						<button
							type="button"
							onclick={() => { value.weeksCount = w; }}
							class="px-2 py-1 text-[11px] rounded-lg border font-medium transition-all cursor-pointer {value.weeksCount === w
								? 'border-indigo-600 bg-indigo-600 text-white'
								: 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'}"
						>
							{w} sem{w === 4 ? ' (~1 mes)' : w === 26 ? ' (~6 meses)' : ''}
						</button>
					{/each}
				</div>
			{/if}

			{#if value.rangeType === 'until_date'}
				<div class="flex items-center gap-2 pt-0.5">
					<label for="recurrence-end-date" class="text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
						Fecha límite:
					</label>
					<input
						id="recurrence-end-date"
						type="date"
						bind:value={value.endDate}
						class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
					/>
				</div>
			{/if}

			<!-- Preview Info -->
			{#if previewDates.length > 0}
				<div class="flex items-start gap-1.5 p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 text-[11px] text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
					<Info class="h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-500" />
					<span>
						Se programarán <strong>{previewDates.length}</strong> bloques (del {previewDates[0]} al {previewDates[previewDates.length - 1]}).
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
