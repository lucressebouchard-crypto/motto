import { test, expect } from '@playwright/test';

test.describe('Système de badges de messages', () => {
  test.beforeEach(async ({ page }) => {
    // Aller à l'application
    await page.goto('http://localhost:5173');
    
    // Attendre que l'app se charge
    await page.waitForLoadState('networkidle');
  });

  test('Les badges doivent disparaître après avoir lu les messages', async ({ page }) => {
    // 1. Se connecter (si nécessaire)
    // ... code de connexion
    
    // 2. Ouvrir un chat
    const chatButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chatButton.click();
    
    // Attendre que la liste des chats s'affiche
    await page.waitForSelector('[data-testid="chat-list"]', { timeout: 5000 }).catch(() => {});
    
    // 3. Sélectionner un chat avec des messages non lus
    // Chercher un chat avec un badge
    const chatWithBadge = page.locator('[data-testid="chat-item"]').filter({ 
      has: page.locator('.bg-red-500') 
    }).first();
    
    if (await chatWithBadge.count() > 0) {
      // Vérifier qu'il y a un badge
      const badgeBefore = chatWithBadge.locator('.bg-red-500');
      await expect(badgeBefore).toBeVisible();
      
      const badgeCountBefore = await badgeBefore.textContent();
      console.log('Badge avant ouverture:', badgeCountBefore);
      
      // Ouvrir le chat
      await chatWithBadge.click();
      
      // Attendre que les messages se chargent
      await page.waitForTimeout(2000);
      
      // Attendre que le badge disparaisse
      await page.waitForTimeout(1000);
      
      // Retourner à la liste des chats
      const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await backButton.click();
      
      await page.waitForTimeout(500);
      
      // Vérifier que le badge a disparu
      const badgeAfter = chatWithBadge.locator('.bg-red-500');
      await expect(badgeAfter).not.toBeVisible({ timeout: 3000 });
      
      console.log('✅ Badge a disparu après lecture');
    }
  });

  test('Les badges doivent apparaître quand un nouveau message arrive', async ({ page }) => {
    // Test à implémenter
  });
});

