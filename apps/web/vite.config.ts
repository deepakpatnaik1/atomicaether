import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Theme injection now handled by inject-theme.js script
		// to avoid duplicate injections and conflicts
		sveltekit()
	],
	server: {
		fs: {
			allow: ['../..']
		}
	}
});