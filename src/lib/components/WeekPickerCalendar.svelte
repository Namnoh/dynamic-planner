<script lang="ts">
	import {
		ChevronLeft,
		ChevronRight,
		RotateCcw
	} from 'lucide-svelte';
	import { getMondayOfCurrentWeek } from '$lib/db';

	let {
		currentMonday,
		isOpen = false,
		onSelectWeek,
		onClose
	}: {
		currentMonday: Date;
		isOpen: boolean;
		onSelectWeek: (monday: Date) => void;
		onClose: () => void;
	} = $props();

	const MONTH_NAMES = [
		'Enero',
		'Febrero',
		'Marzo',
		'Abril',
		'Mayo',
		'Junio',
		'Julio',
		'Agosto',
		'Septiembre',
		'Octubre',
		'Noviembre',
		'Diciembre'
	];

	const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

	// Local state for calendar view (year and month currently being viewed)
	let viewYear = $state<number>(new Date().getFullYear());
	let viewMonth = $state<number>(new Date().getMonth());

	// Synchronize viewed month/year when currentMonday changes or when opening
	$effect(() => {
		if (isOpen) {
			viewYear = currentMonday.getFullYear();
			viewMonth = currentMonday.getMonth();
		}
	});

	// Years list for quick selector: 5 years back, 6 years forward
	const availableYears = $derived.by(() => {
		const currentYear = new Date().getFullYear();
		const years: number[] = [];
		for (let y = currentYear - 5; y <= currentYear + 6; y++) {
			years.push(y);
		}
		if (!years.includes(viewYear)) {
			years.push(viewYear);
			years.sort((a, b) => a - b);
		}
		return years;
	});

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear--;
		} else {
			viewMonth--;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear++;
		} else {
			viewMonth++;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	interface CalendarDay {
		date: Date;
		dayNumber: number;
		isCurrentMonth: boolean;
		isToday: boolean;
	}

	interface CalendarWeek {
		mondayDate: Date;
		isCurrentPlannerWeek: boolean;
		days: CalendarDay[];
	}

	const weeks = $derived.by(() => {
		const result: CalendarWeek[] = [];
		const today = new Date();
		const todayYear = today.getFullYear();
		const todayMonth = today.getMonth();
		const todayDate = today.getDate();

		const plannerMondayYear = currentMonday.getFullYear();
		const plannerMondayMonth = currentMonday.getMonth();
		const plannerMondayDate = currentMonday.getDate();

		// Find first day of the month
		const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
		const dayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday, etc.
		const offsetFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

		const cursor = new Date(viewYear, viewMonth, 1 - offsetFromMonday);
		cursor.setHours(0, 0, 0, 0);

		for (let w = 0; w < 6; w++) {
			const weekMonday = new Date(cursor);
			const isCurrentPlannerWeek =
				weekMonday.getFullYear() === plannerMondayYear &&
				weekMonday.getMonth() === plannerMondayMonth &&
				weekMonday.getDate() === plannerMondayDate;

			const days: CalendarDay[] = [];
			let hasDaysInCurrentMonth = false;

			for (let d = 0; d < 7; d++) {
				const dayDate = new Date(cursor);
				const inMonth = dayDate.getMonth() === viewMonth;
				if (inMonth) hasDaysInCurrentMonth = true;

				const isToday =
					dayDate.getFullYear() === todayYear &&
					dayDate.getMonth() === todayMonth &&
					dayDate.getDate() === todayDate;

				days.push({
					date: dayDate,
					dayNumber: dayDate.getDate(),
					isCurrentMonth: inMonth,
					isToday
				});

				cursor.setDate(cursor.getDate() + 1);
			}

			// Don't show a 6th week row if it doesn't belong to the viewed month at all
			if (w === 5 && !hasDaysInCurrentMonth) {
				break;
			}

			result.push({
				mondayDate: weekMonday,
				isCurrentPlannerWeek,
				days
			});
		}

		return result;
	});

	function selectWeek(weekMonday: Date) {
		onSelectWeek(weekMonday);
		onClose();
	}

	function goToTodayWeek() {
		const todayMonday = getMondayOfCurrentWeek();
		selectWeek(todayMonday);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Click-outside backdrop -->
<button
	type="button"
	class="fixed inset-0 z-40 bg-slate-900/25 dark:bg-black/50 backdrop-blur-xs cursor-default w-screen h-screen"
	onclick={onClose}
	aria-label="Cerrar calendario"
></button>

<!-- Popover Container -->
<div
	class="absolute top-full left-0 mt-2 z-50 w-76 sm:w-84 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl shadow-slate-900/30 dark:shadow-black/80 transition-all select-none isolate"
	role="dialog"
	aria-modal="true"
	aria-label="Selector de semana y fecha"
	tabindex="-1"
	onclick={(e) => e.stopPropagation()}
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose();
		else e.stopPropagation();
	}}
	onpointerdown={(e) => e.stopPropagation()}
>
	<!-- Calendar Header: Nav arrows, Month & Year Selectors -->
	<div class="flex items-center justify-between gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
		<button
			type="button"
			onclick={prevMonth}
			class="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
			title="Mes anterior"
			aria-label="Mes anterior"
		>
			<ChevronLeft class="h-4 w-4" />
		</button>

		<div class="flex items-center gap-1.5">
			<!-- Month Selector -->
			<select
				bind:value={viewMonth}
				class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden cursor-pointer"
				aria-label="Seleccionar mes"
			>
				{#each MONTH_NAMES as monthName, idx}
					<option value={idx}>{monthName}</option>
				{/each}
			</select>

			<!-- Year Selector -->
			<select
				bind:value={viewYear}
				class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden cursor-pointer"
				aria-label="Seleccionar año"
			>
				{#each availableYears as year}
					<option value={year}>{year}</option>
				{/each}
			</select>
		</div>

		<button
			type="button"
			onclick={nextMonth}
			class="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
			title="Mes siguiente"
			aria-label="Mes siguiente"
		>
			<ChevronRight class="h-4 w-4" />
		</button>
	</div>

	<!-- Day Labels (Lu, Ma, Mi, Ju, Vi, Sá, Do) -->
	<div class="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
		{#each DAY_LABELS as label}
			<span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
				{label}
			</span>
		{/each}
	</div>

	<!-- Weeks & Days Grid -->
	<div class="space-y-1 pt-1">
		{#each weeks as week}
			<button
				type="button"
				onclick={() => selectWeek(week.mondayDate)}
				class="w-full grid grid-cols-7 gap-1 p-1 rounded-xl transition-all cursor-pointer group text-left {week.isCurrentPlannerWeek
					? 'bg-indigo-100/90 dark:bg-indigo-950/80 ring-1 ring-indigo-500/60 shadow-xs'
					: 'hover:bg-slate-100 dark:hover:bg-slate-800/70'}"
				title="Seleccionar semana del {week.days[0].dayNumber} al {week.days[6].dayNumber}"
				aria-label="Semana del {week.days[0].dayNumber} al {week.days[6].dayNumber}"
			>
				{#each week.days as day}
					<div
						class="flex flex-col items-center justify-center h-7 rounded-lg text-xs transition-colors {day.isToday
							? 'font-extrabold ring-1 ring-indigo-500 text-indigo-600 dark:text-indigo-400'
							: ''} {day.isCurrentMonth
							? week.isCurrentPlannerWeek
								? 'text-indigo-950 dark:text-indigo-200 font-bold'
								: 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
							: 'text-slate-400/60 dark:text-slate-600'}"
					>
						<span>{day.dayNumber}</span>
						{#if day.isToday}
							<span class="h-1 w-1 rounded-full bg-indigo-600 dark:bg-indigo-400 -mt-0.5"></span>
						{/if}
					</div>
				{/each}
			</button>
		{/each}
	</div>

	<!-- Calendar Footer: Quick "Ir a hoy" & "Cerrar" -->
	<div class="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
		<button
			type="button"
			onclick={goToTodayWeek}
			class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
		>
			<RotateCcw class="h-3 w-3" />
			Semana actual (Hoy)
		</button>
		<button
			type="button"
			onclick={onClose}
			class="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
		>
			Cerrar
		</button>
	</div>
</div>
