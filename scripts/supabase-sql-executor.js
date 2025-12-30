/**
 * Exécuteur SQL pour Supabase
 * Utilise l'API REST pour exécuter du SQL directement
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
 * Exécute du SQL via l'API REST de Supabase
 * Utilise une fonction RPC personnalisée ou l'endpoint de query
 */
export async function executeSQL(sql) {
  const config = loadConfig();
  
  try {
    // Méthode 1: Utiliser l'endpoint de query de Supabase
    // L'API PostgREST permet d'exécuter certaines requêtes
    
    // Pour les requêtes SELECT simples, on peut utiliser l'API REST
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      // Pas besoin de service_role pour SELECT, mais on l'utilise quand même
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.url, config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      // Extraire la table et les colonnes
      const match = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (match) {
        const columns = match[1].trim() === '*' ? '*' : match[1].split(',').map(c => c.trim());
        const table = match[2];
        
        const { data, error } = await supabase
          .from(table)
          .select(columns === '*' ? '*' : columns.join(','));
        
        if (error) throw error;
        return { data, success: true };
      }
    }
    
    // Pour les autres requêtes (CREATE, ALTER, INSERT, etc.), on doit utiliser
    // la Management API ou créer une fonction RPC
    
    // Méthode 2: Utiliser fetch avec l'API de Supabase
    // Note: Supabase ne permet pas d'exécuter du SQL arbitraire via REST
    // Il faut utiliser la CLI ou créer une fonction RPC
    
    console.log('⚠️  L\'exécution de SQL arbitraire nécessite une configuration spéciale.');
    console.log('📋 SQL à exécuter:\n');
    console.log(sql);
    console.log('\n💡 Options:');
    console.log('1. Utiliser la CLI Supabase (recommandé)');
    console.log('2. Créer une fonction RPC dans PostgreSQL');
    console.log('3. Exécuter manuellement dans le dashboard Supabase\n');
    
    // Pour vraiment automatiser, on peut utiliser la CLI Supabase
    // ou créer un serveur intermédiaire
    
    return {
      success: false,
      requiresManualExecution: true,
      sql,
      instructions: [
        'Option 1: Installer Supabase CLI et utiliser: supabase db push',
        'Option 2: Créer une fonction RPC dans PostgreSQL',
        'Option 3: Exécuter manuellement dans le dashboard'
      ]
    };
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

/**
 * Crée une fonction RPC dans PostgreSQL qui permet d'exécuter du SQL
 * Cette fonction doit être créée UNE FOIS dans Supabase
 */
export function getCreateRPCFunctionSQL() {
  return `
-- Créez cette fonction dans Supabase SQL Editor UNE FOIS
-- Elle permettra d'exécuter du SQL via l'API REST

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  rec record;
  rows json[];
BEGIN
  -- Exécuter la requête
  FOR rec IN EXECUTE query
  LOOP
    rows := rows || to_json(rec);
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'rows', rows,
    'count', array_length(rows, 1)
  );
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
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
  `;
}

/**
 * Crée une table avec les colonnes spécifiées
 */
export async function createTable(tableName, columns, options = {}) {
  const columnsDef = columns.map(col => {
    let def = `  ${col.name} ${col.type}`;
    if (col.primaryKey) def += ' PRIMARY KEY';
    if (col.unique) def += ' UNIQUE';
    if (col.notNull) def += ' NOT NULL';
    if (col.default !== undefined) {
      const defaultValue = typeof col.default === 'string' ? `'${col.default}'` : col.default;
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
      ? `'${options.default}'` 
      : options.default;
    sql += ` DEFAULT ${defaultValue}`;
  }
  
  if (options.notNull) {
    sql += ' NOT NULL';
  }
  
  sql += ';';
  
  return executeSQL(sql);
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/') || '');

if (isMainModule || process.argv[1]?.includes('supabase-sql-executor.js')) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup-rpc':
      console.log('📋 SQL pour créer la fonction RPC:\n');
      console.log(getCreateRPCFunctionSQL());
      console.log('\n💡 Exécutez ce SQL dans le dashboard Supabase UNE FOIS.\n');
      break;
      
    case 'exec':
      const sql = process.argv.slice(3).join(' ');
      if (!sql) {
        console.log('Usage: node scripts/supabase-sql-executor.js exec "SQL"');
        process.exit(1);
      }
      executeSQL(sql).then(result => {
        if (result.success) {
          console.log('✅ SQL exécuté avec succès\n');
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('⚠️  Exécution manuelle requise\n');
        }
      }).catch(err => {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
      });
      break;
      
    default:
      console.log('Commandes disponibles:');
      console.log('  setup-rpc                  - Affiche le SQL pour créer la fonction RPC');
      console.log('  exec "SQL"                 - Exécute du SQL (après setup-rpc)\n');
      console.log('⚠️  Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local\n');
  }
}
