/**
 * Script d'automatisation Supabase
 * Permet d'exécuter des tâches courantes via l'API REST
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Charge la configuration depuis .env.local
 */
function loadConfig() {
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
        vars[key.trim()] = values.join('=').trim();
      }
    }
  });
  
  return {
    url: vars.VITE_SUPABASE_URL,
    anonKey: vars.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: vars.SUPABASE_SERVICE_ROLE_KEY // Optionnel, pour les opérations admin
  };
}

/**
 * Initialise le client Supabase
 */
function initSupabase(useServiceRole = false) {
  const config = loadConfig();
  
  if (useServiceRole && !config.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY n\'est pas définie dans .env.local');
  }
  
  const key = useServiceRole ? config.serviceRoleKey : config.anonKey;
  return createClient(config.url, key);
}

/**
 * Crée un utilisateur de test
 */
export async function createTestUser(email, password, name, role = 'buyer') {
  const supabase = initSupabase();
  
  try {
    // Créer l'utilisateur dans Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Échec de la création de l\'utilisateur');

    // Créer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return { user: authData.user, profile };
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Liste tous les utilisateurs
 */
export async function listUsers() {
  const supabase = initSupabase();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Crée une annonce de test
 */
export async function createTestListing(listingData, sellerId) {
  const supabase = initSupabase();
  
  try {
    const { data, error } = await supabase
      .from('listings')
      .insert({
        ...listingData,
        seller_id: sellerId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Liste toutes les annonces
 */
export async function listListings() {
  const supabase = initSupabase();
  
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Supprime toutes les données de test (ATTENTION: destructif!)
 */
export async function cleanupTestData() {
  const supabase = initSupabase(true); // Utiliser service_role pour les suppressions
  
  try {
    console.log('🧹 Nettoyage des données de test...');
    
    // Supprimer dans l'ordre pour respecter les contraintes FK
    const tables = ['favorites', 'messages', 'chats', 'notifications', 'quotes', 'appointments', 'listings', 'users'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout sauf un ID qui n'existe pas
        
        if (error && !error.message.includes('does not exist')) {
          console.log(`⚠️  ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table} nettoyée`);
        }
      } catch (err) {
        console.log(`⚠️  ${table}: ${err.message}`);
      }
    }
    
    console.log('✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Affiche les statistiques de la base de données
 */
export async function getStats() {
  const supabase = initSupabase();
  
  try {
    const stats = {};
    
    const tables = ['users', 'listings', 'chats', 'messages', 'notifications', 'favorites'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          stats[table] = count;
        }
      } catch (err) {
        stats[table] = 'Erreur';
      }
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('supabase-automation.js')) {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      getStats().then(stats => {
        console.log('\n📊 Statistiques de la base de données:\n');
        Object.entries(stats).forEach(([table, count]) => {
          console.log(`  ${table}: ${count}`);
        });
        console.log();
      });
      break;
      
    case 'list-users':
      listUsers().then(users => {
        console.log(`\n👥 Utilisateurs (${users.length}):\n`);
        users.forEach(u => {
          console.log(`  - ${u.name} (${u.email}) - ${u.role}`);
        });
        console.log();
      });
      break;
      
    case 'list-listings':
      listListings().then(listings => {
        console.log(`\n📋 Annonces (${listings.length}):\n`);
        listings.forEach(l => {
          console.log(`  - ${l.title} - ${l.price} FCFA`);
        });
        console.log();
      });
      break;
      
    default:
      console.log('Commandes disponibles:');
      console.log('  stats          - Affiche les statistiques');
      console.log('  list-users     - Liste tous les utilisateurs');
      console.log('  list-listings  - Liste toutes les annonces\n');
  }
}
