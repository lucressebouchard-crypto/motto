/**
 * Script pour ouvrir un navigateur de test avec Playwright
 * Utile pour tester avec plusieurs comptes simultanément
 */

import { chromium } from '@playwright/test';

console.log('🌐 Ouverture d\'un navigateur de test...\n');

const browser = await chromium.launch({
  headless: false,
  args: ['--start-maximized'],
});

const context = await browser.newContext({
  viewport: null, // Utiliser la taille de la fenêtre
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});

const page = await context.newPage();

// Aller à l'application
const url = 'http://localhost:3000';
console.log(`📱 Navigation vers: ${url}`);
await page.goto(url);

console.log('\n✅ Navigateur de test ouvert !');
console.log('💡 Vous pouvez maintenant vous connecter avec un autre compte');
console.log('💡 Fermez ce terminal pour fermer le navigateur\n');

// Garder le navigateur ouvert
process.on('SIGINT', async () => {
  console.log('\n\n👋 Fermeture du navigateur de test...');
  await browser.close();
  process.exit(0);
});

// Garder le processus actif
await new Promise(() => {});

