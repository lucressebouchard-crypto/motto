# 🌐 Ouvrir un navigateur de test dans Cursor

Pour ouvrir un second navigateur dans Cursor pour tester avec plusieurs comptes :

## Méthode 1 : Simple Browser (Recommandé)

1. Dans Cursor, appuyez sur `Ctrl+Shift+P` (ou `Cmd+Shift+P` sur Mac)
2. Tapez : `Simple Browser: Show`
3. Entrez l'URL : `http://localhost:3000`
4. Appuyez sur Entrée

Le navigateur s'ouvrira directement dans Cursor !

## Méthode 2 : Palette de commandes

1. `Ctrl+Shift+P` (ou `Cmd+Shift+P`)
2. Tapez : `Simple Browser`
3. Sélectionnez `Simple Browser: Show`
4. Entrez `http://localhost:3000`

## Méthode 3 : Clic sur l'URL

1. Si vous voyez `http://localhost:3000` dans le terminal ou un fichier
2. Maintenez `Ctrl` (ou `Cmd` sur Mac) et cliquez sur l'URL
3. Cursor devrait ouvrir le Simple Browser

## Raccourci personnalisé (Optionnel)

Vous pouvez créer un raccourci clavier dans Cursor :
1. `Ctrl+Shift+P` → `Preferences: Open Keyboard Shortcuts`
2. Recherchez : `Simple Browser`
3. Ajoutez un raccourci (ex: `Ctrl+Alt+B`)

## Note

Assurez-vous que votre application est lancée avec `npm run dev` sur le port 3000 avant d'ouvrir le navigateur.

