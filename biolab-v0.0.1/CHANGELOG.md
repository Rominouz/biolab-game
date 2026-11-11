# CHANGELOG — BIOLAB

Toutes les évolutions notables du projet **BIOLAB** sont consignées dans ce fichier.

---

## [1.0.1] — Correctif de Build TypeScript Strict & Déploiement GitHub Pages

### Corrigé & Ajouté
- **Conformité TypeScript Stricte (`tsc --noEmit`) :**
  - Alignement des propriétés optionnelles (`exactOptionalPropertyTypes`) dans `src/storage/validator.ts` et `src/systems/contracts.system.ts`.
  - Alignement des identifiants d'événements audio et d'options d'ensemencement dans `src/ui/app-controller.ts`.
  - Ajout d'une garde de sécurité sur la souche dans `src/ui/bench-view.component.ts` et correction de `TrophyShelfId` dans `src/ui/trophies-view.component.ts`.
  - Ajout des déclarations de types pour `node:test` et `node:assert/strict` (`tests/unit/node-test.d.ts`).
- **Configuration Vite & Déploiement GitHub Pages :**
  - Ajout de `base: './'` dans `vite.config.ts` pour générer des chemins relatifs compatibles avec les sous-dossiers GitHub Pages (`/biolab-game/`).
  - Création du workflow CI/CD `.github/workflows/deploy.yml` pour compiler et publier automatiquement le bundle de production (`dist/`) sur GitHub Pages.
  - Ajout de `.gitignore` et `package-lock.json` pour stabiliser les builds CI (`npm ci`).

---

## [1.0.0] — Phase 7 : Recette Finale, Parcours de Bout en Bout & Version Publique

### Ajouté & Validé
- **Test de Parcours Complet (`tests/unit/e2e-journey.test.ts`) :**
  - Validation de bout en bout d'un cycle de jeu complet :
    - Démarrage conforme (150 Bio, 0 PR, Palier 1, 4 boîtes, 1 gélose offerte).
    - Ensemencement gratuit sur stock puis payant.
    - Injection manuelle de nutriments pendant la croissance.
    - Transfert réversible boîte <-> cryo-tube (suspension du vieillissement).
    - Multiplication cellulaire (Scissiparité, Mutagenèse UV, Conjugaison avec consommation des parents).
    - Déblocage du Palier 2 d'usine (extension à 6 boîtes et 4 cryo-tubes).
    - Recherche de technologie PR (T1).
    - Résolution de micro-événement de paillasse (B4).
    - Validation de contrat procédural avec versement des récompenses.
    - Tenue automatique et manuscrite du Journal de Bord et du Codex.
    - Persistance locale IndexedDB et validation de sauvegarde JSON signée.
- **Documentation Complète (`README.md`) :**
  - Présentation détaillée de l'univers, guide d'installation, commandes de build et manuel des 4 modules de jeu.
- **Certification de Recette :**
  - 100 % des 48 tests unitaires et de parcours au vert (`node --test`).
  - Zéro avertissement de sécurité ni faille d'injection de données.

---

## [0.6.0] — Phase 6 : Interface Rétro CRT, Rendu Canvas 2D Pixel Art & Audio
- Implémentation du moniteur CRT avec scanlines, des moteurs de rendu Canvas 2D procéduraux (morphologies des 7 raretés et coupe 2D de l'usine), du synthétiseur procédural Web Audio API et des 4 modules d'interface.

---

## [0.5.0] — Phase 5 : Sauvegarde Sécurisée IndexedDB & Validateur de Schéma
- Implémentation du validateur récursif de schéma et de bornes (`SaveEnvelope`, checksum FNV-1a, anti-pollution de prototype) et du service de persistance IndexedDB avec fallback mémoire.

---

## [0.4.0] — Phase 4 : Systèmes Dynamiques & Méta (Contrats, Micro-Événements, Trophées & Journal)
- Implémentation des 16 trophées et leurs bonus permanents, des 15 micro-événements de paillasse (`B1`–`B10` et `M1`–`M5`), des contrats procéduraux et du journal de bord manuscrit.

---

## [0.3.0] — Phase 3 : Systèmes Avancés (Cryogénie, Multiplication, Arbre PR & Usine)
- Implémentation de la Chambre Cryogénique, des 3 protocoles de division cellulaire, de l'Arbre Technologique PR et des 5 paliers d'infrastructure d'usine.

---

## [0.2.0] — Phase 2 : Cœur de Simulation (Paillasse, Croissance, Déchets & Économie)
- Implémentation du moteur de simulation à sub-stepping ($100\text{ ms}$), des incubateurs, de l'injection manuelle de nutriments, des bio-déchets et du modèle économique 1D.

---

## [0.1.0] — Phase 1 : Socle Technique & Données Statiques
- Initialisation de l'architecture TypeScript stricte, de toutes les tables de données statiques et des tests unitaires de catalogue.

---

## [0.0.1] — Phase 0 : Audit Complet des Spécifications
- Audit intégral de `specs.md` et validation des 11 arbitrages d'équilibrage avec l'utilisateur.
