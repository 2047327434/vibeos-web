<div align="center">

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Français · [Deutsch](README.de.md) · [Español](README.es.md) · [Русский](README.ru.md)

</div>

---

<h1 id="fr">VibeOS</h1>

> Un OS de bureau web style macOS propulsé par l'IA — où l'IA génère des applications en temps réel.

## Qu'est-ce que VibeOS ?

VibeOS est un système d'exploitation de bureau qui s'exécute dans votre navigateur, avec une interface de style macOS Aqua. Contrairement aux OS traditionnels, ses applications ne sont **pas pré-écrites** — un modèle de langage (LLM) **génère du code HTML/CSS/JS en temps réel** à partir de prompts système, s'exécutant en toute sécurité dans des sandbox iframe. Ayez juste une idée, et l'IA crée une application complète pour vous.

- **Version** : 0.2.0
- **Build** : Phase 1 — macOS Aqua Style

## Fonctionnalités principales

- **Génération d'apps par IA** — Générez dynamiquement des apps via LLM avec streaming SSE
- **UI style macOS** — Barre de menu en verre dépoli, effet de grossissement du Dock, boutons de fenêtre tricolores, recherche Spotlight
- **Gestion complète des fenêtres** — Glisser, redimensionner, minimiser, maximiser, ancrage, Cmd+Tab
- **Système de fichiers virtuel** — Basé sur localStorage + IndexedDB, 7 répertoires par défaut, CRUD complet
- **Sandbox de sécurité à trois niveaux** — Isolation iframe + liste blanche postMessage (30 API) + VibeOSAPI
- **Frontend pur** — Zéro dépendance framework, zéro étape de build, exécution directe dans le navigateur
- **Icônes vectorielles** — Bibliothèque d'icônes SVG pure, zéro dépendance emoji, zéro ressource image
- **Thèmes clair et sombre** — Système de design tokens piloté par variables CSS, basculement en un clic

## Applications intégrées

| Application | ID | Description |
|------|----|------|
| Files | `files` | Gestionnaire de fichiers à deux volets |
| TextEdit | `notepad` | Éditeur de texte avec coloration syntaxique |
| VibeCode | `vibecode` | IDE de code à trois panneaux |
| Terminal | `terminal` | Émulateur de terminal avec complétion Tab |
| Browser | `browser` | Navigateur intégré avec favoris et historique |
| AI Chat | `aichat` | Chat IA style macOS |
| Music | `music` | Lecteur de musique Web Audio API |
| Calculator | `calculator` | Calculatrice standard avec support clavier |
| SysMon | `sysmon` | Tableau de bord de surveillance système |
| App Store | `app-store` | Marketplace d'applications IA (12+ apps) |
| Settings | `settings` | Paramètres système (fond d'écran/thème/LLM) |
| Snake | `snake` | Jeu Snake classique |
| Tetris | `tetris` | Jeu Tetris classique |
| LLM API | `llm-api` | Panneau de configuration LLM |
| Viewer | `imageview` | Visionneuse d'images (zoom/rotation) |

L'App Store inclut également Clock, Paint, TaskMgr, Weather et plus encore.

## Démarrage rapide

### Prérequis

- Navigateur moderne (Chrome / Edge / Safari / Firefox)
- Clé API LLM (optionnelle, mode Mock disponible sans clé)

### Lancement

```bash
# Option 1 : Ouvrir directement
open index.html

# Option 2 : Serveur local (recommandé, évite les problèmes CORS)
python3 -m http.server 8080
# Puis visitez http://localhost:8080
```

### Configurer le LLM

Après le lancement, cliquez sur **VibeOS > Paramètres LLM** dans la barre de menu, ou ouvrez l'application **LLM API** depuis le Dock :

- Provider : `openai` (toute API compatible OpenAI)
- API Endpoint : Votre URL API
- API Key : Votre clé secrète
- Model : Nom du modèle

La configuration est automatiquement sauvegardée dans localStorage.

## Architecture

```
┌─────────────────────────────────────┐
│            Navigateur                │
│  ┌───────────────────────────────┐  │
│  │         Hôte VibeOS           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │Bureau│ │Menu  │ │Dock  │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │  Gestionnaire de fenêtres│ │  │
│  │  │  ┌──────────────────┐   │ │  │
│  │  │  │ Sandbox iframe    │   │ │  │
│  │  │  │ ┌──────────────┐ │   │ │  │
│  │  │  │ │ App générée   │ │   │ │  │
│  │  │  │ │    par IA     │ │   │ │  │
│  │  │  │ └──────────────┘ │   │ │  │
│  │  │  └──────────────────┘   │ │  │
│  │  └──────────────────────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐  │  │
│  │  │   VFS    │ │AppGenerator│  │  │
│  │  └──────────┘ └────────────┘  │  │
│  └───────────────────────────────┘  │
│              ↕ postMessage          │
│         ┌─────────────┐            │
│         │   LLM API   │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### Modèle de sécurité

```
Action utilisateur → App iframe → postMessage → Vérification liste blanche → VibeOSAPI → Exécution système
                         ↑                                                           │
                         └────────────────── Retour résultat ────────────────────────┘
```

Seuls 30 appels API prédéfinis sont autorisés, couvrant le système de fichiers, le presse-papiers, les notifications, le contrôle des fenêtres, le stockage, le proxy réseau et les appels LLM.

## Raccourcis clavier

| Raccourci | Action |
|--------|------|
| `Cmd + Space` | Ouvrir la recherche Spotlight |
| `Cmd + Tab` | Changement d'application |
| `Cmd + W` | Fermer la fenêtre actuelle |
| `Cmd + M` | Minimiser la fenêtre actuelle |
| `Cmd + Shift + D` | Panneau de diagnostic |
| `Escape` | Fermer Spotlight |

## Confidentialité

**VibeOS est une application web frontend pure. Toutes les données sont stockées localement dans votre navigateur.**

- **Clé API LLM** : Votre clé API, endpoint et modèle sont stockés uniquement dans le `localStorage` du navigateur.
- **Requêtes LLM** : Lors de la génération d'applications, votre navigateur envoie des requêtes **directement** à votre endpoint API LLM configuré.
- **Données locales** : Le système de fichiers virtuel, les enregistrements d'installation et les caches sont stockés dans `localStorage` / `IndexedDB`.
- **Aucune télémétrie** : VibeOS ne collecte, ne rapporte ni ne transmet aucune donnée de comportement utilisateur.
- **Fonctionnement hors ligne** : Les fonctionnalités principales (gestion de fichiers, paramètres, jeux) fonctionnent entièrement hors ligne.

> ⚠️ **Note** : Les fonctionnalités LLM nécessitent une connexion Internet pour appeler des API tierces. La politique de confidentialité de votre fournisseur LLM s'applique.

---

## License

MIT
