# 🌐 Ouvrir plusieurs navigateurs pour tester avec plusieurs comptes

## Problème
Le Simple Browser de Cursor réutilise toujours la même fenêtre et ne permet pas d'avoir plusieurs instances ouvertes simultanément.

## Solution : Utiliser Playwright (Recommandé)

### Commande rapide :
```bash
npm run browser:multi
```

Cette commande ouvre **2 navigateurs Chromium** avec des sessions complètement isolées :
- ✅ localStorage séparé
- ✅ Cookies séparés  
- ✅ Sessions isolées
- ✅ Parfait pour tester avec plusieurs comptes

### Avantages :
- Chaque navigateur est indépendant
- Vous pouvez vous connecter avec différents comptes dans chaque navigateur
- Les sessions ne se mélangent pas
- Parfait pour tester les interactions entre utilisateurs

## Alternative : Navigateur externe

Si vous préférez utiliser un navigateur externe :

1. **Chrome/Firefox en navigation privée :**
   - Ouvrez un navigateur en mode navigation privée
   - Allez sur `http://localhost:3000`
   - Connectez-vous avec un autre compte

2. **Profils de navigateur différents :**
   - Créez un profil utilisateur différent dans Chrome
   - Ouvrez Chrome avec ce profil
   - Allez sur `http://localhost:3000`

## Note importante

Assurez-vous que votre application est lancée avec `npm run dev` avant d'exécuter `npm run browser:multi`.

