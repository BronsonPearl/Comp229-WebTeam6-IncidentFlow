/**
 * COMP229 - Web Application Development
 * Project: IncidentFlow - Incident Management System
 *
 * Team Members:
 * Ivan Seck Ali - 301501210
 * Robel Teffera - 301113578
 * Ryan Sunil - 301495962
 * Bronson Pearl - 301328703
 *
 * Description:
 * This file is part of the IncidentFlow MERN application.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// mode is "demo" when we run npm run build:demo
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // relative paths for the demo so it works in any folder
  base: mode === 'demo' ? './' : '/',

  // lets us write @shared/constants.js instead of ../../../shared/constants.js
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },

  // dev server settings
  server: {
    port: 5173,
    fs: { allow: ['..'] },   // allow importing files from the shared folder outside client/
    proxy: { '/api': 'http://localhost:5000' },   // during dev, /api calls go to the Express server on port 5000
  },

  // normal build goes to dist, demo build to dist-demo
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
    chunkSizeWarningLimit: 600,
  },

  // Vitest settings: jsdom gives the tests a fake browser
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    css: false,
  },
}));
