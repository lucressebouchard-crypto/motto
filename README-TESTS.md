# Tests E2E Playwright - Documentation

## 🎯 Objectif

Ces tests permettent de visualiser et diagnostiquer automatiquement les problèmes de l'application, notamment le système de badges de messages.

## 📋 Prérequis

1. **Variables d'environnement de test** (optionnel):
   Créez un fichier `.env.local` avec:
   ```env
   TEST_USER_EMAIL=votre@email.com
   TEST_USER_PASSWORD=votre_mot_de_passe
   ```

2. **Application en cours d'exécution**:
   L'application doit être lancée sur `http://localhost:5173`

## 🚀 Commandes disponibles

### Tests de badges (recommandé)
```bash
# Lancer les tests de badges avec captures d'écran et vidéos
npm run test:badges

# Interface graphique (recommandé pour visualiser)
npm run test:badges:ui

# Mode debug pas à pas
npm run test:badges:debug
```

### Tous les tests
```bash
# Tous les tests E2E
npm run test:e2e

# Interface graphique
npm run test:e2e:ui

# Mode debug
npm run test:e2e:debug
```

### Voir les rapports
```bash
# Ouvrir le rapport HTML des derniers tests
npm run test:report
```

## 📸 Résultats

Après chaque exécution, vous trouverez:

1. **Screenshots**: Dans `tests/screenshots/`
   - Capture à chaque étape du test
   - Nommés séquentiellement pour suivre le flux
   - Capture de page complète pour voir tout le contexte

2. **Vidéos**: Dans `test-results/`
   - Vidéo complète de chaque test
   - Permet de voir exactement ce qui s'est passé

3. **Rapport HTML**: Dans `playwright-report/`
   - Vue d'ensemble de tous les tests
   - Timeline détaillée
   - Logs de la console du navigateur
   - Captures d'écran à chaque action

4. **Traces**: Dans `test-results/`
   - Fichiers `.zip` avec trace complète
   - Ouvert avec: `npx playwright show-trace trace.zip`

## 🔍 Ce que les tests vérifient

### Test 1: Badges doivent disparaître après lecture
- ✅ Se connecte à l'application
- ✅ Ouvre la liste des chats
- ✅ Trouve un chat avec un badge non lu
- ✅ Capture l'état avant ouverture
- ✅ Ouvre le chat
- ✅ Attend que les messages soient marqués comme lus
- ✅ Retourne à la liste
- ✅ Vérifie que le badge a disparu
- ✅ Capture l'état final

### Test 2: Vérification de la table message_reads
- ✅ Vérifie si la table `message_reads` existe dans la base de données
- ✅ Affiche un message d'erreur si elle n'existe pas

## 🐛 Débogage

Si un test échoue:

1. **Consulter les screenshots**: Regardez les captures dans `tests/screenshots/` pour voir l'état à chaque étape

2. **Voir la vidéo**: Ouvrez la vidéo dans `test-results/` pour voir exactement ce qui s'est passé

3. **Vérifier les logs**: Le rapport HTML contient tous les logs de la console du navigateur

4. **Mode debug**: Utilisez `npm run test:badges:debug` pour exécuter le test pas à pas et pouvoir inspecter l'état à chaque moment

## 💡 Conseils

- **Utilisez l'interface UI** (`--ui`) pour la meilleure expérience: vous verrez les tests s'exécuter en direct
- **Mode debug** pour tester manuellement: le navigateur reste ouvert et vous pouvez interagir
- **Vérifiez les screenshots séquentiellement**: ils sont numérotés pour suivre le flux du test

## 📝 Notes

- Les tests attendent automatiquement que l'application soit prête
- Les captures incluent toute la page pour voir le contexte complet
- Les vidéos sont enregistrées même si le test réussit pour faciliter le débogage
- Tous les logs de la console sont capturés, notamment ceux de `[chatService]` et `[ChatList]`

