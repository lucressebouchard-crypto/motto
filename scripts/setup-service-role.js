/**
 * Script pour configurer la clé service_role de Supabase
 * Cette clé est nécessaire pour exécuter du SQL directement
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const envPath = join(rootDir, '.env.local');

function addServiceRoleKey() {
  console.log('🔐 Configuration de la clé service_role Supabase\n');
  console.log('Pour obtenir votre clé service_role:');
  console.log('1. Allez sur https://supabase.com/dashboard');
  console.log('2. Sélectionnez votre projet');
  console.log('3. Allez dans Settings > API');
  console.log('4. Trouvez "service_role" (c\'est une clé SECRÈTE, ne la partagez jamais!)');
  console.log('5. Copiez-la\n');
  
  console.log('⚠️  IMPORTANT: Cette clé donne des accès complets à votre base de données.');
  console.log('   Ne la partagez JAMAIS publiquement ou dans Git!\n');
  
  // Vérifier si elle existe déjà
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log('✅ La clé service_role semble déjà être configurée dans .env.local\n');
      return;
    }
  }
  
  console.log('💡 Une fois que vous avez la clé, ajoutez cette ligne dans .env.local:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_ici\n');
}

addServiceRoleKey();
