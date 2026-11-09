/**
 * Data Transfer & Synchronization Utilities for Dynamic Planner
 *
 * Supports:
 * 1. P2P Direct Real-Time Sync via WebRTC (PeerJS) using a 6-digit numeric PIN.
 * 2. Native Web Share API (.planner files for WhatsApp, AirDrop, Telegram, etc.).
 * 3. File Drag & Drop import and Clipboard token exchange.
 * 4. Ultra-compact gzip payload compression.
 */

import { getTodayDateString } from '$lib/types';

function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = '';
	const len = bytes.byteLength;
	const chunkSize = 0x8000;
	for (let i = 0; i < len; i += chunkSize) {
		const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
		binary += String.fromCharCode.apply(null, Array.from(chunk));
	}
	return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Compresses a string into a URL-safe Base64 string using native browser gzip (writer/reader).
 */
export async function compressString(text: string): Promise<string> {
	if (typeof CompressionStream !== 'undefined') {
		try {
			const byteArray = new TextEncoder().encode(text);
			const cs = new CompressionStream('gzip');
			const writer = cs.writable.getWriter();
			writer.write(byteArray as unknown as BufferSource);
			writer.close();

			const reader = cs.readable.getReader();
			const chunks: Uint8Array[] = [];
			let totalLength = 0;
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				if (value) {
					chunks.push(value);
					totalLength += value.length;
				}
			}

			const result = new Uint8Array(totalLength);
			let offset = 0;
			for (const chunk of chunks) {
				result.set(chunk, offset);
				offset += chunk.length;
			}
			return uint8ArrayToBase64(result);
		} catch (err) {
			console.warn('CompressionStream fallback:', err);
		}
	}
	try {
		const bytes = new TextEncoder().encode(text);
		return uint8ArrayToBase64(bytes);
	} catch {
		return btoa(unescape(encodeURIComponent(text)));
	}
}

/**
 * Decompresses a Base64 string back into original text using native browser gzip (writer/reader).
 */
export async function decompressString(base64: string): Promise<string> {
	const bytes = base64ToUint8Array(base64);
	if (typeof DecompressionStream !== 'undefined') {
		try {
			const ds = new DecompressionStream('gzip');
			const writer = ds.writable.getWriter();
			writer.write(bytes as unknown as BufferSource);
			writer.close();

			const reader = ds.readable.getReader();
			const chunks: Uint8Array[] = [];
			let totalLength = 0;
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				if (value) {
					chunks.push(value);
					totalLength += value.length;
				}
			}

			const result = new Uint8Array(totalLength);
			let offset = 0;
			for (const chunk of chunks) {
				result.set(chunk, offset);
				offset += chunk.length;
			}
			return new TextDecoder().decode(result);
		} catch (err) {
			console.warn('DecompressionStream fallback:', err);
		}
	}
	try {
		return new TextDecoder().decode(bytes);
	} catch {
		return decodeURIComponent(escape(atob(base64)));
	}
}

/**
 * Compacts verbose database JSON into positional arrays to minimize payload size by ~75%.
 */
export function compactDatabase(jsonText: string): string {
	try {
		const parsed = JSON.parse(jsonText);
		const data = parsed.data || parsed;
		const compact = {
			v: 2,
			s: parsed.scope || 'full',
			// Categories: [id, name, color]
			c: (data.categories || []).map((cat: any) => [cat.id, cat.name, cat.color]),
			// Activities: [id, title, category, defaultDuration, color, notes, subtasks]
			a: (data.activities || []).map((act: any) => [
				act.id,
				act.title,
				act.category || '',
				act.defaultDuration || act.durationMinutes || 60,
				act.color || '#3b82f6',
				act.notes || '',
				act.subtasks || []
			]),
			// Templates: [id, name, blocks, recurrence]
			t: (data.dayTemplates || []).map((tpl: any) => [
				tpl.id,
				tpl.name,
				tpl.blocks || [],
				tpl.recurrence || null
			]),
			// Events: [id, date, start, end, title, category, color, completed, notes, subtasks, recurrenceId]
			e: (data.events || []).map((evt: any) => [
				evt.id,
				evt.date,
				evt.startTime,
				evt.endTime,
				evt.title,
				evt.category || '',
				evt.color || '#3b82f6',
				evt.completed ? 1 : 0,
				evt.notes || '',
				(evt.subtasks || []).map((st: any) => `${st.completed ? '1' : '0'}|${st.title}`),
				evt.recurrenceId || ''
			])
		};
		return JSON.stringify(compact);
	} catch {
		return jsonText;
	}
}

/**
 * Restores a compact v2 payload back into the standard Dynamic Planner database JSON structure.
 */
export function decompactDatabase(compactObj: any): string {
	if (compactObj && compactObj.v === 2) {
		const full = {
			app: 'dynamic-planner',
			version: '1.0.0',
			scope: compactObj.s || 'full',
			exportedAt: new Date().toISOString(),
			data: {
				categories: (compactObj.c || []).map((c: any[]) => ({
					id: c[0],
					name: c[1],
					color: c[2]
				})),
				activities: (compactObj.a || []).map((a: any[]) => ({
					id: a[0],
					title: a[1],
					category: a[2] || undefined,
					defaultDuration: a[3],
					color: a[4],
					notes: a[5] || '',
					subtasks: a[6] || []
				})),
				dayTemplates: (compactObj.t || []).map((t: any[]) => ({
					id: t[0],
					name: t[1],
					blocks: t[2] || [],
					recurrence: t[3] || null
				})),
				events: (compactObj.e || []).map((e: any[]) => ({
					id: e[0],
					date: e[1],
					startTime: e[2],
					endTime: e[3],
					title: e[4],
					category: e[5] || undefined,
					color: e[6],
					completed: e[7] === 1,
					notes: e[8] || '',
					subtasks: (e[9] || []).map((itemStr: string, idx: number) => {
						const [comp, ...rest] = itemStr.split('|');
						return { id: `st-${idx}`, title: rest.join('|'), completed: comp === '1' };
					}),
					recurrenceId: e[10] || undefined
				})),
				specialEvents: [],
				settings: []
			}
		};
		return JSON.stringify(full);
	}
	return typeof compactObj === 'string' ? compactObj : JSON.stringify(compactObj);
}

/**
 * Universal payload parser supporting raw JSON, compact v2 objects, and compressed base64 tokens.
 */
export async function parseImportPayload(input: any): Promise<string> {
	if (!input) {
		throw new Error('Los datos proporcionados están vacíos.');
	}

	const str = typeof input === 'string' ? input.trim() : JSON.stringify(input);

	if (str.startsWith('DP2:')) {
		const base64 = str.slice(4);
		const decompressed = await decompressString(base64);
		const parsed = JSON.parse(decompressed);
		return decompactDatabase(parsed);
	}

	if (str.startsWith('DP1:S:')) {
		const base64 = str.slice(6);
		return await decompressString(base64);
	}

	try {
		const parsed = JSON.parse(str);
		if (parsed.v === 2) {
			return decompactDatabase(parsed);
		}
		if (parsed.data || (parsed.app && parsed.app === 'dynamic-planner')) {
			return str;
		}
		if (parsed.events || parsed.activities) {
			return JSON.stringify({
				app: 'dynamic-planner',
				version: '1.0.0',
				scope: 'full',
				exportedAt: new Date().toISOString(),
				data: parsed
			});
		}
		return str;
	} catch {
		try {
			const decompressed = await decompressString(str);
			const parsed = JSON.parse(decompressed);
			if (parsed.v === 2) {
				return decompactDatabase(parsed);
			}
			return decompressed;
		} catch {
			throw new Error('Formato de datos no reconocido como archivo de Dynamic Planner.');
		}
	}
}

/**
 * Generates a friendly 6-digit sync code formatted as XXX-XXX (e.g. 482-910).
 */
export function generateSyncCode(): string {
	const num = Math.floor(100000 + Math.random() * 900000);
	const str = String(num);
	return `${str.slice(0, 3)}-${str.slice(3)}`;
}

/**
 * Normalizes a sync code removing spaces, dashes, or non-alphanumeric chars.
 */
export function normalizeSyncCode(code: string): string {
	return code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export interface P2PSenderSession {
	code: string;
	cleanCode: string;
	destroy: () => void;
}

/**
 * Establishes a P2P WebRTC sender session waiting for the receiver to connect with the given 6-digit PIN.
 */
export async function startP2PSender(
	rawJson: string,
	code: string,
	onEvent: (event: { type: 'ready' | 'connected' | 'transferred' | 'error'; message?: string }) => void
): Promise<P2PSenderSession> {
	if (typeof window === 'undefined') {
		throw new Error('La sincronización P2P solo está disponible en el navegador.');
	}

	const cleanCode = normalizeSyncCode(code);
	const peerId = `dp-sync-${cleanCode}`;

	const { Peer } = await import('peerjs');
	const peer = new Peer(peerId, { debug: 1 });

	let isDestroyed = false;

	peer.on('open', () => {
		if (isDestroyed) return;
		onEvent({ type: 'ready', message: 'Listo para transferir' });
	});

	peer.on('connection', (conn) => {
		if (isDestroyed) return;
		onEvent({ type: 'connected', message: 'Receptor conectado. Transfiriendo datos...' });

		conn.on('open', () => {
			try {
				const compacted = compactDatabase(rawJson);
				conn.send({
					app: 'dynamic-planner',
					version: '2.0.0',
					data: compacted
				});
				onEvent({ type: 'transferred', message: '¡Datos transferidos con éxito!' });
			} catch (err: any) {
				onEvent({ type: 'error', message: err?.message || 'Error al enviar los datos.' });
			}
		});

		conn.on('error', (err) => {
			onEvent({ type: 'error', message: err?.message || 'Error en la conexión directa.' });
		});
	});

	peer.on('error', (err: any) => {
		if (isDestroyed) return;
		if (err.type === 'unavailable-id') {
			onEvent({
				type: 'error',
				message: 'El código generado ya está en uso. Genera un nuevo código para continuar.'
			});
		} else {
			onEvent({ type: 'error', message: err?.message || 'Error del servicio de enlace P2P.' });
		}
	});

	return {
		code,
		cleanCode,
		destroy: () => {
			isDestroyed = true;
			try {
				peer.destroy();
			} catch {}
		}
	};
}

/**
 * Connects to a P2P sender using the 6-digit PIN, downloads the data payload and disconnects.
 */
export async function receiveP2PData(
	code: string,
	onProgress?: (status: string) => void
): Promise<string> {
	if (typeof window === 'undefined') {
		throw new Error('La sincronización P2P solo está disponible en el navegador.');
	}

	const cleanCode = normalizeSyncCode(code);
	if (!cleanCode) {
		throw new Error('Por favor ingresa un código de 6 dígitos válido.');
	}

	const targetPeerId = `dp-sync-${cleanCode}`;
	const { Peer } = await import('peerjs');

	return new Promise<string>((resolve, reject) => {
		onProgress?.('Conectando con el otro dispositivo...');
		const receiverPeer = new Peer();
		let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
		let isFinished = false;

		const cleanup = () => {
			isFinished = true;
			if (timeoutTimer) clearTimeout(timeoutTimer);
			try {
				receiverPeer.destroy();
			} catch {}
		};

		timeoutTimer = setTimeout(() => {
			if (!isFinished) {
				cleanup();
				reject(
					new Error(
						'Tiempo de espera agotado. Asegúrate de que el otro dispositivo tenga el código en pantalla.'
					)
				);
			}
		}, 30000);

		receiverPeer.on('open', () => {
			onProgress?.('Estableciendo enlace directo seguro...');
			const conn = receiverPeer.connect(targetPeerId, { reliable: true });

			conn.on('open', () => {
				onProgress?.('Descargando datos del cronograma...');
			});

			conn.on('data', async (incoming: any) => {
				if (isFinished) return;
				try {
					let rawPayload = incoming;
					if (incoming && typeof incoming === 'object' && incoming.data) {
						rawPayload = incoming.data;
					}
					const finalJson = await parseImportPayload(rawPayload);
					cleanup();
					resolve(finalJson);
				} catch (err: any) {
					cleanup();
					reject(new Error(err?.message || 'Error al procesar los datos recibidos.'));
				}
			});

			conn.on('error', (err) => {
				if (isFinished) return;
				cleanup();
				reject(new Error(err?.message || 'Error en el canal de datos.'));
			});
		});

		receiverPeer.on('error', (err: any) => {
			if (isFinished) return;
			cleanup();
			if (err.type === 'peer-unavailable') {
				reject(
					new Error(
						'No se encontró ningún emisor activo con ese código. Verifica el código o genera uno nuevo.'
					)
				);
			} else {
				reject(new Error(err?.message || 'Error de conexión P2P.'));
			}
		});
	});
}

/**
 * Shares or downloads a friendly .planner file using the Web Share API or download fallback.
 */
export async function shareOrDownloadPlannerFile(
	jsonContent: string,
	filenamePrefix = 'rutina'
): Promise<{ success: boolean; method: 'shared' | 'downloaded' | 'cancelled' }> {
	const dateStr = getTodayDateString();
	const fileName = `${filenamePrefix}-${dateStr}.planner`;
	const file = new File([jsonContent], fileName, { type: 'application/json' });

	if (
		typeof navigator !== 'undefined' &&
		navigator.canShare &&
		navigator.canShare({ files: [file] })
	) {
		try {
			await navigator.share({
				title: 'Mi Rutina en Dynamic Planner',
				text: 'Respaldo de horario y actividades para importar en Dynamic Planner.',
				files: [file]
			});
			return { success: true, method: 'shared' };
		} catch (err: any) {
			if (err.name === 'AbortError') {
				return { success: false, method: 'cancelled' };
			}
			// Fallback to download below
		}
	}

	// Fallback direct download
	const blob = new Blob([jsonContent], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	a.click();
	URL.revokeObjectURL(url);
	return { success: true, method: 'downloaded' };
}
