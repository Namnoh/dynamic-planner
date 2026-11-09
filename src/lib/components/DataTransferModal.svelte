<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import Modal from './Modal.svelte';
	import {
		exportDatabaseToJson,
		importDatabaseFromJson,
		triggerEmergencySnapshot,
		type ExportScope,
		type ImportMode
	} from '$lib/db';
	import {
		generateSyncCode,
		normalizeSyncCode,
		startP2PSender,
		receiveP2PData,
		shareOrDownloadPlannerFile,
		parseImportPayload,
		type P2PSenderSession
	} from '$lib/utils/transfer';
	import { toastStore } from '$lib/utils/notifications';
	import {
		Radio,
		FolderUp,
		Share2,
		Download,
		Copy,
		Check,
		AlertCircle,
		RefreshCw,
		Layers,
		Calendar,
		ArrowRight,
		FileText,
		ClipboardPaste,
		Sparkles,
		ShieldCheck,
		Smartphone,
		Monitor
	} from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		initialSyncCode = '',
		onDataImported
	}: {
		isOpen: boolean;
		initialSyncCode?: string;
		onDataImported?: () => void;
	} = $props();

	// Primary Tabs: 'p2p' (6-digit code direct sync) | 'file' (WhatsApp / AirDrop / .planner file)
	let activeTab = $state<'p2p' | 'file'>('p2p');

	// Submodes: 'send' | 'receive'
	let p2pRole = $state<'send' | 'receive'>('send');
	let fileRole = $state<'send' | 'receive'>('send');

	// --- P2P SENDER STATE ---
	let p2pSendScope = $state<ExportScope>('current_week');
	let p2pSyncCode = $state('');
	let p2pSenderSession: P2PSenderSession | null = null;
	let p2pSenderStatus = $state<'initializing' | 'ready' | 'connected' | 'transferred' | 'error'>('initializing');
	let p2pSenderMessage = $state('');
	let isCopiedCode = $state(false);
	let isCopiedLink = $state(false);
	let senderStats = $state<{ activities: number; templates: number; events: number } | null>(null);

	// --- P2P RECEIVER STATE ---
	let pinDigits = $state<string[]>(['', '', '', '', '', '']);
	let digitInputRefs = $state<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);
	let isConnectingP2P = $state(false);
	let p2pReceiverProgress = $state('');
	let p2pReceiverError = $state('');

	// --- FILE / SHARE STATE ---
	let fileSendScope = $state<ExportScope>('full');
	let isSharing = $state(false);
	let isDraggingFile = $state(false);
	let fileImportError = $state('');

	// --- UNIFIED PREVIEW & IMPORT STATE ---
	let receivedJson = $state<string | null>(null);
	let parsedPreview = $state<{
		activitiesCount: number;
		templatesCount: number;
		eventsCount: number;
		scope?: string;
	} | null>(null);
	let selectedImportMode = $state<ImportMode>('merge');
	let isImporting = $state(false);

	// If initialSyncCode was provided, switch to receive mode automatically
	$effect(() => {
		if (initialSyncCode) {
			activeTab = 'p2p';
			p2pRole = 'receive';
			const clean = initialSyncCode.replace(/\D/g, '').slice(0, 6);
			for (let i = 0; i < 6; i++) {
				pinDigits[i] = clean[i] || '';
			}
			if (clean.length === 6) {
				untrack(() => {
					handleP2PReceive();
				});
			}
		}
	});

	// Cleanup P2P sender on tab switch or modal close
	function cleanupP2PSender() {
		if (p2pSenderSession) {
			p2pSenderSession.destroy();
			p2pSenderSession = null;
		}
		p2pSenderStatus = 'initializing';
		p2pSenderMessage = '';
	}

	function clearPin() {
		pinDigits = ['', '', '', '', '', ''];
	}

	function resetTransferState() {
		cleanupP2PSender();
		receivedJson = null;
		parsedPreview = null;
		p2pReceiverError = '';
		p2pReceiverProgress = '';
		fileImportError = '';
		isConnectingP2P = false;
		clearPin();
	}

	// Auto-focus first PIN input when switching to receiver role
	$effect(() => {
		if (isOpen && activeTab === 'p2p' && p2pRole === 'receive') {
			untrack(() => {
				setTimeout(() => {
					const firstEmpty = pinDigits.findIndex((d) => !d);
					const targetIndex = firstEmpty === -1 ? 0 : firstEmpty;
					digitInputRefs[targetIndex]?.focus();
				}, 100);
			});
		}
	});

	// Modal lifecycle
	$effect(() => {
		const open = isOpen;
		if (!open) {
			untrack(() => {
				resetTransferState();
			});
		}
	});

	// Whenever switching to P2P Send, start a new session
	$effect(() => {
		if (isOpen && activeTab === 'p2p' && p2pRole === 'send') {
			const scope = p2pSendScope;
			untrack(() => {
				initP2PSender(scope);
			});
		} else {
			untrack(() => {
				cleanupP2PSender();
			});
		}
	});

	onDestroy(() => {
		cleanupP2PSender();
	});

	// --- 1. P2P SENDER LOGIC ---
	async function initP2PSender(scope: ExportScope) {
		cleanupP2PSender();
		p2pSenderStatus = 'initializing';
		p2pSenderMessage = 'Preparando datos y generando código...';

		try {
			const rawJson = await exportDatabaseToJson(scope, false);
			const parsed = JSON.parse(rawJson);
			const data = parsed.data || {};
			senderStats = {
				activities: data.activities?.length || 0,
				templates: data.dayTemplates?.length || 0,
				events: data.events?.length || 0
			};

			const code = generateSyncCode();
			p2pSyncCode = code;

			p2pSenderSession = await startP2PSender(rawJson, code, (event) => {
				p2pSenderStatus = event.type;
				p2pSenderMessage = event.message || '';
				if (event.type === 'transferred') {
					toastStore.show({
						title: '¡Sincronización exitosa!',
						message: 'Los datos fueron recibidos por el otro dispositivo.',
						type: 'success'
					});
				} else if (event.type === 'error') {
					toastStore.show({
						title: 'Error de enlace P2P',
						message: event.message,
						type: 'error'
					});
				}
			});
		} catch (err: any) {
			p2pSenderStatus = 'error';
			p2pSenderMessage = err.message || 'Error al inicializar sesión de envío.';
			toastStore.show({
				title: 'Error de exportación',
				message: err.message,
				type: 'error'
			});
		}
	}

	async function copySyncCode() {
		try {
			await navigator.clipboard.writeText(p2pSyncCode);
			isCopiedCode = true;
			setTimeout(() => (isCopiedCode = false), 2000);
			toastStore.show({ title: 'Código copiado', type: 'success' });
		} catch {
			toastStore.show({ title: 'No se pudo copiar el código', type: 'error' });
		}
	}

	async function copyDirectSyncLink() {
		try {
			const clean = normalizeSyncCode(p2pSyncCode);
			const url = `${window.location.origin}${window.location.pathname}?sync=${clean}`;
			await navigator.clipboard.writeText(url);
			isCopiedLink = true;
			setTimeout(() => (isCopiedLink = false), 2000);
			toastStore.show({ title: 'Enlace directo copiado', type: 'success' });
		} catch {
			toastStore.show({ title: 'No se pudo copiar el enlace', type: 'error' });
		}
	}

	// --- 2. P2P RECEIVER LOGIC ---
	function handleDigitInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const rawVal = target.value;
		const clean = rawVal.replace(/\D/g, '');

		if (!clean) {
			pinDigits[index] = '';
			return;
		}

		if (clean.length > 1) {
			// Multi-char input (e.g. autofill or drag/drop)
			for (let i = 0; i < clean.length && index + i < 6; i++) {
				pinDigits[index + i] = clean[i];
			}
			const nextFocus = Math.min(5, index + clean.length);
			digitInputRefs[nextFocus]?.focus();
		} else {
			pinDigits[index] = clean;
			if (index < 5) {
				digitInputRefs[index + 1]?.focus();
				digitInputRefs[index + 1]?.select();
			}
		}

		checkAutoSubmit();
	}

	function handleDigitKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace') {
			if (!pinDigits[index] && index > 0) {
				e.preventDefault();
				pinDigits[index - 1] = '';
				digitInputRefs[index - 1]?.focus();
			} else {
				pinDigits[index] = '';
			}
		} else if (e.key === 'ArrowLeft' && index > 0) {
			e.preventDefault();
			digitInputRefs[index - 1]?.focus();
			digitInputRefs[index - 1]?.select();
		} else if (e.key === 'ArrowRight' && index < 5) {
			e.preventDefault();
			digitInputRefs[index + 1]?.focus();
			digitInputRefs[index + 1]?.select();
		}
	}

	function handleDigitPaste(e: ClipboardEvent) {
		e.preventDefault();
		const clipboardText = e.clipboardData?.getData('text') || '';
		applyPinString(clipboardText);
	}

	async function pastePinFromClipboard() {
		try {
			const text = await navigator.clipboard.readText();
			applyPinString(text);
		} catch {
			toastStore.show({
				title: 'Permiso denegado',
				message: 'No se pudo acceder al portapapeles.',
				type: 'error'
			});
		}
	}

	function applyPinString(str: string) {
		const digits = str.replace(/\D/g, '').slice(0, 6);
		if (!digits) return;

		for (let i = 0; i < 6; i++) {
			pinDigits[i] = digits[i] || '';
		}

		const nextFocus = Math.min(5, digits.length);
		digitInputRefs[nextFocus]?.focus();
		checkAutoSubmit();
	}

	function checkAutoSubmit() {
		const fullCode = pinDigits.join('');
		if (fullCode.length === 6 && !isConnectingP2P) {
			handleP2PReceive();
		}
	}

	async function handleP2PReceive() {
		const code = pinDigits.join('');
		if (!code || code.length < 6) {
			p2pReceiverError = 'Ingresa los 6 dígitos del código.';
			return;
		}

		p2pReceiverError = '';
		isConnectingP2P = true;
		p2pReceiverProgress = 'Iniciando conexión directa...';

		try {
			const finalJson = await receiveP2PData(code, (status) => {
				p2pReceiverProgress = status;
			});

			processIncomingJson(finalJson);
			toastStore.show({
				title: '¡Datos recibidos!',
				message: 'Revisa la previsualización antes de aplicar los cambios.',
				type: 'success'
			});
		} catch (err: any) {
			p2pReceiverError = err.message || 'Error al conectar con el emisor.';
			toastStore.show({
				title: 'Fallo de recepción',
				message: err.message,
				type: 'error'
			});
		} finally {
			isConnectingP2P = false;
			p2pReceiverProgress = '';
		}
	}

	// --- 3. FILE & SHARE LOGIC ---
	async function handleShareFile() {
		isSharing = true;
		try {
			const json = await exportDatabaseToJson(fileSendScope, false);
			const prefix = fileSendScope === 'full' ? 'dynamic-planner-completo' : 'dynamic-planner-semana';
			const res = await shareOrDownloadPlannerFile(json, prefix);
			if (res.method === 'shared') {
				toastStore.show({ title: '¡Archivo compartido!', type: 'success' });
			} else if (res.method === 'downloaded') {
				toastStore.show({ title: 'Archivo .planner descargado', type: 'success' });
			}
		} catch (err: any) {
			toastStore.show({
				title: 'Error al exportar archivo',
				message: err.message,
				type: 'error'
			});
		} finally {
			isSharing = false;
		}
	}

	async function copyFileToken() {
		try {
			const json = await exportDatabaseToJson(fileSendScope, false);
			await navigator.clipboard.writeText(json);
			toastStore.show({ title: 'Datos copiados al portapapeles', type: 'success' });
		} catch {
			toastStore.show({ title: 'Error al copiar datos', type: 'error' });
		}
	}

	function handleFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		readPlannerFile(file);
	}

	function handleFileDrop(e: DragEvent) {
		e.preventDefault();
		isDraggingFile = false;
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;
		readPlannerFile(file);
	}

	function readPlannerFile(file: File) {
		fileImportError = '';
		const reader = new FileReader();
		reader.onload = async (event) => {
			try {
				const content = event.target?.result as string;
				const parsedJson = await parseImportPayload(content);
				processIncomingJson(parsedJson);
				toastStore.show({ title: 'Archivo .planner leído con éxito', type: 'success' });
			} catch (err: any) {
				fileImportError = err.message || 'Error al procesar el archivo.';
				toastStore.show({ title: 'Archivo inválido', message: err.message, type: 'error' });
			}
		};
		reader.onerror = () => {
			fileImportError = 'Error al leer el archivo del dispositivo.';
			toastStore.show({ title: 'Error de lectura', type: 'error' });
		};
		reader.readAsText(file);
	}

	async function pasteFromClipboard() {
		fileImportError = '';
		try {
			const text = await navigator.clipboard.readText();
			if (!text) {
				throw new Error('El portapapeles está vacío.');
			}
			const parsedJson = await parseImportPayload(text);
			processIncomingJson(parsedJson);
			toastStore.show({ title: 'Datos pegados desde el portapapeles', type: 'success' });
		} catch (err: any) {
			fileImportError = err.message || 'No se pudieron leer datos válidos del portapapeles.';
			toastStore.show({ title: 'Error al pegar', message: err.message, type: 'error' });
		}
	}

	// --- 4. PREVIEW & IMPORT CONFIRMATION ---
	function processIncomingJson(jsonStr: string) {
		try {
			const parsed = JSON.parse(jsonStr);
			const data = parsed.data || parsed;
			parsedPreview = {
				activitiesCount: (data.activities || []).length,
				templatesCount: (data.dayTemplates || []).length,
				eventsCount: (data.events || []).length,
				scope: parsed.scope || 'full'
			};
			receivedJson = jsonStr;
		} catch (err: any) {
			toastStore.show({
				title: 'Error de análisis',
				message: 'El contenido recibido no tiene una estructura de datos válida.',
				type: 'error'
			});
		}
	}

	async function applyImport() {
		if (!receivedJson) return;
		isImporting = true;
		try {
			// Auto snapshot before major import
			await triggerEmergencySnapshot();

			const res = await importDatabaseFromJson(receivedJson, selectedImportMode);

			toastStore.show({
				title: selectedImportMode === 'merge' ? 'Datos combinados' : 'Base de datos restaurada',
				message: `Se sincronizaron ${res.eventsCount} eventos y ${res.templatesCount} plantillas.`,
				type: 'success'
			});

			onDataImported?.();
			isOpen = false;
		} catch (err: any) {
			toastStore.show({
				title: 'Error al aplicar datos',
				message: err.message,
				type: 'error'
			});
		} finally {
			isImporting = false;
		}
	}
</script>

<Modal
	bind:isOpen
	title="Sincronizar y Transferir Datos"
	description="Pasa tu horario y rutinas entre tu PC y tu teléfono fácilmente sin límite de datos."
	icon={Radio}
	maxWidth="max-w-xl"
	onclose={resetTransferState}
>
	{#if receivedJson && parsedPreview}
		<!-- STEP 2: PREVIEW & APPLY CONFIRMATION -->
		<div class="space-y-5">
			<div class="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 text-center space-y-2">
				<div class="inline-flex p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
					<Sparkles class="h-6 w-6" />
				</div>
				<h4 class="text-base font-bold text-slate-900 dark:text-slate-100">
					Datos listos para importar
				</h4>
				<p class="text-xs text-slate-600 dark:text-slate-400">
					Revisa el contenido recibido antes de agregarlo a tu planificador:
				</p>
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-3 gap-2.5 text-center">
				<div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
					<span class="block text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
						{parsedPreview.eventsCount}
					</span>
					<span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bloques / Eventos</span>
				</div>
				<div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
					<span class="block text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
						{parsedPreview.templatesCount}
					</span>
					<span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Plantillas</span>
				</div>
				<div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
					<span class="block text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
						{parsedPreview.activitiesCount}
					</span>
					<span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Actividades</span>
				</div>
			</div>

			<!-- Import Mode Option -->
			<div class="space-y-2 pt-1">
				<span class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
					¿Cómo deseas aplicar esta información?
				</span>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<button
						type="button"
						onclick={() => (selectedImportMode = 'merge')}
						class="flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer {selectedImportMode === 'merge'
							? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
							: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
					>
						<span class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
							Combinar (Recomendado)
							{#if selectedImportMode === 'merge'}
								<Check class="h-3.5 w-3.5 text-indigo-600" />
							{/if}
						</span>
						<span class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
							Mantiene tus bloques actuales y añade los nuevos sin duplicar.
						</span>
					</button>

					<button
						type="button"
						onclick={() => (selectedImportMode = 'replace')}
						class="flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer {selectedImportMode === 'replace'
							? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 shadow-xs'
							: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
					>
						<span class="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
							Reemplazar Todo
							{#if selectedImportMode === 'replace'}
								<Check class="h-3.5 w-3.5 text-rose-600" />
							{/if}
						</span>
						<span class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
							Sobrescribe por completo tu base de datos local con estos datos.
						</span>
					</button>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
				<button
					type="button"
					onclick={() => {
						receivedJson = null;
						parsedPreview = null;
					}}
					class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
				>
					Cancelar
				</button>
				<button
					type="button"
					disabled={isImporting}
					onclick={applyImport}
					class="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
				>
					{#if isImporting}
						<RefreshCw class="h-3.5 w-3.5 animate-spin" />
						<span>Aplicando...</span>
					{:else}
						<Check class="h-3.5 w-3.5 stroke-[2.5]" />
						<span>Confirmar e Importar</span>
					{/if}
				</button>
			</div>
		</div>
	{:else}
		<!-- STEP 1: TRANSFER METHOD TABS -->
		<div class="space-y-4">
			<!-- Tab Switcher -->
			<div class="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
				<button
					type="button"
					onclick={() => (activeTab = 'p2p')}
					class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer {activeTab === 'p2p'
						? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					<Radio class="h-3.5 w-3.5" />
					<span>Código Rápido (P2P)</span>
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'file')}
					class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer {activeTab === 'file'
						? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					<FolderUp class="h-3.5 w-3.5" />
					<span>Archivo & WhatsApp (.planner)</span>
				</button>
			</div>

			<!-- TAB 1: P2P REAL-TIME PIN SYNC -->
			{#if activeTab === 'p2p'}
				<div class="space-y-4">
					<!-- Role Switcher: Enviar / Recibir -->
					<div class="flex items-center justify-center gap-2">
						<button
							type="button"
							onclick={() => (p2pRole = 'send')}
							class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {p2pRole === 'send'
								? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
								: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
						>
							📤 Enviar a otro dispositivo
						</button>
						<button
							type="button"
							onclick={() => (p2pRole = 'receive')}
							class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {p2pRole === 'receive'
								? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
								: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
						>
							📥 Recibir en este dispositivo
						</button>
					</div>

					<!-- SENDER VIEW -->
					{#if p2pRole === 'send'}
						<div class="space-y-4">
							<!-- Scope selector -->
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-slate-700 dark:text-slate-300">Alcance de los datos:</span>
								<div class="flex gap-1">
									<button
										type="button"
										onclick={() => (p2pSendScope = 'current_week')}
										class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {p2pSendScope === 'current_week'
											? 'bg-indigo-600 text-white'
											: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
									>
										Semana activa
									</button>
									<button
										type="button"
										onclick={() => (p2pSendScope = 'full')}
										class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {p2pSendScope === 'full'
											? 'bg-indigo-600 text-white'
											: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
									>
										Historial completo
									</button>
								</div>
							</div>

							<!-- Display Code Box -->
							<div class="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-center space-y-3">
								<span class="text-xs font-medium text-slate-500 dark:text-slate-400">
									Ingresa este código en el dispositivo receptor:
								</span>

								{#if p2pSenderStatus === 'initializing'}
									<div class="flex items-center gap-2 py-4 text-slate-500">
										<RefreshCw class="h-5 w-5 animate-spin text-indigo-600" />
										<span class="text-xs font-mono">Generando código...</span>
									</div>
								{:else}
									<div class="flex items-center gap-3">
										<span class="font-mono text-3xl md:text-4xl font-extrabold tracking-wider text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs select-all">
											{p2pSyncCode}
										</span>
										<button
											type="button"
											onclick={copySyncCode}
											class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
											title="Copiar código"
										>
											{#if isCopiedCode}
												<Check class="h-4 w-4 text-emerald-500" />
											{:else}
												<Copy class="h-4 w-4" />
											{/if}
										</button>
									</div>
								{/if}

								<!-- Live Status Badge -->
								<div class="flex items-center gap-2 pt-1 text-xs">
									{#if p2pSenderStatus === 'ready'}
										<span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
										<span class="text-slate-600 dark:text-slate-400">Esperando conexión del receptor...</span>
									{:else if p2pSenderStatus === 'connected'}
										<span class="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
										<span class="text-indigo-600 dark:text-indigo-400 font-medium">Receptor enlazado. Transfiriendo...</span>
									{:else if p2pSenderStatus === 'transferred'}
										<Check class="h-4 w-4 text-emerald-500 stroke-[2.5]" />
										<span class="text-emerald-600 dark:text-emerald-400 font-semibold">¡Datos enviados con éxito!</span>
									{:else if p2pSenderStatus === 'error'}
										<AlertCircle class="h-4 w-4 text-rose-500" />
										<span class="text-rose-600 dark:text-rose-400 text-[11px]">{p2pSenderMessage}</span>
									{/if}
								</div>

								<!-- Action Links -->
								<div class="flex flex-wrap items-center justify-center gap-2 pt-2">
									<button
										type="button"
										onclick={copyDirectSyncLink}
										class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
									>
										{#if isCopiedLink}
											<Check class="h-3.5 w-3.5 text-emerald-500" />
											<span>¡Enlace copiado!</span>
										{:else}
											<Share2 class="h-3.5 w-3.5" />
											<span>Copiar enlace directo 1-clic</span>
										{/if}
									</button>
									<button
										type="button"
										onclick={() => initP2PSender(p2pSendScope)}
										class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
									>
										<RefreshCw class="h-3.5 w-3.5" />
										<span>Nuevo código</span>
									</button>
								</div>
							</div>

							<!-- Sender stats summary -->
							{#if senderStats}
								<div class="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
									<span>📅 {senderStats.events} bloques</span>
									<span>•</span>
									<span>📑 {senderStats.templates} plantillas</span>
									<span>•</span>
									<span>🏷️ {senderStats.activities} actividades</span>
								</div>
							{/if}
						</div>
					{:else}
						<!-- RECEIVER VIEW -->
						<div class="space-y-4">
							<div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-4">
								<div class="text-center space-y-1">
									<h5 class="text-sm font-bold text-slate-900 dark:text-slate-100">
										Conectar con el Emisor
									</h5>
									<p class="text-xs text-slate-500 dark:text-slate-400">
										Introduce el código de 6 dígitos que aparece en la otra pantalla:
									</p>
								</div>

								<!-- Segmented PIN input (6 boxes) -->
								<div class="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
									<div class="flex items-center justify-center gap-2 sm:gap-3 py-1" onpaste={handleDigitPaste}>
										<!-- Group 1: Digits 0, 1, 2 -->
										<div class="flex items-center gap-1.5 sm:gap-2">
											{#each [0, 1, 2] as idx}
												<input
													bind:this={digitInputRefs[idx]}
													type="text"
													inputmode="numeric"
													pattern="[0-9]*"
													maxlength="1"
													value={pinDigits[idx]}
													oninput={(e) => handleDigitInput(idx, e)}
													onkeydown={(e) => handleDigitKeydown(idx, e)}
													onfocus={(e) => (e.target as HTMLInputElement).select()}
													disabled={isConnectingP2P}
													class="w-10 h-13 sm:w-12 sm:h-15 text-center font-mono text-2xl sm:text-3xl font-extrabold rounded-xl border transition-all shadow-2xs select-none
														{pinDigits[idx]
															? 'border-indigo-500 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/25'
															: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'}
														disabled:opacity-50 disabled:cursor-not-allowed"
													aria-label={`Dígito ${idx + 1}`}
												/>
											{/each}
										</div>

										<!-- Divider / Dash -->
										<span class="text-slate-400 dark:text-slate-600 font-bold text-xl select-none px-0.5">
											–
										</span>

										<!-- Group 2: Digits 3, 4, 5 -->
										<div class="flex items-center gap-1.5 sm:gap-2">
											{#each [3, 4, 5] as idx}
												<input
													bind:this={digitInputRefs[idx]}
													type="text"
													inputmode="numeric"
													pattern="[0-9]*"
													maxlength="1"
													value={pinDigits[idx]}
													oninput={(e) => handleDigitInput(idx, e)}
													onkeydown={(e) => handleDigitKeydown(idx, e)}
													onfocus={(e) => (e.target as HTMLInputElement).select()}
													disabled={isConnectingP2P}
													class="w-10 h-13 sm:w-12 sm:h-15 text-center font-mono text-2xl sm:text-3xl font-extrabold rounded-xl border transition-all shadow-2xs select-none
														{pinDigits[idx]
															? 'border-indigo-500 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/25'
															: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'}
														disabled:opacity-50 disabled:cursor-not-allowed"
													aria-label={`Dígito ${idx + 1}`}
												/>
											{/each}
										</div>
									</div>

									<!-- Quick Actions: Paste / Clear -->
									<div class="flex items-center justify-center gap-4 text-xs">
										<button
											type="button"
											onclick={pastePinFromClipboard}
											disabled={isConnectingP2P}
											class="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
										>
											<ClipboardPaste class="h-3.5 w-3.5" />
											<span>Pegar código</span>
										</button>
										{#if pinDigits.some((d) => d !== '')}
											<span class="text-slate-300 dark:text-slate-700">•</span>
											<button
												type="button"
												onclick={clearPin}
												disabled={isConnectingP2P}
												class="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
											>
												Limpiar casillas
											</button>
										{/if}
									</div>

									{#if p2pReceiverError}
										<div class="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium text-center">
											<AlertCircle class="h-3.5 w-3.5 shrink-0" />
											<span>{p2pReceiverError}</span>
										</div>
									{/if}

									<button
										type="button"
										disabled={isConnectingP2P || pinDigits.some((d) => !d)}
										onclick={handleP2PReceive}
										class="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-1"
									>
										{#if isConnectingP2P}
											<RefreshCw class="h-3.5 w-3.5 animate-spin" />
											<span>{p2pReceiverProgress || 'Conectando con el emisor...'}</span>
										{:else}
											<ArrowRight class="h-3.5 w-3.5" />
											<span>Conectar y Recibir Datos</span>
										{/if}
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<!-- TAB 2: FILE & SHARE (.planner) -->
				<div class="space-y-4">
					<!-- Role Switcher -->
					<div class="flex items-center justify-center gap-2">
						<button
							type="button"
							onclick={() => (fileRole = 'send')}
							class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {fileRole === 'send'
								? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
								: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
						>
							📤 Exportar y Compartir
						</button>
						<button
							type="button"
							onclick={() => (fileRole = 'receive')}
							class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {fileRole === 'receive'
								? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
								: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
						>
							📥 Importar Archivo
						</button>
					</div>

					<!-- SENDER: EXPORT / SHARE -->
					{#if fileRole === 'send'}
						<div class="space-y-4">
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-slate-700 dark:text-slate-300">Alcance de los datos:</span>
								<div class="flex gap-1">
									<button
										type="button"
										onclick={() => (fileSendScope = 'current_week')}
										class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {fileSendScope === 'current_week'
											? 'bg-indigo-600 text-white'
											: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
									>
										Semana activa
									</button>
									<button
										type="button"
										onclick={() => (fileSendScope = 'full')}
										class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {fileSendScope === 'full'
											? 'bg-indigo-600 text-white'
											: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
									>
										Historial completo
									</button>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<!-- Native Share Button (Mobile & Desktop) -->
								<button
									type="button"
									disabled={isSharing}
									onclick={handleShareFile}
									class="flex flex-col items-center justify-center p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-center transition-all cursor-pointer group shadow-2xs"
								>
									<div class="p-3 rounded-full bg-indigo-600 text-white group-hover:scale-110 transition-transform mb-2">
										<Share2 class="h-5 w-5" />
									</div>
									<span class="text-xs font-bold text-slate-900 dark:text-slate-100">
										Compartir Rutina
									</span>
									<span class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
										WhatsApp, AirDrop, Telegram, Correo o Archivo
									</span>
								</button>

								<!-- Clipboard Copy -->
								<button
									type="button"
									onclick={copyFileToken}
									class="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-center transition-all cursor-pointer group shadow-2xs"
								>
									<div class="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform mb-2">
										<Copy class="h-5 w-5" />
									</div>
									<span class="text-xs font-bold text-slate-900 dark:text-slate-100">
										Copiar Código de Texto
									</span>
									<span class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
										Para pegar directamente en el otro dispositivo
									</span>
								</button>
							</div>
						</div>
					{:else}
						<!-- RECEIVER: DROPZONE & PASTE -->
						<div class="space-y-4">
							<!-- Drag and Drop Box -->
							<div
								role="region"
								aria-label="Zona para arrastrar archivos"
								ondragover={(e) => {
									e.preventDefault();
									isDraggingFile = true;
								}}
								ondragleave={() => (isDraggingFile = false)}
								ondrop={handleFileDrop}
								class="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-3 {isDraggingFile
									? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 scale-[1.01]'
									: 'border-slate-300 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40'}"
							>
								<div class="p-3 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
									<FolderUp class="h-6 w-6" />
								</div>
								<div>
									<h5 class="text-xs font-bold text-slate-900 dark:text-slate-100">
										Arrastra tu archivo <code class="font-mono text-indigo-600">.planner</code> aquí
									</h5>
									<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
										o selecciónalo desde tus carpetas o descargas
									</p>
								</div>

								<label class="cursor-pointer">
									<span class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs">
										Seleccionar Archivo
									</span>
									<input
										type="file"
										accept=".planner,.json"
										onchange={handleFileSelected}
										class="hidden"
									/>
								</label>
							</div>

							<!-- Paste Token Alternative -->
							<div class="flex items-center justify-center">
								<button
									type="button"
									onclick={pasteFromClipboard}
									class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
								>
									<ClipboardPaste class="h-3.5 w-3.5" />
									<span>Pegar código desde el portapapeles</span>
								</button>
							</div>

							{#if fileImportError}
								<p class="text-xs text-rose-600 dark:text-rose-400 text-center font-medium">
									{fileImportError}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Security note footer -->
			<div class="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400 dark:text-slate-500">
				<ShieldCheck class="h-3.5 w-3.5 text-emerald-500" />
				<span>100% privado y sin límites: tus datos no se guardan en ningún servidor externo.</span>
			</div>
		</div>
	{/if}
</Modal>
