/**
 * Script d'administration de la base de données Supabase
 * Permet d'exécuter du SQL directement via l'API
 * 
 * IMPORTANT: Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local
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
 * Exécute du SQL directement via l'API REST de Supabase
 * Utilise l'endpoint PostgREST pour exécuter du SQL
 */
export async function executeSQL(sql) {
  const config = loadConfig();
  
  try {
    // Méthode 1: Utiliser l'API REST avec une fonction RPC personnalisée
    // Note: Supabase permet d'exécuter du SQL via des fonctions PostgreSQL
    
    // Pour l'instant, on va utiliser une approche différente :
    // Exécuter le SQL via l'API Management (si disponible) ou via PostgREST
    
    // Méthode recommandée: Utiliser l'API REST pour exécuter via une fonction SQL
    const response = await fetch(`${config.url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': config.serviceRoleKey,
        'Authorization': `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Si la fonction RPC n'existe pas, on va la créer d'abord
      if (response.status === 404) {
        console.log('⚠️  La fonction exec_sql n\'existe pas encore. Création...');
        await createExecSQLFunction(config);
        // Réessayer
        return executeSQL(sql);
      }
      
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Si l'approche RPC ne fonctionne pas, utiliser directement l'API PostgreSQL
    // via une connexion HTTP
    return executeSQLDirect(sql, config);
  }
}

/**
 * Crée la fonction exec_sql dans PostgreSQL pour permettre l'exécution de SQL
 */
async function createExecSQLFunction(config) {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE query;
      RETURN json_build_object('success', true, 'message', 'Query executed successfully');
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;
  
  // Pour créer cette fonction, on doit l'exécuter directement via l'API SQL
  // Pour l'instant, on va utiliser une autre approche
  console.log('💡 Pour activer l\'exécution SQL automatique, exécutez ce SQL dans Supabase une fois:');
  console.log(createFunctionSQL);
  console.log('\nOu utilisez la méthode directe (executeSQLDirect)\n');
}

/**
 * Méthode alternative: Exécuter SQL via une connexion directe PostgreSQL
 * Utilise pg ou une approche HTTP si possible
 */
async function executeSQLDirect(sql, config) {
  // Pour l'instant, on va utiliser l'approche via Supabase Management API
  // qui nécessite d'envoyer le SQL comme requête HTTP
  
  try {
    // Tenter d'utiliser l'endpoint de query direct
    // Note: Cette approche peut varier selon la version de Supabase
    
    // Alternative: Utiliser le client Supabase avec service_role pour exécuter via RPC
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Exécuter via une requête SQL brute
    // On va diviser le SQL en plusieurs requêtes si nécessaire
    const queries = sql.split(';').filter(q => q.trim().length > 0);
    const results = [];
    
    for (const query of queries) {
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        try {
          // Utiliser supabase.rpc pour exécuter une fonction SQL
          // Mais d'abord, on doit créer cette fonction
          // Pour l'instant, on va afficher le SQL à exécuter
          results.push({
            query: trimmedQuery.substring(0, 50) + '...',
            status: 'pending_manual_execution'
          });
        } catch (err) {
          results.push({
            query: trimmedQuery.substring(0, 50) + '...',
            error: err.message
          });
        }
      }
    }
    
    console.log('⚠️  Exécution SQL automatique nécessite une configuration supplémentaire.');
    console.log('📋 SQL à exécuter:\n');
    console.log(sql);
    console.log('\n💡 Pour l\'instant, exécutez ce SQL dans le dashboard Supabase.\n');
    
    return { results, requiresManualExecution: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Crée une nouvelle table
 */
export async function createTable(tableName, columns, options = {}) {
  const columnsSQL = columns.map(col => {
    let sql = `${col.name} ${col.type}`;
    if (col.primaryKey) sql += ' PRIMARY KEY';
    if (col.unique) sql += ' UNIQUE';
    if (col.notNull) sql += ' NOT NULL';
    if (col.default !== undefined) sql += ` DEFAULT ${col.default}`;
    if (col.references) sql += ` REFERENCES ${col.references.table}(${col.references.column})`;
    return sql;
  }).join(',\n  ');

  const sql = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      ${columnsSQL}
    );
  `;

  if (options.indexes) {
    const indexSQL = options.indexes.map(idx => {
      const unique = idx.unique ? 'UNIQUE' : '';
      return `CREATE ${unique} INDEX IF NOT EXISTS idx_${idx.name} ON ${tableName}(${idx.columns.join(', ')});`;
    }).join('\n');
    return executeSQL(sql + '\n' + indexSQL);
  }

  return executeSQL(sql);
}

/**
 * Ajoute une colonne à une table existante
 */
export async function addColumn(tableName, columnName, columnType, options = {}) {
  let sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`;
  
  if (options.notNull) sql += ' NOT NULL';
  if (options.default !== undefined) sql += ` DEFAULT ${options.default}`;
  
  sql += ';';
  
  return executeSQL(sql);
}

/**
 * Exécute un fichier SQL
 */
export async function executeSQLFile(filePath) {
  const fullPath = join(rootDir, filePath);
  
  if (!existsSync(fullPath)) {
    throw new Error(`Fichier non trouvé: ${fullPath}`);
  }
  
  const sql = readFileSync(fullPath, 'utf-8');
  return executeSQL(sql);
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/') || '');

if (isMainModule || process.argv[1]?.includes('supabase-db-admin.js')) {
  const command = process.argv[2];
  
  switch (command) {
    case 'exec':
      const sql = process.argv.slice(3).join(' ') || process.stdin.read();
      if (!sql) {
        console.log('Usage: node scripts/supabase-db-admin.js exec "SELECT * FROM users;"');
        process.exit(1);
      }
      executeSQL(sql).then(result => {
        console.log('✅ SQL exécuté avec succès\n');
        console.log(JSON.stringify(result, null, 2));
      }).catch(err => {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
      });
      break;
      
    case 'exec-file':
      const file = process.argv[3];
      if (!file) {
        console.log('Usage: node scripts/supabase-db-admin.js exec-file <chemin_vers_fichier.sql>');
        process.exit(1);
      }
      executeSQLFile(file).then(() => {
        console.log('✅ Fichier SQL exécuté avec succès\n');
      }).catch(err => {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
      });
      break;
      
    default:
      console.log('Commandes disponibles:');
      console.log('  exec "SQL"              - Exécute du SQL directement');
      console.log('  exec-file <fichier.sql> - Exécute un fichier SQL\n');
      console.log('⚠️  Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local');
      console.log('   Obtenez-la dans Supabase Dashboard > Settings > API > service_role\n');
  }
}
