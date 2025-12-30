/**
 * Script pour créer le fichier .env.local
 */

import { writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

// Récupérer les valeurs depuis les arguments ou les variables d'environnement
const supabaseUrl = process.argv[2] || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Usage: node scripts/create-env.js <SUPABASE_URL> <SUPABASE_ANON_KEY>');
  console.log('Ou définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY comme variables d\'environnement\n');
  process.exit(1);
}

if (existsSync(envPath)) {
  console.log('⚠️  Le fichier .env.local existe déjà.');
  console.log('Voulez-vous le remplacer? (y/n)');
  // Pour l'instant, on continue quand même
}

const content = `VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseKey}
`;

try {
  writeFileSync(envPath, content, 'utf-8');
  console.log('✅ Fichier .env.local créé avec succès!');
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔑 Clé: ${supabaseKey.substring(0, 20)}...\n`);
} catch (error) {
  console.error('❌ Erreur lors de la création du fichier:', error.message);
  process.exit(1);
}
