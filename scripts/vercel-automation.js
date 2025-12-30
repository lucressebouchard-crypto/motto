/**
 * Script d'automatisation Vercel
 * Utilise l'API REST de Vercel pour automatiser les déploiements
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Charge la configuration
 */
function loadConfig() {
  const envPath = join(rootDir, '.env.local');
  const vars = {};
  
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length) {
          vars[key.trim()] = values.join('=').trim();
        }
      }
    });
  }
  
  // Vérifier les variables d'environnement système
  return {
    token: process.env.VERCEL_TOKEN || vars.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID || vars.VERCEL_TEAM_ID,
    projectId: process.env.VERCEL_PROJECT_ID || vars.VERCEL_PROJECT_ID,
  };
}

/**
 * Effectue une requête à l'API Vercel
 */
async function vercelRequest(endpoint, options = {}) {
  const config = loadConfig();
  
  if (!config.token) {
    throw new Error('VERCEL_TOKEN n\'est pas défini. Obtenez-le depuis https://vercel.com/account/tokens');
  }
  
  const url = `https://api.vercel.com${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Erreur ${response.status}`);
  }
  
  return response.json();
}

/**
 * Liste les projets Vercel
 */
export async function listProjects() {
  try {
    const config = loadConfig();
    const endpoint = config.teamId 
      ? `/v9/projects?teamId=${config.teamId}`
      : '/v9/projects';
    
    const data = await vercelRequest(endpoint);
    return data.projects || [];
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Crée un nouveau projet Vercel
 */
export async function createProject(name, options = {}) {
  try {
    const config = loadConfig();
    const endpoint = config.teamId
      ? `/v9/projects?teamId=${config.teamId}`
      : '/v9/projects';
    
    const data = await vercelRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        name,
        framework: 'vite',
        ...options,
      }),
    });
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Ajoute une variable d'environnement
 */
export async function setEnvironmentVariable(projectId, key, value, targets = ['production', 'preview', 'development']) {
  try {
    const config = loadConfig();
    const endpoint = config.teamId
      ? `/v10/projects/${projectId}/env?teamId=${config.teamId}`
      : `/v10/projects/${projectId}/env`;
    
    const data = await vercelRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: targets,
      }),
    });
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Liste les variables d'environnement d'un projet
 */
export async function listEnvironmentVariables(projectId) {
  try {
    const config = loadConfig();
    const endpoint = config.teamId
      ? `/v10/projects/${projectId}/env?teamId=${config.teamId}`
      : `/v10/projects/${projectId}/env`;
    
    const data = await vercelRequest(endpoint);
    return data.envs || [];
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Configure les variables d'environnement depuis .env.local
 */
export async function syncEnvVariables(projectId) {
  try {
    const envPath = join(rootDir, '.env.local');
    
    if (!existsSync(envPath)) {
      throw new Error('Fichier .env.local non trouvé');
    }
    
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length) {
          const varKey = key.trim();
          const varValue = values.join('=').trim();
          
          // Ne synchroniser que les variables VITE_ et VERCEL_
          if (varKey.startsWith('VITE_') || varKey.startsWith('VERCEL_')) {
            vars[varKey] = varValue;
          }
        }
      }
    });
    
    console.log(`📦 Synchronisation de ${Object.keys(vars).length} variables...\n`);
    
    for (const [key, value] of Object.entries(vars)) {
      try {
        await setEnvironmentVariable(projectId, key, value);
        console.log(`✅ ${key}`);
      } catch (error) {
        console.log(`❌ ${key}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Synchronisation terminée\n');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Lance un nouveau déploiement
 */
export async function createDeployment(projectId, ref = 'main') {
  try {
    const config = loadConfig();
    const endpoint = config.teamId
      ? `/v13/deployments?teamId=${config.teamId}`
      : '/v13/deployments';
    
    const data = await vercelRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        name: projectId,
        gitSource: {
          type: 'github',
          ref,
        },
      }),
    });
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'list-projects':
      listProjects().then(projects => {
        console.log(`\n📦 Projets Vercel (${projects.length}):\n`);
        projects.forEach(p => {
          console.log(`  - ${p.name} (${p.id})`);
          if (p.latestDeployment?.url) {
            console.log(`    🌐 ${p.latestDeployment.url}`);
          }
        });
        console.log();
      });
      break;
      
    case 'sync-env':
      const projectId = process.argv[3];
      if (!projectId) {
        console.log('Usage: node scripts/vercel-automation.js sync-env <PROJECT_ID>\n');
        process.exit(1);
      }
      syncEnvVariables(projectId);
      break;
      
    default:
      console.log('Commandes disponibles:');
      console.log('  list-projects          - Liste tous les projets');
      console.log('  sync-env <PROJECT_ID>  - Synchronise les variables d\'environnement\n');
      console.log('⚠️  Pour utiliser ces commandes, définissez VERCEL_TOKEN dans .env.local');
      console.log('   Obtenez votre token sur: https://vercel.com/account/tokens\n');
  }
}
