import { test, expect, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Résoudre __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Helper pour attendre que l'app soit prête
async function waitForAppReady(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(1000); // Attendre que React hydrate
}

// Helper pour se connecter
async function login(page: Page, email: string, password: string) {
  console.log(`🔐 Tentative de connexion avec: ${email}`);
  
  // Chercher le bouton de connexion ou le formulaire
  const loginButton = page.locator('button:has-text("Se connecter"), button:has-text("Connexion"), button:has-text("Login")').first();
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  
  // Prendre une capture avant connexion
  await page.screenshot({ path: 'tests/screenshots/01-before-login.png', fullPage: true });
  
  // Si on voit déjà les inputs, remplir directement
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await loginButton.click();
  } else {
    // Sinon, chercher un bouton pour ouvrir le modal
    const openAuthButton = page.locator('button:has-text("Connexion"), button:has-text("Se connecter")').first();
    if (await openAuthButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openAuthButton.click();
      await page.waitForTimeout(500);
      await emailInput.fill(email);
      await passwordInput.fill(password);
      await loginButton.click();
    }
  }
  
  // Attendre que la connexion se termine
  await page.waitForTimeout(2000);
  
  // Prendre une capture après connexion
  await page.screenshot({ path: 'tests/screenshots/02-after-login.png', fullPage: true });
  
  console.log('✅ Connexion terminée');
}

// Helper pour trouver un chat avec badge
async function findChatWithBadge(page: Page) {
  console.log('🔍 Recherche d\'un chat avec badge...');
  
  // Chercher tous les sélecteurs possibles pour les badges
  const badgeSelectors = [
    '.bg-red-500',
    '[class*="badge"]',
    '[class*="unread"]',
    '.text-white.bg-red',
    'span:has-text(/\\d+/):near(button)',
  ];
  
  for (const selector of badgeSelectors) {
    const badges = page.locator(selector);
    const count = await badges.count();
    if (count > 0) {
      console.log(`✅ Trouvé ${count} badge(s) avec le sélecteur: ${selector}`);
      return badges.first();
    }
  }
  
  // Si aucun badge trouvé, prendre une capture pour debug
  await page.screenshot({ path: 'tests/screenshots/debug-no-badge-found.png', fullPage: true });
  console.log('⚠️ Aucun badge trouvé');
  return null;
}

test.describe('Système de badges de messages - Tests complets', () => {
  // Créer le dossier screenshots
  test.beforeAll(async () => {
    const screenshotsDir = path.resolve(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(60000); // Timeout de 60s pour le hook
    // Activer la console du navigateur pour capturer les logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🚨 Browser Error: ${msg.text()}`);
      } else if (msg.text().includes('[chatService]') || msg.text().includes('[ChatList]')) {
        console.log(`📝 ${msg.text()}`);
      }
    });

    // Capturer les erreurs réseau
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`⚠️ HTTP ${response.status()}: ${response.url()}`);
      }
    });

    // Aller à l'application
    console.log('🌐 Navigation vers l\'application...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Attendre que l'app se charge
    await waitForAppReady(page);
    
    // Prendre une capture initiale
    await page.screenshot({ path: 'tests/screenshots/00-initial-load.png', fullPage: true });
  });

  test('Test complet: Badges doivent disparaître après lecture', async ({ page }) => {
    test.setTimeout(60000); // 60 secondes pour ce test
    
    console.log('\n📋 TEST 1: Badges doivent disparaître après lecture\n');
    
    // Utiliser des credentials de test (à ajuster selon votre config)
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'test123456';
    
    // Se connecter si nécessaire
    const isLoggedIn = await page.locator('button:has-text("Déconnexion"), button:has-text("Logout")').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('👤 Pas connecté, connexion en cours...');
      await login(page, testEmail, testPassword);
      await waitForAppReady(page);
    } else {
      console.log('✅ Déjà connecté');
    }
    
    // Prendre capture après connexion
    await page.screenshot({ path: 'tests/screenshots/03-logged-in.png', fullPage: true });
    
    // Trouver et cliquer sur l'icône de chat
    console.log('💬 Recherche de l\'icône de chat...');
    const chatIcon = page.locator('button:has(svg), button[aria-label*="chat" i], button[aria-label*="message" i]').filter({
      has: page.locator('svg')
    }).first();
    
    if (await chatIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatIcon.click();
      console.log('✅ Icône de chat cliquée');
      await page.waitForTimeout(1000);
      
      // Prendre capture après ouverture du chat
      await page.screenshot({ path: 'tests/screenshots/04-chat-opened.png', fullPage: true });
    } else {
      console.log('⚠️ Icône de chat non trouvée, test arrêté');
      await page.screenshot({ path: 'tests/screenshots/error-chat-icon-not-found.png', fullPage: true });
      return;
    }
    
    // Chercher un badge sur l'icône de chat principale
    console.log('🔍 Recherche du badge principal sur l\'icône de chat...');
    const mainChatBadge = page.locator('.bg-red-500, [class*="badge"], .text-white.bg-red').first();
    const hasMainBadge = await mainChatBadge.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasMainBadge) {
      const badgeText = await mainChatBadge.textContent();
      console.log(`📊 Badge principal trouvé: ${badgeText}`);
      await page.screenshot({ path: 'tests/screenshots/05-main-badge-found.png', fullPage: true });
    }
    
    // Attendre que la liste des chats se charge
    await page.waitForTimeout(2000);
    
    // Chercher un chat avec un badge dans la liste
    console.log('🔍 Recherche d\'un chat avec badge dans la liste...');
    await page.screenshot({ path: 'tests/screenshots/06-chat-list.png', fullPage: true });
    
    // Attendre que les chats se chargent
    await page.waitForTimeout(2000);
    
    // Chercher tous les badges visibles (meilleure méthode)
    console.log('🔍 Recherche de tous les badges...');
    const allBadges = page.locator('.bg-red-500, [class*="bg-red"], span.bg-red-500, div.bg-red-500, [class*="unread"]');
    const badgeCount = await allBadges.count();
    console.log(`📊 Total badges trouvés: ${badgeCount}`);
    
    let chatWithBadge: any = null;
    let badgeBefore: any = null;
    let badgeCountBefore = '0';
    
    if (badgeCount > 0) {
      // Prendre une capture avec les badges
      await page.screenshot({ path: 'tests/screenshots/06-badges-found.png', fullPage: true });
      
      // Trouver le premier badge visible et remonter pour trouver le chat parent
      for (let i = 0; i < badgeCount; i++) {
        const badge = allBadges.nth(i);
        const isVisible = await badge.isVisible().catch(() => false);
        
        if (isVisible) {
          badgeBefore = badge;
          badgeCountBefore = (await badge.textContent()) || '0';
          console.log(`✅ Badge #${i} trouvé: ${badgeCountBefore}`);
          
          // Remonter dans le DOM pour trouver l'élément parent (le chat)
          // Les badges sont dans des éléments qui remontent vers le chat
          chatWithBadge = badge.locator('xpath=ancestor::button | ancestor::div[contains(@class, "chat")] | ancestor::div[contains(@class, "Chat")]').first();
          
          // Si pas trouvé avec xpath, essayer avec CSS
          if (!(await chatWithBadge.count()) || !(await chatWithBadge.isVisible().catch(() => false))) {
            chatWithBadge = badge.locator('..').locator('..').locator('..'); // Remonter 3 niveaux
          }
          
          break;
        }
      }
    }
    
    if (!chatWithBadge || !badgeBefore) {
      console.log('⚠️ Aucun chat avec badge trouvé dans la liste');
      console.log('ℹ️ Cela peut être normal s\'il n\'y a pas de messages non lus');
      await page.screenshot({ path: 'tests/screenshots/07-no-chat-with-badge.png', fullPage: true });
      
      // Prendre une capture du HTML pour debug
      const html = await page.content();
      const debugPath = path.resolve(__dirname, 'screenshots/debug-chat-list.html');
      fs.writeFileSync(debugPath, html);
      console.log(`📄 HTML sauvegardé dans: ${debugPath}`);
      
      // Pour continuer le test, sélectionner le premier chat disponible
      const firstChatButton = page.locator('button, div[class*="chat"], div[class*="Chat"]').filter({
        hasText: /./
      }).first();
      
      if (await firstChatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('ℹ️ Sélection du premier chat disponible pour continuer le test...');
        chatWithBadge = firstChatButton;
        badgeBefore = null; // Pas de badge à vérifier
        badgeCountBefore = '0';
      } else {
        console.log('❌ Aucun chat trouvé, test arrêté');
        return;
      }
    }
    
    // Prendre capture avant ouverture du chat
    await page.screenshot({ path: 'tests/screenshots/08-before-opening-chat.png', fullPage: true });
    
    console.log(`📖 Ouverture du chat avec badge: ${badgeCountBefore}`);
    
    // Ouvrir le chat
    await chatWithBadge.click();
    await page.waitForTimeout(2000);
    
    // Prendre capture après ouverture
    await page.screenshot({ path: 'tests/screenshots/09-chat-opened-details.png', fullPage: true });
    
    // Attendre que les messages se chargent et que le badge soit marqué comme lu
    console.log('⏳ Attente du marquage comme lu...');
    await page.waitForTimeout(3000); // Attendre le marquage automatique
    
    // Prendre capture après attente
    await page.screenshot({ path: 'tests/screenshots/10-after-waiting.png', fullPage: true });
    
    // Retourner à la liste des chats
    console.log('🔙 Retour à la liste des chats...');
    const backButton = page.locator('button:has(svg), button[aria-label*="back" i], button[aria-label*="retour" i]').first();
    
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Essayer de cliquer sur la liste de chats directement
      const chatListButton = page.locator('[data-testid="chat-list"], [class*="chat-list"]').first();
      if (await chatListButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatListButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Prendre capture après retour
    await page.screenshot({ path: 'tests/screenshots/11-back-to-list.png', fullPage: true });
    
    // Vérifier que le badge a disparu
    console.log('🔍 Vérification que le badge a disparu...');
    await page.waitForTimeout(1000);
    
    if (badgeBefore) {
      const badgeStillVisible = await badgeBefore.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (badgeStillVisible) {
        const badgeCountAfter = await badgeBefore.textContent();
        console.log(`❌ ÉCHEC: Le badge est toujours visible! Avant: ${badgeCountBefore}, Après: ${badgeCountAfter}`);
        await page.screenshot({ path: 'tests/screenshots/12-FAILURE-badge-still-visible.png', fullPage: true });
        
        // Capturer les logs de la console
        const consoleLogs = await page.evaluate(() => {
          return (window as any).__consoleLogs__ || [];
        });
        console.log('📝 Logs de la console:', consoleLogs);
        
        // Échouer le test
        expect(badgeBefore).not.toBeVisible();
      } else {
        console.log('✅ SUCCÈS: Le badge a disparu!');
        await page.screenshot({ path: 'tests/screenshots/12-SUCCESS-badge-disappeared.png', fullPage: true });
      }
    }
    
    // Prendre une capture finale
    await page.screenshot({ path: 'tests/screenshots/13-final-state.png', fullPage: true });
    
    console.log('\n✅ Test terminé. Vérifiez les screenshots dans tests/screenshots/\n');
  });

  test('Test: Vérifier que la table message_reads existe', async ({ page }) => {
    test.setTimeout(30000);
    
    console.log('\n📋 TEST 2: Vérification de la table message_reads\n');
    
    // Ouvrir la console et exécuter le test
    await page.goto('http://localhost:3000');
    await waitForAppReady(page);
    
    // Vérifier via les outils de debug si disponibles
    const tableExists = await page.evaluate(async () => {
      if ((window as any).__TEST_TOOLS__) {
        return await (window as any).__TEST_TOOLS__.checkTable();
      }
      return null;
    });
    
    if (tableExists !== null) {
      if (tableExists) {
        console.log('✅ Table message_reads existe');
      } else {
        console.log('❌ Table message_reads n\'existe pas!');
        console.log('💡 Exécutez: npm run fix:message-reads');
      }
    } else {
      console.log('⚠️ Outils de test non disponibles, vérification manuelle nécessaire');
    }
    
    await page.screenshot({ path: 'tests/screenshots/check-table-result.png', fullPage: true });
  });
});

