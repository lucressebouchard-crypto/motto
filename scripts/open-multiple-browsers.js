/**
 * Script pour ouvrir plusieurs navigateurs de test avec des sessions isolées
 * Chaque navigateur a son propre localStorage et cookies (comptes différents)
 */

import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

console.log('🌐 Ouverture de plusieurs navigateurs de test...\n');
console.log('💡 Chaque navigateur aura une session complètement isolée\n');

// Ouvrir plusieurs navigateurs avec des contextes isolés
const browsers = [];

async function openBrowser(browserNumber) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: null,
    // Chaque contexte est isolé - localStorage et cookies séparés
    storageState: undefined,
  });

  const page = await context.newPage();
  await page.goto(URL);

  console.log(`✅ Navigateur #${browserNumber} ouvert sur ${URL}`);
  
  browsers.push({ browser, context, page, number: browserNumber });

  return { browser, context, page };
}

// Ouvrir 2 navigateurs par défaut avec un petit délai entre eux
const browser1 = await openBrowser(1);
await new Promise(resolve => setTimeout(resolve, 500)); // Petit délai
const browser2 = await openBrowser(2);

console.log('\n🎉 2 navigateurs ouverts !');
console.log('📋 Chaque navigateur est complètement indépendant :');
console.log('   - localStorage séparé');
console.log('   - Cookies séparés');
console.log('   - Sessions isolées');
console.log('\n💡 Vous pouvez maintenant vous connecter avec différents comptes dans chaque navigateur');
console.log('💡 Appuyez sur Ctrl+C pour fermer tous les navigateurs\n');

// Gestion de la fermeture
process.on('SIGINT', async () => {
  console.log('\n\n👋 Fermeture de tous les navigateurs...');
  for (const { browser } of browsers) {
    await browser.close();
  }
  process.exit(0);
});

// Garder le processus actif
await new Promise(() => {});

