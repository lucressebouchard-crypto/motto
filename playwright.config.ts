import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E
 */
export default defineConfig({
  testDir: './tests',
  
  /* Nombre de tentatives en cas d'échec */
  retries: process.env.CI ? 2 : 0,
  
  /* Nombre de workers en parallèle */
  workers: process.env.CI ? 1 : undefined,
  
  /* Configuration du timeout */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  
  /* Configuration du rapport */
  fullyParallel: false, // Désactiver le parallélisme pour les tests de badges
  forbidOnly: !!process.env.CI,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  /* Configuration partagée */
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
    // Enregistrer les actions dans la trace
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configuration des projets pour différents navigateurs */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Vous pouvez ajouter d'autres navigateurs si nécessaire
  ],

  /* Serveur de dev pour les tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

