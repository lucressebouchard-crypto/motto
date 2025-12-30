/**
 * Script d'administration Vercel
 * Utilise l'API REST de Vercel pour automatiser les tâches
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pour utiliser l'API Vercel, vous devez avoir un token d'accès
// Obtenez-le depuis: https://vercel.com/account/tokens
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

/**
 * Configure les variables d'environnement sur Vercel
 */
export async function setEnvironmentVariables(projectId, variables) {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN n\'est pas défini. Obtenez-le depuis https://vercel.com/account/tokens');
  }

  const url = `https://api.vercel.com/v10/projects/${projectId}/env`;
  
  const results = [];
  
  for (const [key, value] of Object.entries(variables)) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      });
      
      if (response.ok) {
        results.push({ key, success: true });
        console.log(`✅ Variable ${key} configurée`);
      } else {
        const error = await response.json();
        results.push({ key, success: false, error });
        console.log(`❌ Erreur pour ${key}:`, error);
      }
    } catch (error) {
      results.push({ key, success: false, error: error.message });
      console.log(`❌ Erreur pour ${key}:`, error.message);
    }
  }
  
  return results;
}

/**
 * Déploie le projet sur Vercel
 */
export async function deploy() {
  console.log('📦 Pour déployer sur Vercel:');
  console.log('   1. Installez Vercel CLI: npm i -g vercel');
  console.log('   2. Connectez-vous: vercel login');
  console.log('   3. Déployez: vercel --prod');
  console.log('\n   Ou utilisez le dashboard Vercel pour connecter votre repo GitHub');
}

// Si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deploy();
      break;
    default:
      console.log('Usage: node scripts/vercel-admin.js [deploy]');
      console.log('\nPour configurer les variables d\'environnement, utilisez le dashboard Vercel');
  }
}
