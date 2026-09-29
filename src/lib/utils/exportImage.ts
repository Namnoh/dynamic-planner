import { toPng, toJpeg, toCanvas } from 'html-to-image';
import type { ExportImageOptions } from '$lib/types';

/**
 * Downloads a data URL or Blob as a file in the browser.
 */
export function downloadFile(urlOrBlob: string | Blob, filename: string): void {
	const link = document.createElement('a');
	link.download = filename;

	if (typeof urlOrBlob === 'string') {
		link.href = urlOrBlob;
		link.click();
	} else {
		const objectUrl = URL.createObjectURL(urlOrBlob);
		link.href = objectUrl;
		link.click();
		setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
	}
}

/**
 * Renders an HTML element as an image (PNG, JPEG, WebP) with custom resolution
 * and automatic exclusion of UI controls (.no-export).
 */
export async function exportElementAsImage(
	element: HTMLElement,
	options: ExportImageOptions = { format: 'png', scale: 2, quality: 0.95 }
): Promise<string> {
	const {
		format = 'png',
		quality = 0.95,
		scale = 2,
		filename,
		backgroundColor = '#0b0f19',
		hideSelectors = ['.no-export', '[data-export-ignore="true"]']
	} = options;

	// Filter function to skip action buttons, dropdowns, navigation bars, etc.
	const filter = (node: Node): boolean => {
		if (node instanceof HTMLElement) {
			for (const selector of hideSelectors) {
				if (node.matches(selector)) return false;
			}
			if (node.classList.contains('no-export')) return false;
			if (node.getAttribute('data-export-ignore') === 'true') return false;
		}
		return true;
	};

	const commonOptions = {
		pixelRatio: scale,
		quality,
		backgroundColor,
		filter,
		cacheBust: true,
		style: {
			// Ensure background covers full rendered element cleanly
			borderRadius: '0px'
		}
	};

	let dataUrl: string;

	if (format === 'jpeg') {
		dataUrl = await toJpeg(element, commonOptions);
	} else if (format === 'webp') {
		// Use html-to-image's toCanvas and native canvas webp converter for optimal compression
		const canvas = await toCanvas(element, commonOptions);
		dataUrl = canvas.toDataURL('image/webp', quality);
	} else {
		// Default to PNG
		dataUrl = await toPng(element, commonOptions);
	}

	if (filename) {
		const ext = format === 'jpeg' ? 'jpg' : format;
		const finalName = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
		downloadFile(dataUrl, finalName);
	}

	return dataUrl;
}
