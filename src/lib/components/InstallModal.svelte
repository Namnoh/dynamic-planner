<script lang="ts">
	import Modal from './Modal.svelte';
	import { Download, Smartphone, Monitor, Share, PlusSquare, CheckCircle2 } from 'lucide-svelte';
	import { pwaInstallStore } from '$lib/stores/pwaInstall';

	let {
		isOpen = $bindable(false)
	}: {
		isOpen: boolean;
	} = $props();

	let installState = $state($pwaInstallStore);

	$effect(() => {
		const unsubscribe = pwaInstallStore.subscribe((val) => {
			installState = val;
		});
		return unsubscribe;
	});

	async function handleDirectInstall() {
		const res = await pwaInstallStore.promptInstall();
		if (res === 'accepted' || res === 'already-installed') {
			isOpen = false;
		}
	}
</script>

<Modal
	bind:isOpen
	title="Instalar Planificador Dinámico"
	description="Instala la aplicación en tu dispositivo para usarla a pantalla completa y 100% offline."
	icon={Download}
	maxWidth="max-w-lg"
>
	{#snippet children()}
		<div class="space-y-5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
			<!-- App Header Card -->
			<div class="flex items-center gap-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 p-4">
				<img
					src="/pwa-192x192.png"
					alt="Icono del Planificador"
					class="h-12 w-12 rounded-xl shadow-md shadow-indigo-600/20 shrink-0"
				/>
				<div>
					<h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
						Planificador Dinámico
					</h4>
					<p class="text-xs text-slate-500 dark:text-slate-400">
						Aplicación ligera sin publicidad ni consumo de datos
					</p>
				</div>
			</div>

			<!-- Direct Install Button if supported -->
			<button
				type="button"
				onclick={handleDirectInstall}
				class="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer text-sm"
			>
				<Download class="h-4 w-4" />
				<span>Instalar directamente en este dispositivo</span>
			</button>

			<!-- Platform Specific Guide -->
			{#if installState.isIOS}
				<!-- iOS Guide -->
				<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
					<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
						<Smartphone class="h-4 w-4" />
						<span>Instrucciones para iPhone / iPad (Safari)</span>
					</div>
					<ol class="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-decimal pl-4 leading-relaxed">
						<li>
							Abre esta página en el navegador <strong>Safari</strong> de Apple.
						</li>
						<li>
							Pulsa el botón <strong>Compartir</strong> <Share class="inline h-3.5 w-3.5 text-indigo-500 mx-0.5" /> (icono del cuadro con flecha hacia arriba en la barra de herramientas).
						</li>
						<li>
							Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong> <PlusSquare class="inline h-3.5 w-3.5 text-indigo-500 mx-0.5" />.
						</li>
						<li>
							Toca <strong>"Añadir"</strong> en la esquina superior derecha y la app quedará instalada como icono nativo.
						</li>
					</ol>
				</div>
			{:else}
				<!-- Android & Desktop Guide -->
				<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
					<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
						{#if installState.platform === 'android'}
							<Smartphone class="h-4 w-4" />
							<span>Instrucciones para Android (Chrome / Samsung / Brave)</span>
						{:else}
							<Monitor class="h-4 w-4" />
							<span>Instrucciones para PC / Mac (Chrome / Edge / Brave)</span>
						{/if}
					</div>
					<ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
						<li>
							• <strong>Desde el menú del navegador:</strong> Haz clic en el menú de los <strong>tres puntos (⋮)</strong> en la esquina superior y selecciona <em>"Instalar Planificador Dinámico"</em> o <em>"Añadir a pantalla de inicio"</em>.
						</li>
						<li>
							• <strong>Desde la barra de direcciones:</strong> En computadoras, haz clic en el icono de <strong>pantalla con flecha</strong> que aparece al final de la barra donde escribes la URL.
						</li>
					</ul>
				</div>
			{/if}

			<!-- Benefits -->
			<div class="grid grid-cols-2 gap-2.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
				<div class="flex items-center gap-1.5">
					<CheckCircle2 class="h-3.5 w-3.5 text-emerald-500 shrink-0" />
					<span>Funciona sin conexión a internet</span>
				</div>
				<div class="flex items-center gap-1.5">
					<CheckCircle2 class="h-3.5 w-3.5 text-emerald-500 shrink-0" />
					<span>Acceso directo sin barras del navegador</span>
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footerSnippet()}
		<div class="flex justify-end w-full">
			<button
				type="button"
				onclick={() => (isOpen = false)}
				class="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
			>
				Entendido
			</button>
		</div>
	{/snippet}
</Modal>
