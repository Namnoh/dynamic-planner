<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import { Html5Qrcode } from 'html5-qrcode';
	import Modal from './Modal.svelte';
	import {
		exportDatabaseToJson,
		importDatabaseFromJson,
		type ExportScope,
		type ImportMode
	} from '$lib/db';
	import {
		createSingleQrPayload,
		processScannedQr,
		shareOrDownloadPlannerFile
	} from '$lib/utils/transfer';
	import { toastStore } from '$lib/utils/notifications';
	import {
		QrCode,
		Share2,
		Upload,
		Download,
		Camera,
		Check,
		AlertCircle,
		Copy,
		Sparkles,
		Layers,
		Calendar,
		RefreshCw,
		FileCode2,
		Smartphone,
		Image as ImageIcon,
		HelpCircle,
		Send,
		Inbox,
		ShieldCheck
	} from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		onDataImported
	}: {
		isOpen: boolean;
		onDataImported?: () => void;
	} = $props();

	// Primary Tabs: 'qr' (Option 4: Single static QR) | 'share' (Option 3: WhatsApp/AirDrop .planner)
	let activeTab = $state<'qr' | 'share'>('qr');

	// QR Submode: 'send' | 'receive'
	let qrRole = $state<'send' | 'receive'>('send');

	// Share Submode: 'send' | 'receive'
	let shareRole = $state<'send' | 'receive'>('send');

	// --- SENDER QR STATE ---
	let qrSendScope = $state<ExportScope>('current_week');
	let qrDataUrl = $state('');
	let qrSvgMarkup = $state('');
	let qrGenerationError = $state('');
	let qrCharLength = $state(0);
	let isQrTooLarge = $state(false);
	let isGeneratingQr = $state(false);
	let senderStats = $state<{ activities: number; templates: number; events: number } | null>(null);

	// --- RECEIVER QR & CAMERA STATE ---
	let html5QrScanner: Html5Qrcode | null = null;
	let isCameraScanning = $state(false);
	let cameraError = $state('');
	let receivedJson = $state<string | null>(null);
	let parsedPreview = $state<{
		activitiesCount: number;
		templatesCount: number;
		eventsCount: number;
		scope?: string;
	} | null>(null);
	let receiverImportMode = $state<ImportMode>('merge');
	let isImporting = $state(false);

	// --- SHARE TAB STATE ---
	let shareScope = $state<ExportScope>('full');
	let isSharing = $state(false);
	let shareFileImportMode = $state<ImportMode>('merge');
	let showJsonAdvanced = $state(false);

	// Stop camera if modal closes
	$effect(() => {
		const open = isOpen;
		if (!open) {
			untrack(() => {
				stopCameraScanner();
				resetTransferState();
			});
		}
	});

	// If switching away from receive tab, stop camera
	$effect(() => {
		if (activeTab !== 'qr' || qrRole !== 'receive') {
			untrack(() => {
				stopCameraScanner();
			});
		}
	});

	// Whenever QR tab, role or scope changes, refresh sender QR if in send mode
	$effect(() => {
		if (isOpen && activeTab === 'qr' && qrRole === 'send') {
			const scope = qrSendScope;
			untrack(() => {
				generateSingleQr(scope);
			});
		}
	});

	onDestroy(() => {
		stopCameraScanner();
	});

	function resetTransferState() {
		receivedJson = null;
		parsedPreview = null;
		cameraError = '';
	}

	let currentGenerationId = 0;

	// --- 1. SINGLE QR GENERATOR (OPTION 4) ---
	async function generateSingleQr(scope: ExportScope) {
		const genId = ++currentGenerationId;
		isGeneratingQr = true;
		qrGenerationError = '';
		try {
			const qrLib = (QRCode as any)?.default || QRCode;
			const rawJson = await exportDatabaseToJson(scope, false);
			const parsed = JSON.parse(rawJson);
			const data = parsed.data || {};
			senderStats = {
				activities: data.activities?.length || 0,
				templates: data.dayTemplates?.length || 0,
				events: data.events?.length || 0
			};

			const { payload, fitsInSingleQr, charLength } = await createSingleQrPayload(rawJson);
			if (genId !== currentGenerationId) return;

			qrCharLength = charLength;

			if (!fitsInSingleQr) {
				isQrTooLarge = true;
				qrSvgMarkup = '';
				qrDataUrl = '';
			} else {
				isQrTooLarge = false;

				// 1. Try pure SVG vector markup (scalable, zero-canvas dependency)
				try {
					if (qrLib && typeof qrLib.toString === 'function') {
						qrSvgMarkup = await qrLib.toString(payload, {
							type: 'svg',
							width: 280,
							margin: 2
						});
					}
				} catch (svgErr) {
					console.warn('SVG QR generation warning:', svgErr);
				}

				// 2. Try DataURL image for fallback and download
				try {
					if (qrLib && typeof qrLib.toDataURL === 'function') {
						qrDataUrl = await qrLib.toDataURL(payload, {
							width: 320,
							margin: 2,
							errorCorrectionLevel: 'M',
							color: {
								dark: '#0f172a',
								light: '#ffffff'
							}
						});
					}
				} catch (urlErr) {
					console.warn('DataURL QR generation warning:', urlErr);
				}

				if (!qrSvgMarkup && !qrDataUrl) {
					throw new Error('No se pudo renderizar la imagen ni el vector del código QR.');
				}
			}
		} catch (err: any) {
			if (genId !== currentGenerationId) return;
			console.error('Error generating single QR:', err);
			qrGenerationError = err.message || 'Error al generar código QR';
			toastStore.show({
				title: 'Error al generar código QR',
				message: err.message,
				type: 'error'
			});
		} finally {
			if (genId === currentGenerationId) {
				isGeneratingQr = false;
			}
		}
	}

	async function copyQrPayload() {
		try {
			const rawJson = await exportDatabaseToJson(qrSendScope, false);
			const { payload } = await createSingleQrPayload(rawJson);
			await navigator.clipboard.writeText(payload);
			toastStore.show({
				title: '¡Copiado!',
				message: 'Código de datos copiado al portapapeles.',
				type: 'success'
			});
		} catch {
			toastStore.show({ title: 'Error al copiar', type: 'error' });
		}
	}

	function downloadQrImage() {
		if (!qrDataUrl) return;
		const a = document.createElement('a');
		a.href = qrDataUrl;
		a.download = `dynamic-planner-qr-${qrSendScope}.png`;
		a.click();
		toastStore.show({ title: 'Imagen QR descargada', type: 'success' });
	}

	// --- 2. CAMERA SCANNER (RECEIVER) ---
	async function startCameraScanner() {
		cameraError = '';
		isCameraScanning = true;
		resetTransferState();

		try {
			const container = document.getElementById('qr-scanner-box');
			if (!container) throw new Error('No se encontró el contenedor de escáner.');

			if (!html5QrScanner) {
				html5QrScanner = new Html5Qrcode('qr-scanner-box');
			}

			await html5QrScanner.start(
				{ facingMode: 'environment' },
				{
					fps: 15,
					qrbox: (viewfinderWidth, viewfinderHeight) => {
						const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
						const edge = Math.floor(minEdge * 0.75);
						return { width: edge, height: edge };
					}
				},
				async (decodedText) => {
					await handleScannedText(decodedText);
				},
				() => {}
			);
		} catch (err: any) {
			console.error('Camera start error:', err);
			isCameraScanning = false;
			cameraError =
				err.message?.includes('NotAllowedError') || err.message?.includes('Permission')
					? 'Permiso de cámara denegado. Permite el acceso o sube una imagen del código QR.'
					: 'No se pudo acceder a la cámara. Prueba subiendo una imagen del QR.';
		}
	}

	async function stopCameraScanner() {
		if (html5QrScanner && html5QrScanner.isScanning) {
			try {
				await html5QrScanner.stop();
				html5QrScanner.clear();
			} catch (e) {
				console.warn('Error stopping scanner:', e);
			}
		}
		isCameraScanning = false;
	}

	async function handleScannedText(decodedText: string) {
		const { result } = await processScannedQr(decodedText);

		if (result.type === 'complete') {
			// Success! Stop camera stream immediately
			await stopCameraScanner();
			if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
				navigator.vibrate?.(100);
			}
			processReceivedJson(result.jsonText);
		} else if (result.type === 'error') {
			toastStore.show({
				title: 'Error de escaneo',
				message: result.error,
				type: 'error'
			});
		}
	}

	async function handleUploadQrImage(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];

		try {
			const scanner = new Html5Qrcode('qr-scanner-temp');
			const decodedText = await scanner.scanFile(file, true);
			scanner.clear();
			await handleScannedText(decodedText);
		} catch (err: any) {
			toastStore.show({
				title: 'No se detectó un código QR legible',
				message: 'Asegúrate de que la imagen sea clara y contenga el código completo.',
				type: 'error'
			});
		}
		input.value = '';
	}

	function processReceivedJson(jsonStr: string) {
		try {
			const parsed = JSON.parse(jsonStr);
			const data = parsed.data || parsed;
			receivedJson = jsonStr;
			parsedPreview = {
				activitiesCount: data.activities?.length || 0,
				templatesCount: data.dayTemplates?.length || 0,
				eventsCount: data.events?.length || 0,
				scope: parsed.scope
			};
			toastStore.show({
				title: '¡Código QR detectado con éxito! 🎯',
				message: `Se encontraron ${parsedPreview.eventsCount} bloques y ${parsedPreview.templatesCount} plantillas.`,
				type: 'success'
			});
		} catch {
			toastStore.show({
				title: 'Datos incompatibles',
				message: 'El código escaneado no corresponde a un formato reconocido.',
				type: 'error'
			});
		}
	}

	async function applyReceivedData() {
		if (!receivedJson) return;
		isImporting = true;
		try {
			const res = await importDatabaseFromJson(receivedJson, receiverImportMode);
			toastStore.show({
				title: '¡Transferencia completada!',
				message: `Se sincronizaron ${res.eventsCount} bloques y ${res.templatesCount} plantillas (${receiverImportMode === 'merge' ? 'modo combinar' : 'reemplazo total'}).`,
				type: 'success'
			});
			isOpen = false;
			onDataImported?.();
		} catch (err: any) {
			toastStore.show({
				title: 'Error al aplicar los datos',
				message: err.message,
				type: 'error'
			});
		} finally {
			isImporting = false;
		}
	}

	// --- 3. SHARE FILE .PLANNER (OPTION 3) ---
	async function handleSharePlanner() {
		isSharing = true;
		try {
			const jsonContent = await exportDatabaseToJson(shareScope, false);
			const result = await shareOrDownloadPlannerFile(jsonContent, 'rutina');

			if (result.method === 'shared') {
				toastStore.show({
					title: '¡Rutina compartida!',
					message: 'Enviada mediante el menú de tu dispositivo.',
					type: 'success'
				});
			} else if (result.method === 'downloaded') {
				toastStore.show({
					title: 'Archivo .planner descargado',
					message: 'Envíalo por donde quieras a tu otro dispositivo.',
					type: 'success'
				});
			}
		} catch (err: any) {
			toastStore.show({
				title: 'Error al compartir archivo',
				message: err.message,
				type: 'error'
			});
		} finally {
			isSharing = false;
		}
	}

	async function handleDirectDownloadPlanner() {
		try {
			const jsonContent = await exportDatabaseToJson(shareScope, false);
			const blob = new Blob([jsonContent], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `rutina-${new Date().toISOString().split('T')[0]}.planner`;
			a.click();
			URL.revokeObjectURL(url);
			toastStore.show({
				title: 'Archivo .planner listo',
				message: 'Descargado localmente en tu dispositivo.',
				type: 'success'
			});
		} catch (err: any) {
			toastStore.show({ title: 'Error al descargar', message: err.message, type: 'error' });
		}
	}

	async function handleImportPlannerFile(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const text = await file.text();

		try {
			const parsed = JSON.parse(text);
			const data = parsed.data || parsed;
			receivedJson = text;
			parsedPreview = {
				activitiesCount: data.activities?.length || 0,
				templatesCount: data.dayTemplates?.length || 0,
				eventsCount: data.events?.length || 0,
				scope: parsed.scope
			};
			toastStore.show({
				title: 'Archivo cargado con éxito',
				message: `Revisa la vista previa y confirma la importación.`,
				type: 'info'
			});
		} catch (err: any) {
			toastStore.show({
				title: 'Error al leer el archivo',
				message: 'El archivo seleccionado no es un formato .planner o .json válido.',
				type: 'error'
			});
		}
		input.value = '';
	}

	// --- 4. LEGACY JSON ACTIONS ---
	async function handleLegacyJsonExport() {
		const json = await exportDatabaseToJson(shareScope, true);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dynamic-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toastStore.show({ title: 'JSON exportado con éxito', type: 'success' });
	}
</script>

<!-- Hidden temporary element for QR image scanning fallback -->
<div id="qr-scanner-temp" class="hidden"></div>

<Modal
	bind:isOpen
	title="Transferir Datos entre Dispositivos"
	description="Mueve tus rutinas y bloques a otro móvil o PC de forma 100% privada y sin cuentas"
	icon={QrCode}
	maxWidth="max-w-2xl"
>
	{#snippet children()}
		<div class="space-y-5">
			<!-- Main Tab Selector -->
			<div class="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
				<button
					type="button"
					onclick={() => {
						activeTab = 'qr';
						resetTransferState();
					}}
					class="flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer {activeTab === 'qr'
						? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					<QrCode class="h-4 w-4" />
					<span>Código QR (Recomendado)</span>
				</button>

				<button
					type="button"
					onclick={() => {
						activeTab = 'share';
						resetTransferState();
					}}
					class="flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer {activeTab === 'share'
						? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					<Share2 class="h-4 w-4" />
					<span>Compartir Archivo</span>
				</button>
			</div>

			<!-- ========================================== -->
			<!-- TAB 1: QR CODE (OPTION 4: SINGLE SCAN) -->
			<!-- ========================================== -->
			{#if activeTab === 'qr'}
				<div class="space-y-4">
					<!-- Role Switcher: Send vs Receive -->
					<div class="flex items-center justify-center gap-2">
						<div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
							<button
								type="button"
								onclick={() => {
									qrRole = 'send';
									resetTransferState();
								}}
								class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {qrRole === 'send'
									? 'bg-indigo-600 text-white shadow-xs'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}"
							>
								<Send class="h-3.5 w-3.5" />
								<span>📤 Quiero Enviar</span>
							</button>

							<button
								type="button"
								onclick={() => {
									qrRole = 'receive';
									resetTransferState();
								}}
								class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {qrRole === 'receive'
									? 'bg-indigo-600 text-white shadow-xs'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}"
							>
								<Inbox class="h-3.5 w-3.5" />
								<span>📥 Quiero Recibir</span>
							</button>
						</div>
					</div>

					<!-- SUBMODE: SEND QR -->
					{#if qrRole === 'send'}
						<div class="space-y-4">
							<!-- Short, simple instructions -->
							<div class="rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-3.5">
								<h5 class="text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
									<Sparkles class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
									<span>Instrucciones simples para enviar:</span>
								</h5>
								<ol class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">1</span>
										<span>Elige qué transferir.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">2</span>
										<span>Mantén este código en tu pantalla.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
										<span>En tu otro dispositivo, abre la app en modo <strong>"Quiero Recibir"</strong> y apúntale con la cámara. ¡Eso es todo!</span>
									</li>
								</ol>
							</div>

							<!-- Scope Selector -->
							<div class="space-y-1.5">
								<label for="qr-scope-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
									¿Qué deseas transferir?
								</label>
								<div id="qr-scope-select" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
									<button
										type="button"
										onclick={() => {
											qrSendScope = 'current_week';
											generateSingleQr('current_week');
										}}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {qrSendScope === 'current_week'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">⚡ Semana activa</div>
										<div class="text-[10px] text-slate-500 dark:text-slate-400">Ultra-rápido</div>
									</button>

									<button
										type="button"
										onclick={() => {
											qrSendScope = 'recent_month';
											generateSingleQr('recent_month');
										}}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {qrSendScope === 'recent_month'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">📅 Último mes</div>
										<div class="text-[10px] text-slate-500 dark:text-slate-400">Últimos 30 días</div>
									</button>

									<button
										type="button"
										onclick={() => {
											qrSendScope = 'templates_only';
											generateSingleQr('templates_only');
										}}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {qrSendScope === 'templates_only'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">📋 Solo plantillas</div>
										<div class="text-[10px] text-slate-500 dark:text-slate-400">Sin bloques pasados</div>
									</button>

									<button
										type="button"
										onclick={() => {
											qrSendScope = 'full';
											generateSingleQr('full');
										}}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {qrSendScope === 'full'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">📦 Todo el historial</div>
										<div class="text-[10px] text-slate-500 dark:text-slate-400">Todo completo</div>
									</button>
								</div>
							</div>

							<!-- Single Static QR Code -->
							<div class="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 min-h-72">
								{#if isGeneratingQr}
									<div class="flex flex-col items-center gap-2 py-12 text-slate-500">
										<RefreshCw class="h-7 w-7 animate-spin text-indigo-600" />
										<span class="text-xs font-medium">Generando código QR comprimido...</span>
									</div>
								{:else if isQrTooLarge}
									<!-- Friendly alert if full history is too large -->
									<div class="max-w-md text-center py-6 px-4 space-y-3">
										<div class="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
											<AlertCircle class="h-6 w-6" />
										</div>
										<h5 class="text-sm font-bold text-slate-900 dark:text-slate-100">
											Demasiados datos para 1 solo código QR
										</h5>
										<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
											Tu historial completo contiene tantos bloques que no entraría en 1 solo código QR legible. Te sugerimos transferir la <strong>Semana activa</strong> o usar la pestaña <strong>Compartir Archivo .planner</strong>.
										</p>
										<div class="flex flex-wrap items-center justify-center gap-2 pt-2">
											<button
												type="button"
												onclick={() => {
													qrSendScope = 'current_week';
													generateSingleQr('current_week');
												}}
												class="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
											>
												Usar Semana activa
											</button>
											<button
												type="button"
												onclick={() => (activeTab = 'share')}
												class="rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
											>
												Ir a Compartir Archivo
											</button>
										</div>
									</div>
								{:else if qrGenerationError}
									<div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center space-y-2 max-w-sm">
										<p class="text-xs text-rose-700 dark:text-rose-300">{qrGenerationError}</p>
										<button
											type="button"
											onclick={() => generateSingleQr(qrSendScope)}
											class="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs"
										>
											Reintentar generación
										</button>
									</div>
								{:else if qrSvgMarkup || qrDataUrl}
									<div class="p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center">
										{#if qrSvgMarkup}
											<div class="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
												{@html qrSvgMarkup}
											</div>
										{:else}
											<img
												src={qrDataUrl}
												alt="Código QR de transferencia"
												class="w-64 h-64 sm:w-72 sm:h-72 object-contain"
											/>
										{/if}
									</div>

									<!-- Content summary -->
									<div class="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
										<span class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
											<Check class="h-3.5 w-3.5" /> QR de alta velocidad
										</span>
										<span>•</span>
										{#if senderStats}
											<span>{senderStats.events} bloques</span>
											<span>•</span>
											<span>{senderStats.templates} plantillas</span>
										{/if}
									</div>

									<!-- Extra Action Buttons -->
									<div class="flex items-center gap-2 mt-3">
										<button
											type="button"
											onclick={copyQrPayload}
											class="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
										>
											<Copy class="h-3.5 w-3.5" />
											<span>Copiar datos</span>
										</button>
										<button
											type="button"
											onclick={downloadQrImage}
											class="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
										>
											<Download class="h-3.5 w-3.5" />
											<span>Guardar imagen</span>
										</button>
										<button
											type="button"
											onclick={() => generateSingleQr(qrSendScope)}
											class="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
											title="Regenerar código QR"
										>
											<RefreshCw class="h-3.5 w-3.5" />
											<span>Regenerar</span>
										</button>
									</div>
								{:else}
									<div class="py-10 text-center space-y-3">
										<QrCode class="h-12 w-12 mx-auto text-slate-400" />
										<p class="text-xs text-slate-500">Pulsa el botón para generar el código QR</p>
										<button
											type="button"
											onclick={() => generateSingleQr(qrSendScope)}
											class="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
										>
											<QrCode class="h-4 w-4" />
											<span>Generar Código QR</span>
										</button>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<!-- SUBMODE: RECEIVE QR -->
						<div class="space-y-4">
							<!-- Short, simple instructions -->
							<div class="rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5">
								<h5 class="text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2 flex items-center gap-1.5">
									<Camera class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
									<span>Instrucciones simples para recibir:</span>
								</h5>
								<ol class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
										<span>Toca el botón <strong>"Activar Cámara"</strong> para escanear.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
										<span>Apunta a la pantalla del otro dispositivo donde se muestra el QR.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">3</span>
										<span>¡Listo! Revisa los bloques detectados y toca <strong>"Guardar"</strong>.</span>
									</li>
								</ol>
							</div>

							<!-- Scanner Viewer or Status -->
							{#if !parsedPreview}
								<div class="space-y-3">
									<div class="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-white">
										<div id="qr-scanner-box" class="w-full h-full {isCameraScanning ? 'block' : 'hidden'}"></div>

										{#if !isCameraScanning}
											<div class="p-6 text-center space-y-3">
												<Camera class="h-10 w-10 mx-auto text-slate-400" />
												<p class="text-xs text-slate-300">
													Presiona para encender la cámara y leer el código en 1 segundo.
												</p>
												<button
													type="button"
													onclick={startCameraScanner}
													class="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
												>
													<Camera class="h-4 w-4" />
													<span>Activar Cámara</span>
												</button>
											</div>
										{/if}
									</div>

									{#if isCameraScanning}
										<div class="text-center">
											<button
												type="button"
												onclick={stopCameraScanner}
												class="rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-3.5 py-1.5 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
											>
												Detener cámara
											</button>
										</div>
									{/if}

									{#if cameraError}
										<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
											{cameraError}
										</div>
									{/if}

									<!-- Alternativa: Subir captura -->
									<div class="text-center pt-2">
										<label class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1">
											<ImageIcon class="h-3.5 w-3.5" />
											<span>¿No tienes cámara? Subir imagen o captura del QR (Asegurate de tener una buena calidad en la imagen)</span>
											<input type="file" accept="image/*" onchange={handleUploadQrImage} class="hidden" />
										</label>
									</div>
								</div>
							{:else}
								<!-- Preview and confirmation of detected data -->
								<div class="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
									<div class="flex items-center gap-2">
										<div class="p-1.5 rounded-full bg-emerald-600 text-white">
											<Check class="h-4 w-4" />
										</div>
										<h5 class="text-sm font-bold text-slate-900 dark:text-slate-100">
											¡Rutina recibida correctamente!
										</h5>
									</div>

									<div class="grid grid-cols-3 gap-2 text-center">
										<div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
											<div class="text-lg font-extrabold text-slate-800 dark:text-slate-100">{parsedPreview.eventsCount}</div>
											<div class="text-[10px] text-slate-500">Bloques</div>
										</div>
										<div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
											<div class="text-lg font-extrabold text-slate-800 dark:text-slate-100">{parsedPreview.templatesCount}</div>
											<div class="text-[10px] text-slate-500">Plantillas</div>
										</div>
										<div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
											<div class="text-lg font-extrabold text-slate-800 dark:text-slate-100">{parsedPreview.activitiesCount}</div>
											<div class="text-[10px] text-slate-500">Actividades</div>
										</div>
									</div>

									<!-- Import mode -->
									<div class="space-y-1.5">
										<label for="qr-import-mode-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
											¿Cómo deseas guardar estos datos?
										</label>
										<div id="qr-import-mode-select" class="grid grid-cols-2 gap-2">
											<button
												type="button"
												onclick={() => (receiverImportMode = 'merge')}
												class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {receiverImportMode === 'merge'
													? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-600'
													: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
											>
												<div class="text-xs font-bold">✨ Combinar (Recomendado)</div>
												<div class="text-[10px] text-slate-500">Mantiene lo que tienes y agrega lo nuevo</div>
											</button>

											<button
												type="button"
												onclick={() => (receiverImportMode = 'replace')}
												class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {receiverImportMode === 'replace'
													? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-1 ring-rose-600'
													: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
											>
												<div class="text-xs font-bold">🔄 Reemplazar todo</div>
												<div class="text-[10px] text-slate-500">Borra lo actual y deja solo lo recibido</div>
											</button>
										</div>
									</div>

									<div class="flex items-center gap-2 pt-2">
										<button
											type="button"
											onclick={applyReceivedData}
											disabled={isImporting}
											class="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md text-center"
										>
											{isImporting ? 'Guardando datos...' : 'Confirmar y Guardar Rutina'}
										</button>
										<button
											type="button"
											onclick={resetTransferState}
											class="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
										>
											Reintentar
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- ======================================================== -->
			<!-- TAB 2: SHARE .PLANNER FILE (OPTION 3: WHATSAPP) -->
			<!-- ======================================================== -->
			{#if activeTab === 'share'}
				<div class="space-y-4">
					<!-- Role Switcher: Share vs Open File -->
					<div class="flex items-center justify-center gap-2">
						<div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
							<button
								type="button"
								onclick={() => {
									shareRole = 'send';
									resetTransferState();
								}}
								class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {shareRole === 'send'
									? 'bg-indigo-600 text-white shadow-xs'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}"
							>
								<Share2 class="h-3.5 w-3.5" />
								<span>📤 Compartir mi rutina</span>
							</button>

							<button
								type="button"
								onclick={() => {
									shareRole = 'receive';
									resetTransferState();
								}}
								class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {shareRole === 'receive'
									? 'bg-indigo-600 text-white shadow-xs'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}"
							>
								<Upload class="h-3.5 w-3.5" />
								<span>📥 Abrir archivo recibido</span>
							</button>
						</div>
					</div>

					<!-- SUBMODE: SHARE / SEND .PLANNER FILE -->
					{#if shareRole === 'send'}
						<div class="space-y-4">
							<!-- Short, simple instructions -->
							<div class="rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-3.5">
								<h5 class="text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
									<Sparkles class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
									<span>Instrucciones simples para compartir:</span>
								</h5>
								<ol class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">1</span>
										<span>Toca el botón <strong>"Compartir rutina"</strong> de abajo.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">2</span>
										<span>Elige <strong>WhatsApp, AirDrop, Telegram, Correo o Guardar</strong> en el menú de tu teléfono.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
										<span>En tu otro dispositivo, descarga el archivo <code>.planner</code> y ábrelo en esta misma app.</span>
									</li>
								</ol>
							</div>

							<!-- Scope Selector -->
							<div class="space-y-1.5">
								<label for="share-scope-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
									¿Qué deseas incluir en el archivo?
								</label>
								<div id="share-scope-select" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
									<button
										type="button"
										onclick={() => (shareScope = 'full')}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {shareScope === 'full'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">📦 Todo completo</div>
										<div class="text-[10px] text-slate-500">Historial + plantillas</div>
									</button>

									<button
										type="button"
										onclick={() => (shareScope = 'current_week')}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {shareScope === 'current_week'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">⚡ Semana activa</div>
										<div class="text-[10px] text-slate-500">Solo semana actual</div>
									</button>

									<button
										type="button"
										onclick={() => (shareScope = 'recent_month')}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {shareScope === 'recent_month'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">📅 Último mes</div>
										<div class="text-[10px] text-slate-500">Últimos 30 días</div>
									</button>

									<button
										type="button"
										onclick={() => (shareScope = 'templates_only')}
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {shareScope === 'templates_only'
											? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600'
											: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'}"
									>
										<div class="text-[11px] font-bold">📋 Solo plantillas</div>
										<div class="text-[10px] text-slate-500">Rutinas base</div>
									</button>
								</div>
							</div>

							<!-- Main Share Button -->
							<div class="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-center space-y-4">
								<div class="max-w-sm mx-auto space-y-2">
									<h5 class="text-sm font-bold text-slate-900 dark:text-slate-100">
										Enviar a otro dispositivo
									</h5>
									<p class="text-xs text-slate-500 dark:text-slate-400">
										Se generará un archivo amigable llamado <code>rutina.planner</code> que puedes enviar por cualquier aplicación de mensajería.
									</p>
								</div>

								<div class="flex flex-col sm:flex-row items-center justify-center gap-2.5">
									<button
										type="button"
										onclick={handleSharePlanner}
										disabled={isSharing}
										class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
									>
										<Share2 class="h-4 w-4" />
										<span>{isSharing ? 'Preparando...' : 'Compartir mi rutina'}</span>
									</button>

									<button
										type="button"
										onclick={handleDirectDownloadPlanner}
										class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
									>
										<Download class="h-4 w-4" />
										<span>Descargar archivo .planner</span>
									</button>
								</div>
							</div>
						</div>
					{:else}
						<!-- SUBMODE: OPEN / RESTORE .PLANNER FILE -->
						<div class="space-y-4">
							<!-- Short, simple instructions -->
							<div class="rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5">
								<h5 class="text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2 flex items-center gap-1.5">
									<Upload class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
									<span>Instrucciones simples para abrir el archivo:</span>
								</h5>
								<ol class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
										<span>Descarga o guarda en este dispositivo el archivo <code>.planner</code> que te enviaron.</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
										<span>Toca el recuadro de abajo y selecciónalo (o arrástralo directamente).</span>
									</li>
									<li class="flex items-start gap-2">
										<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">3</span>
										<span>¡Listo! Tus bloques y plantillas se sincronizarán al instante.</span>
									</li>
								</ol>
							</div>

							{#if !parsedPreview}
								<!-- User-friendly file selector -->
								<label
									class="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-900/40 cursor-pointer transition-all group"
								>
									<Upload class="h-10 w-10 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2" />
									<span class="text-xs font-bold text-slate-800 dark:text-slate-200">
										Seleccionar archivo .planner
									</span>
									<span class="text-[11px] text-slate-500 mt-1">
										O haz clic aquí para buscar en tus descargas
									</span>
									<input
										type="file"
										accept=".planner,.json"
										onchange={handleImportPlannerFile}
										class="hidden"
									/>
								</label>
							{:else}
								<!-- Uploaded file preview -->
								<div class="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
									<div class="flex items-center gap-2">
										<div class="p-1.5 rounded-full bg-emerald-600 text-white">
											<Check class="h-4 w-4" />
										</div>
										<h5 class="text-sm font-bold text-slate-900 dark:text-slate-100">
											Archivo leído con éxito
										</h5>
									</div>

									<div class="grid grid-cols-3 gap-2 text-center">
										<div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
											<div class="text-lg font-extrabold text-slate-800 dark:text-slate-100">{parsedPreview.eventsCount}</div>
											<div class="text-[10px] text-slate-500">Bloques</div>
										</div>
										<div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
											<div class="text-lg font-extrabold text-slate-800 dark:text-slate-100">{parsedPreview.templatesCount}</div>
											<div class="text-[10px] text-slate-500">Plantillas</div>
										</div>
										<div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
											<div class="text-lg font-extrabold text-slate-800 dark:text-slate-100">{parsedPreview.activitiesCount}</div>
											<div class="text-[10px] text-slate-500">Actividades</div>
										</div>
									</div>

									<!-- Import mode -->
									<div class="space-y-1.5">
										<label for="share-import-mode-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
											¿Cómo deseas guardar estos datos?
										</label>
										<div id="share-import-mode-select" class="grid grid-cols-2 gap-2">
											<button
												type="button"
												onclick={() => (shareFileImportMode = 'merge')}
												class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {shareFileImportMode === 'merge'
													? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-600'
													: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
											>
												<div class="text-xs font-bold">✨ Combinar (Recomendado)</div>
												<div class="text-[10px] text-slate-500">Mantiene lo que tienes y agrega lo nuevo</div>
											</button>

											<button
												type="button"
												onclick={() => (shareFileImportMode = 'replace')}
												class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {shareFileImportMode === 'replace'
													? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-1 ring-rose-600'
													: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
											>
												<div class="text-xs font-bold">🔄 Reemplazar todo</div>
												<div class="text-[10px] text-slate-500">Borra lo actual y deja solo lo recibido</div>
											</button>
										</div>
									</div>

									<div class="flex items-center gap-2 pt-2">
										<button
											type="button"
											onclick={applyReceivedData}
											disabled={isImporting}
											class="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md text-center"
										>
											{isImporting ? 'Guardando...' : 'Confirmar e Importar Rutina'}
										</button>
										<button
											type="button"
											onclick={resetTransferState}
											class="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
										>
											Cancelar
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Technical JSON Options (Discrete dropdown) -->
					<div class="pt-2 border-t border-slate-200 dark:border-slate-800">
						<button
							type="button"
							onclick={() => (showJsonAdvanced = !showJsonAdvanced)}
							class="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
						>
							<FileCode2 class="h-3.5 w-3.5" />
							<span>{showJsonAdvanced ? 'Ocultar opciones JSON técnicas' : 'Ver opciones avanzadas de archivo JSON'}</span>
						</button>

						{#if showJsonAdvanced}
							<div class="mt-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 text-xs flex flex-wrap items-center gap-2">
								<button
									type="button"
									onclick={handleLegacyJsonExport}
									class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 px-2.5 py-1 text-xs font-medium cursor-pointer"
								>
									Descargar como .json plano
								</button>
								<label class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 px-2.5 py-1 text-xs font-medium cursor-pointer">
									Subir .json sin procesar
									<input type="file" accept=".json" onchange={handleImportPlannerFile} class="hidden" />
								</label>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- 100% Offline Privacy Banner -->
			<div class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
				<ShieldCheck class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Tus datos son 100% locales y privados. Nunca se envían a ningún servidor en la nube ni requieren inicio de sesión.</span>
			</div>
		</div>
	{/snippet}

	{#snippet footerSnippet()}
		<button
			type="button"
			onclick={() => (isOpen = false)}
			class="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
		>
			Cerrar
		</button>
	{/snippet}
</Modal>
