/**
 * Script pour créer la table message_reads directement via PostgreSQL
 * Évite les problèmes de cache Supabase
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL n\'est pas défini dans .env.local');
  console.error('💡 Ajoutez: DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createTable() {
  try {
    console.log('🔌 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté à PostgreSQL\n');

    // Lire le fichier SQL
    const sqlFile = join(__dirname, '../supabase/setup-message-reads.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('📋 Exécution du script SQL...\n');

    // Exécuter le SQL complet
    await client.query(sql);

    console.log('✅ Table message_reads créée avec succès !\n');

    // Vérifier que la table existe
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'message_reads'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Vérification: La table existe bien dans la base de données\n');
    } else {
      console.log('⚠️  La table n\'a pas été trouvée après création\n');
    }

    // Vérifier les policies RLS
    const policyResult = await client.query(`
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'message_reads'
    `);

    console.log(`📋 Policies RLS trouvées: ${policyResult.rows.length}`);
    policyResult.rows.forEach(row => {
      console.log(`   - ${row.policyname}`);
    });
    console.log();

    console.log('💡 Note: Si Supabase ne voit toujours pas la table,');
    console.log('   attendez 1-2 minutes ou rafraîchissez le cache dans le Dashboard Supabase\n');

  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  La table existe déjà (c\'est normal)\n');
    } else {
      console.error('❌ Erreur:', error.message);
      console.error('\nStack:', error.stack);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

createTable();

