# BIOLAB // Terminal de Recherche Microbiologique (CRT-88)

> **Jeu de gestion, collection et progression dans un laboratoire fictif rétro des années 1980–1990.**
> Développé en TypeScript strict, Canvas 2D procédural, Web Audio API, HTML5 & CSS pur.

---

## 🔬 Identité & Contexte

Dans **BIOLAB**, vous dirigez un laboratoire de recherche biologique clandestin puis universitaire et industriel. Depuis votre terminal CRT-88 à phosphore vert, vous ensemencez des milieux de culture, isolez des souches bactériennes réparties en 4 phylogénies, gérez le cycle de vie cellulaire, manipulez le génome par mutagenèse ou conjugaison, et remplissez des contrats de recherche pour financer votre complexe.

- **Genre :** Gestion, collection, optimisation et progression incrémentale.
- **Plateforme :** PC (Navigateurs modernes : Chrome, Firefox, Edge, Safari).
- **Esthétique :** Pixel art 2D rétro-informatique, balayage CRT et interface d'instruments.
- **Audio :** Synthétiseur Web Audio API procédural (bruitages d'époque sans dépendances audio externes).
- **Persistance :** Sauvegarde locale IndexedDB automatique et export/import JSON vérifié par checksum FNV-1a.
- **Langue :** Français intégral.

---

## 🚀 Lancement Rapide du Jeu

### Prérequis
- [Node.js](https://nodejs.org/) (version 20 ou supérieure recommandée, compatible Node 24).
- `npm` (inclus avec Node.js).

### Installation & Démarrage
```bash
# 1. Cloner ou ouvrir le répertoire du projet
cd biolab-game

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement Vite
npm run dev
```

Ouvrez l'URL locale indiquée dans votre terminal (par défaut `http://localhost:5173`) dans votre navigateur : l'interface CRT démarre instantanément avec **150 Bio**, **4 boîtes de Pétri** et **1 boîte de Gélose Nutritive Ordinaire offerte** en stock.

### Commandes Utiles
- `npm run dev` : Démarre le serveur local de jeu en temps réel.
- `npm run build` : Vérification des types TypeScript et compilation statique optimisée pour production dans `dist/`.
- `npm run preview` : Prévisualise le build de production localement.
- `npm test:node` ou `node --test tests/unit/*.test.ts` : Exécute l'intégralité de la suite de 48 tests unitaires et de parcours en moins de 1,5 seconde.

---

## 🧪 Guide de Jeu & Fonctionnalités Clés

### 1. La Paillasse Principale (Module 1)
- **Ensemencement :** Choisissez l'un des 7 milieux de culture et cliquez sur `[ENSEMENCER]`. La première boîte utilise la gélose offerte dans votre inventaire.
- **Croissance Proportionnelle :** La culture produit du Bio/s dès le début de sa pousse proportionnellement à son avancement.
- **Injection Manuelle :** Cliquez sur `[INJECTER NUTRIMENTS]` (5 Bio, cooldown 10s) pour accélérer immédiatement la maturité de +5 % (+10 % avec *Rhodospirillum rubrum*).
- **Gestion des Déchets :** À la fin de sa vie adulte, une colonie nécrose en bio-déchet. Vous avez 60 secondes pour l'évacuer via **Autoclave Flash** (immédiat payant) ou le **Bioréacteur** (recyclage en 90s restituant 10 % du milieu) avant qu'il n'émette une toxine pénalisant les boîtes voisines (-25 %).
- **Protocoles Génétiques :**
  - **Scissiparité :** Fission mitotique d'une colonie mature vers une boîte vide au coût calibré de la souche.
  - **Mutagenèse UV :** Rupture de chaîne ADN forçant une mutation vers un rang égal ou supérieur.
  - **Conjugaison Thermochimique :** Hybridation de 2 colonies (ou 3 avec la Tech M3) pour créer des souches supérieures ou synthétiser des Organismes Mythiques.
- **Contrats Procéduraux :** 3 contrats renouvelés dynamiquement offrant des récompenses en Bio, PR et milieux scellés.
- **Arbre Technologique PR :** 12 technologies réparties en 4 branches spécialisées (Télomères, Cryo, Synthèse, Mutagenèse).

### 2. La Chambre Cryogénique (Module 2)
- Plongez vos colonies adultes dans l'azote liquide à $-196^\circ\text{C}$ pour suspendre indéfiniment leur vieillissement.
- Permet de valider la contrainte `[Stabilisation Cryo]` (2 minutes de stockage) et de produire des PR/Bio passifs avec les technologies cryogéniques adaptées.

### 3. L'Armoire des Distinctions (Module 3)
- 16 trophées historiques sculptés en pixel art, répartis sur 4 étagères thématiques et la cloche magnétique supérieure.
- Chaque trophée débloqué confère un bonus permanent cumulable (rendement, durée de vie, réductions de charges, etc.).

### 4. Le Journal de Bord Manuscrit (Module 4)
- **Annales Automatiques :** Chronique d'époque datée rédigée automatiquement à chaque découverte scientifique.
- **Manuel d'Hybridation (Codex Découvert) :** Journalise chaque croisement et ses descendants observés.
- **Bloc-Notes Libre du Chercheur :** Espace personnel persistant pour consigner vos notes et hypothèses.

---

## 🛡️ Sécurité & Architecture Technique

- **TypeScript Strict :** Typage intégral des structures de données, états et événements.
- **Sécurité des Sauvegardes :** Validation récursive des schémas, rejet systématique de `NaN`/`Infinity`/nombres négatifs, détection de pollution de prototype (`__proto__`), assainissement anti-HTML des entrées du journal et vérification d'intégrité par checksum FNV-1a.
- **Zéro Évaluation Dynamique :** Aucun `eval()` ni `new Function()`.
- **Régulation Économique :** Étouffement de niche ($1/\sqrt{N}$) limitant la monoculture et barrière de sous-tension protégeant les installations.

---

## 📜 Historique des Versions

Consultez [CHANGELOG.md](file:///home/antigravity/Rominouz/biolab-game/CHANGELOG.md) pour le détail complet des 7 phases de développement ayant mené à la version **v1.0.0**.