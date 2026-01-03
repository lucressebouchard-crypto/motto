/**
 * Script pour ouvrir plusieurs Simple Browser dans Cursor
 * Note: Cursor réutilise la même fenêtre Simple Browser, donc on utilise des URLs différentes
 * avec des paramètres de session pour simuler plusieurs instances
 */

// Cette approche ne fonctionne pas vraiment car Cursor réutilise la même fenêtre
// Solution alternative : utiliser Playwright pour ouvrir des navigateurs avec des contextes isolés

console.log(`
⚠️ Le Simple Browser de Cursor ne supporte pas plusieurs instances.
💡 Solution recommandée :

1. Utilisez: npm run browser:multi
   → Ouvre 2 navigateurs Chromium avec des sessions isolées

2. OU utilisez un navigateur externe en navigation privée:
   → Ouvrez Chrome/Firefox en mode navigation privée
   → Allez sur http://localhost:3000
   → Connectez-vous avec un autre compte

3. OU utilisez des profils de navigateur différents pour séparer les sessions
`);

