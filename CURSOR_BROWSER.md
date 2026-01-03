# 🌐 Ouvrir un navigateur de test dans Cursor

Pour ouvrir un **second navigateur Simple Browser dans Cursor** pour tester avec plusieurs comptes simultanément :

## Méthode la plus rapide

1. **Appuyez sur `Ctrl+Shift+P`** (ou `Cmd+Shift+P` sur Mac)
2. **Tapez** : `Simple Browser: Show`
3. **Entrez** : `http://localhost:3000`
4. **Appuyez sur Entrée**

Le Simple Browser s'ouvrira dans Cursor ! Vous pouvez répéter ces étapes pour ouvrir plusieurs instances.

## Raccourci clavier (Après configuration)

Après avoir ouvert ce projet dans Cursor, vous pouvez utiliser :
- **`Ctrl+Alt+B`** pour ouvrir directement `http://localhost:3000` dans le Simple Browser

## Astuce pour plusieurs comptes

1. Ouvrez le premier Simple Browser avec `Ctrl+Shift+P` → `Simple Browser: Show` → `http://localhost:3000`
2. Connectez-vous avec votre premier compte
3. Ouvrez un **second** Simple Browser en répétant l'étape 1
4. Connectez-vous avec votre second compte dans cette nouvelle fenêtre

Vous pouvez avoir autant de Simple Browser ouverts que vous voulez pour tester différents comptes !

## Note

Assurez-vous que votre application est lancée avec `npm run dev` sur le port 3000 avant d'ouvrir le navigateur.

