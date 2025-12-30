/**
 * Gestionnaire de base de données Supabase
 * Permet de créer/modifier des tables directement via l'API
 */

import { createClient } from '@supabase/supabase-js';
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
  
  const url = vars.VITE_SUPABASE_URL;
  const serviceRoleKey = vars.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local');
  }
  
  return { url, serviceRoleKey };
}

/**
 * Initialise le client Supabase avec service_role
 */
function getSupabaseAdmin() {
  const config = loadConfig();
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Exécute du SQL via une fonction RPC
 * La fonction exec_sql doit être créée dans PostgreSQL
 */
export async function executeSQL(sql) {
  const supabase = getSupabaseAdmin();
  
  try {
    // Utiliser la fonction RPC exec_sql
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      // Si la fonction n'existe pas encore
      if (error.message.includes('function exec_sql') || error.code === '42883') {
        throw new Error('FONCTION_RPC_MANQUANTE');
      }
      throw error;
    }
    
    return { success: true, data };
  } catch (error) {
    if (error.message === 'FONCTION_RPC_MANQUANTE') {
      console.log('⚠️  La fonction RPC exec_sql n\'existe pas encore.');
      console.log('💡 Exécutez d\'abord: npm run supabase:setup-rpc');
      console.log('   Puis exécutez ce SQL dans Supabase Dashboard > SQL Editor\n');
      
      const setupSQL = getCreateRPCFunctionSQL();
      console.log('SQL à exécuter:\n');
      console.log(setupSQL);
      console.log();
      
      return {
        success: false,
        requiresSetup: true,
        setupSQL,
        originalSQL: sql
      };
    }
    
    throw error;
  }
}

/**
 * Retourne le SQL pour créer la fonction RPC exec_sql
 */
export function getCreateRPCFunctionSQL() {
  return `
-- Fonction pour exécuter du SQL dynamiquement
-- À exécuter UNE FOIS dans Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  rec record;
  rows json[] := '{}';
BEGIN
  -- Vérifier si c'est une requête SELECT
  IF upper(trim(query)) LIKE 'SELECT%' THEN
    -- Pour SELECT, retourner les résultats
    FOR rec IN EXECUTE query
    LOOP
      rows := rows || to_json(rec);
    END LOOP;
    
    RETURN json_build_object(
      'success', true,
      'rows', rows,
      'count', array_length(rows, 1)
    );
  ELSE
    -- Pour les autres requêtes (CREATE, ALTER, INSERT, etc.)
    EXECUTE query;
    RETURN json_build_object(
      'success', true,
      'message', 'Query executed successfully',
      'affected_rows', FOUND
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
  `;
}

/**
 * Crée une nouvelle table
 */
export async function createTable(tableName, columns, options = {}) {
  const columnsDef = columns.map(col => {
    let def = `  ${col.name} ${col.type}`;
    if (col.primaryKey) def += ' PRIMARY KEY';
    if (col.unique) def += ' UNIQUE';
    if (col.notNull) def += ' NOT NULL';
    if (col.default !== undefined) {
      const defaultValue = typeof col.default === 'string' 
        ? `'${col.default.replace(/'/g, "''")}'` 
        : col.default;
      def += ` DEFAULT ${defaultValue}`;
    }
    if (col.references) {
      def += ` REFERENCES ${col.references.table}(${col.references.column})`;
      if (col.references.onDelete) def += ` ON DELETE ${col.references.onDelete}`;
    }
    return def;
  }).join(',\n');

  let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnsDef}\n);`;

  if (options.indexes) {
    const indexes = options.indexes.map(idx => {
      const unique = idx.unique ? 'UNIQUE' : '';
      const columns = Array.isArray(idx.columns) ? idx.columns.join(', ') : idx.columns;
      return `CREATE ${unique} INDEX IF NOT EXISTS idx_${tableName}_${idx.name} ON ${tableName}(${columns});`;
    }).join('\n');
    sql += '\n' + indexes;
  }

  if (options.enableRLS) {
    sql += `\nALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`;
  }

  return executeSQL(sql);
}

/**
 * Ajoute une colonne à une table existante
 */
export async function addColumn(tableName, columnName, columnType, options = {}) {
  let sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`;
  
  if (options.notNull && options.default === undefined) {
    throw new Error('Une colonne NOT NULL doit avoir une valeur par défaut');
  }
  
  if (options.default !== undefined) {
    const defaultValue = typeof options.default === 'string' 
      ? `'${options.default.replace(/'/g, "''")}'` 
      : options.default;
    sql += ` DEFAULT ${defaultValue}`;
  }
  
  if (options.notNull) {
    sql += ' NOT NULL';
  }
  
  sql += ';';
  
  return executeSQL(sql);
}

/**
 * Crée une politique RLS
 */
export async function createPolicy(tableName, policyName, policySQL) {
  const sql = `CREATE POLICY "${policyName}" ON ${tableName} ${policySQL};`;
  return executeSQL(sql);
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/') || '');

if (isMainModule || process.argv[1]?.includes('db-manager.js')) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      console.log('📋 SQL pour créer la fonction RPC exec_sql:\n');
      console.log(getCreateRPCFunctionSQL());
      console.log('\n💡 Copiez ce SQL et exécutez-le dans Supabase Dashboard > SQL Editor UNE FOIS.\n');
      break;
      
    case 'exec':
      const sql = process.argv.slice(3).join(' ');
      if (!sql) {
        console.log('Usage: node scripts/db-manager.js exec "SQL"');
        process.exit(1);
      }
      executeSQL(sql).then(result => {
        if (result.success) {
          console.log('✅ SQL exécuté avec succès\n');
          if (result.data) {
            console.log(JSON.stringify(result.data, null, 2));
          }
        } else if (result.requiresSetup) {
          console.log('⚠️  Configuration requise (voir ci-dessus)\n');
        }
      }).catch(err => {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
      });
      break;
      
    default:
      console.log('Commandes disponibles:');
      console.log('  setup              - Affiche le SQL pour créer la fonction RPC');
      console.log('  exec "SQL"         - Exécute du SQL (après setup)\n');
      console.log('⚠️  Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local\n');
  }
}
