import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: 'index.html',
				strict: false
			})
		}),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'production',
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: {
				name: 'Dynamic Planner',
				short_name: 'DynamicPlanner',
				description: 'Sistema modular de time-blocking y planificación adaptable offline-first',
				theme_color: '#090d16',
				background_color: '#090d16',
				display: 'standalone',
				orientation: 'any',
				start_url: '/',
				icons: [
					{
						src: '/favicon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any'
					}
				]
			},
			devOptions: {
				enabled: true,
				suppressWarnings: true,
				type: 'module'
			}
		})
	]
});
