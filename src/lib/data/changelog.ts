export type ChangelogCategory = 'feat' | 'fix' | 'improvement';

export interface ChangelogItem {
	type: ChangelogCategory;
	text: string;
	detail?: string;
}

export interface Release {
	version: string;
	title: string;
	date: string;
	badge?: string;
	description: string;
	items: ChangelogItem[];
}

export const CHANGELOG_DATA: Release[] = [
	{
		version: '1.0.0',
		title: 'Lanzamiento Oficial & Experiencia Unificada',
		date: '2026-10-06',
		badge: 'Versión Actual',
		description: 'Primera versión oficial estable de Dynamic Planner con selectores enriquecidos, navegación por calendario, soporte PWA completo y correcciones críticas en dispositivos móviles.',
		items: [
			{
				type: 'feat',
				text: 'Selectores con búsqueda en vivo (SearchableSelect)',
				detail: 'Filtrado instantáneo en tiempo real, navegación fluida con teclado (flechas y Enter), indicadores de color y soporte de subetiquetas en todos los selectores de la aplicación.'
			},
			{
				type: 'feat',
				text: 'Selector de semana interactivo (WeekPickerCalendar)',
				detail: 'Navega libremente entre semanas, meses y años al hacer clic en el rango de fechas de la cabecera, con salto rápido a la semana actual.'
			},
			{
				type: 'feat',
				text: 'Plantillas de actividad como base al crear bloques',
				detail: 'Al programar un nuevo bloque de tiempo, ahora puedes elegir una actividad predeterminada para autocompletar su título, categoría, duración y color.'
			},
			{
				type: 'feat',
				text: 'Modo Lectura protegido (Floating Pill)',
				detail: 'Botón flotante para activar o desactivar la edición y arrastre, permitiendo deslizar la pantalla en móviles sin mover bloques por accidente.'
			},
			{
				type: 'feat',
				text: 'Edición completa de actividades predeterminadas',
				detail: 'Modifica actividades creadas anteriormente en el Gestor de Plantillas sin tener que eliminarlas y volverlas a crear.'
			},
			{
				type: 'fix',
				text: 'Solución al bug de arrastre táctil y bloque fantasma en móviles',
				detail: 'Se aisló la zona de arrastre para evitar que al deslizar el dedo en días vacíos se clonaran elementos fijos en pantalla.'
			},
			{
				type: 'fix',
				text: 'Resolución de DataCloneError en IndexedDB',
				detail: 'Aplicación de instantáneas limpias ($state.snapshot) al persistir objetos reactivos de Svelte 5 en la base de datos local Dexie.'
			},
			{
				type: 'fix',
				text: 'Bloqueo de scroll y superposición de modales',
				detail: 'Control riguroso del scroll del fondo al abrir ventanas emergentes y eliminación de brechas transparentes.'
			},
			{
				type: 'improvement',
				text: 'Optimización de SEO y Metadatos para mydynamicplanner.com',
				detail: 'Soporte completo de OpenGraph, Twitter Cards, Schema.org JSON-LD para indexación y textos adaptados a un lenguaje más humano.'
			},
			{
				type: 'improvement',
				text: 'Instalación PWA simplificada y soporte offline robusto',
				detail: 'Nuevo modal de instalación guiada para navegadores móviles y escritorio, con guardado garantizado en modo sin conexión.'
			}
		]
	},
	{
		version: '0.9.0',
		title: 'PWA Offline & Identidad Visual',
		date: '2026-10-02',
		description: 'Mejoras fundamentales en la arquitectura offline, registro de Service Worker y nueva iconografía oficial.',
		items: [
			{
				type: 'feat',
				text: 'Iconografía oficial y tema visual renovado',
				detail: 'Integración del isotipo SVG dynamic-planner.svg en alta definición y favicons responsivos.'
			},
			{
				type: 'improvement',
				text: 'Compatibilidad estricta con Cloudflare Workers & Pages',
				detail: 'Configuración nativa de activos estáticos SPA y soporte de previsualización en la rama de desarrollo.'
			},
			{
				type: 'fix',
				text: 'Eliminación de bucle de redirecciones en el despliegue',
				detail: 'Manejo SPA nativo en la capa de borde sin conflictos con archivos de redirección antiguos.'
			}
		]
	},
	{
		version: '0.8.0',
		title: 'Time-Blocking Modular Inicial',
		date: '2026-09-28',
		description: 'Nacimiento de Dynamic Planner con tablero semanal interactivo, arrastre fluido de bloques (DnD) y base de datos local IndexedDB.',
		items: [
			{
				type: 'feat',
				text: 'Tablero semanal interactivo de 7 días',
				detail: 'Organización visual de bloques de tiempo de lunes a domingo con navegación semanal.'
			},
			{
				type: 'feat',
				text: 'Gestor de plantillas de día y secuencias',
				detail: 'Crea rutinas completas y aplícalas a cualquier fecha con un solo clic.'
			},
			{
				type: 'feat',
				text: 'Almacenamiento privado 100% offline (Dexie / IndexedDB)',
				detail: 'Tus datos no salen de tu navegador. Soporte de exportación e importación de respaldos en formato JSON.'
			},
			{
				type: 'feat',
				text: 'Exportación gráfica de horario',
				detail: 'Descarga tu cronograma semanal como imagen PNG, JPEG o WebP en alta calidad.'
			}
		]
	}
];

export const LATEST_VERSION = CHANGELOG_DATA[0].version;
