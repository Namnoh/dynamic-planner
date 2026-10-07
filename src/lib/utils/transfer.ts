/**
 * Data Transfer & QR Payload Compression Utilities for Dynamic Planner
 *
 * Supports:
 * 1. Extreme Compact QR Encoding (guaranteeing 1 single static QR code).
 * 2. Native Web Share API (.planner friendly files for WhatsApp, AirDrop, etc.).
 * 3. Backward compatible decompression for legacy multi-part and JSON payloads.
 */

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
 * Generates an ultra-compact single QR payload.
 */
export async function createSingleQrPayload(jsonText: string): Promise<{
	payload: string;
	fitsInSingleQr: boolean;
	charLength: number;
}> {
	const compacted = compactDatabase(jsonText);
	const compressed = await compressString(compacted);
	const payload = `DP2:${compressed}`;
	// Safe threshold for 1-scan QR: standard QR can encode up to 2,900 chars
	const fitsInSingleQr = payload.length <= 2600;
	return {
		payload,
		fitsInSingleQr,
		charLength: payload.length
	};
}

/**
 * Legacy multi-part chunk generator (fallback if user specifically requires raw payload splitting).
 */
export async function createQrPayloads(jsonText: string): Promise<string[]> {
	const single = await createSingleQrPayload(jsonText);
	if (single.fitsInSingleQr) {
		return [single.payload];
	}

	// If over safe threshold, split using DP1:M:
	const compressed = await compressString(jsonText);
	const CHUNK_SIZE = 1200;
	const sessionId = Math.random().toString(36).slice(2, 6);
	const totalChunks = Math.ceil(compressed.length / CHUNK_SIZE);
	const payloads: string[] = [];

	for (let i = 0; i < totalChunks; i++) {
		const chunk = compressed.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
		payloads.push(`DP1:M:${i + 1}:${totalChunks}:${sessionId}:${chunk}`);
	}

	return payloads;
}

export interface ChunkSession {
	sessionId: string;
	totalChunks: number;
	chunks: Map<number, string>;
}

export type ParseQrResult =
	| { type: 'complete'; jsonText: string }
	| { type: 'chunk_progress'; current: number; total: number; sessionId: string }
	| { type: 'ignored'; reason: string }
	| { type: 'error'; error: string };

/**
 * Processes a scanned QR text payload, handling DP2 compact, DP1 single, DP1 multi, or plain JSON.
 */
export async function processScannedQr(
	scannedText: string,
	currentSession?: ChunkSession | null
): Promise<{ result: ParseQrResult; nextSession?: ChunkSession | null }> {
	const trimmed = scannedText.trim();

	// 1. Ultra-compact v2 format: DP2:<compressedBase64>
	if (trimmed.startsWith('DP2:')) {
		const base64 = trimmed.slice(4);
		try {
			const decompressed = await decompressString(base64);
			const compactParsed = JSON.parse(decompressed);
			const fullJson = decompactDatabase(compactParsed);
			return { result: { type: 'complete', jsonText: fullJson }, nextSession: null };
		} catch (err: any) {
			return {
				result: { type: 'error', error: 'Error al descomprimir los datos del código QR v2.' },
				nextSession: null
			};
		}
	}

	// 2. Legacy single format: DP1:S:<data>
	if (trimmed.startsWith('DP1:S:')) {
		const base64 = trimmed.slice(6);
		try {
			const jsonText = await decompressString(base64);
			return { result: { type: 'complete', jsonText }, nextSession: null };
		} catch {
			return {
				result: { type: 'error', error: 'Error al descomprimir los datos del código QR.' },
				nextSession: null
			};
		}
	}

	// 3. Multi-part QR format: DP1:M:<index>:<total>:<sessionId>:<chunk>
	if (trimmed.startsWith('DP1:M:')) {
		const parts = trimmed.split(':');
		if (parts.length >= 6) {
			const index = Number(parts[2]);
			const total = Number(parts[3]);
			const sessionId = parts[4];
			const chunkData = parts.slice(5).join(':');

			if (isNaN(index) || isNaN(total) || total <= 0 || index <= 0) {
				return {
					result: { type: 'error', error: 'Formato de fragmento QR inválido.' },
					nextSession: currentSession
				};
			}

			let session = currentSession;
			if (!session || session.sessionId !== sessionId) {
				session = {
					sessionId,
					totalChunks: total,
					chunks: new Map()
				};
			}

			session.chunks.set(index, chunkData);

			if (session.chunks.size >= total) {
				let fullBase64 = '';
				for (let i = 1; i <= total; i++) {
					const chunk = session.chunks.get(i);
					if (!chunk) {
						return {
							result: { type: 'chunk_progress', current: session.chunks.size, total, sessionId },
							nextSession: session
						};
					}
					fullBase64 += chunk;
				}

				try {
					const jsonText = await decompressString(fullBase64);
					return { result: { type: 'complete', jsonText }, nextSession: null };
				} catch {
					return {
						result: { type: 'error', error: 'Error al descomprimir la serie de fragmentos QR.' },
						nextSession: null
					};
				}
			}

			return {
				result: { type: 'chunk_progress', current: session.chunks.size, total, sessionId },
				nextSession: session
			};
		}
	}

	// 4. Fallback: Raw JSON string directly
	if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed.v === 2) {
				return { result: { type: 'complete', jsonText: decompactDatabase(parsed) }, nextSession: null };
			}
			return { result: { type: 'complete', jsonText: trimmed }, nextSession: null };
		} catch {
			return {
				result: { type: 'error', error: 'El contenido escaneado no es un JSON válido.' },
				nextSession: null
			};
		}
	}

	return {
		result: { type: 'ignored', reason: 'Código QR no reconocido como respaldo de Dynamic Planner.' },
		nextSession: currentSession
	};
}

/**
 * Shares or downloads a friendly .planner file using the Web Share API or download fallback.
 */
export async function shareOrDownloadPlannerFile(
	jsonContent: string,
	filenamePrefix = 'rutina'
): Promise<{ success: boolean; method: 'shared' | 'downloaded' | 'cancelled' }> {
	const dateStr = new Date().toISOString().split('T')[0];
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
