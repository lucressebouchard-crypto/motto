-- Fonction pour exécuter du SQL dynamiquement
-- À exécuter UNE FOIS dans Supabase Dashboard > SQL Editor
-- 
-- Cette fonction permet d'exécuter du SQL directement via l'API REST de Supabase
-- Elle est nécessaire pour que les scripts d'automatisation puissent modifier la base de données

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

