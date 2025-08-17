import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { themeInjector } from './build-plugins/theme-injector.js';

export default defineConfig({
	plugins: [
		themeInjector(), // Inject build-time theme before SvelteKit processes
		sveltekit()
	],
	server: {
		fs: {
			allow: ['../..']
		}
	}
});