import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    // Se a versão do Playwright não casar com o Chromium instalado, defina CHROMIUM_PATH.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://localhost:5173', reuseExistingServer: true }
});
