import type { TechDefinition, TechId } from '../types/game.types.ts';

/**
 * Section 9 de specs.md — Arbre Technologique des Points de Recherche (PR)
 */
export const TECH_TREE: readonly TechDefinition[] = Object.freeze([
  // Branche I : Cellulaire & Sénescence
  Object.freeze({
    id: 'T1',
    branch: 'TECH_BRANCH_I_CELLULAR',
    branchNameFr: 'Cellulaire & Sénescence',
    tier: 1,
    nameFr: 'Télomères Renforcés',
    costPr: 250,
    effectDescriptionFr: '+15 % de durée de vie sur toutes les cultures',
    modifierValue: 0.15,
  }),
  Object.freeze({
    id: 'T2',
    branch: 'TECH_BRANCH_I_CELLULAR',
    branchNameFr: 'Cellulaire & Sénescence',
    tier: 2,
    nameFr: "Stabilisateur d'Histones",
    costPr: 1_200,
    effectDescriptionFr: 'Risque de lyse en mitose abaissé à 4 % (au lieu de 8 %)',
    modifierValue: 0.04,
  }),
  Object.freeze({
    id: 'T3',
    branch: 'TECH_BRANCH_I_CELLULAR',
    branchNameFr: 'Cellulaire & Sénescence',
    tier: 3,
    nameFr: 'Longévité Éternelle',
    costPr: 15_000,
    effectDescriptionFr: 'Double la durée de vie adulte des Légendaires et Mythiques',
    modifierValue: 2.0,
  }),

  // Branche II : Gestion Thermique & Cryogénie
  Object.freeze({
    id: 'C1',
    branch: 'TECH_BRANCH_II_CRYO',
    branchNameFr: 'Gestion Thermique & Cryogénie',
    tier: 1,
    nameFr: 'Isolation Azote Liquide',
    costPr: 400,
    effectDescriptionFr: "-25 % sur le coût d'entretien cryo en Bio/s",
    modifierValue: 0.25,
  }),
  Object.freeze({
    id: 'C2',
    branch: 'TECH_BRANCH_II_CRYO',
    branchNameFr: 'Gestion Thermique & Cryogénie',
    tier: 2,
    nameFr: 'Condensateur Cryogénique',
    costPr: 3_500,
    effectDescriptionFr: "-50 % sur le coût d'entretien cryo en Bio/s",
    modifierValue: 0.5,
  }),
  Object.freeze({
    id: 'C3',
    branch: 'TECH_BRANCH_II_CRYO',
    branchNameFr: 'Gestion Thermique & Cryogénie',
    tier: 3,
    nameFr: 'Métabolisme Basal Gelé',
    costPr: 30_000,
    effectDescriptionFr: 'Les souches cryogénisées produisent 5 % de leur Bio/s',
    modifierValue: 0.05,
  }),

  // Branche III : Analyse & Traitement des Flux
  Object.freeze({
    id: 'S1',
    branch: 'TECH_BRANCH_III_FLUX',
    branchNameFr: 'Analyse & Traitement des Flux',
    tier: 1,
    nameFr: 'Centrifugeuse de Précision',
    costPr: 800,
    effectDescriptionFr: '+10 % de chance relative sur les paliers Rare et Épique',
    modifierValue: 0.1,
  }),
  Object.freeze({
    id: 'S2',
    branch: 'TECH_BRANCH_III_FLUX',
    branchNameFr: 'Analyse & Traitement des Flux',
    tier: 2,
    nameFr: 'Incinérateur à Induction',
    costPr: 6_000,
    effectDescriptionFr: 'Divise par deux le temps de recyclage des bio-déchets',
    modifierValue: 0.5,
  }),
  Object.freeze({
    id: 'S3',
    branch: 'TECH_BRANCH_III_FLUX',
    branchNameFr: 'Analyse & Traitement des Flux',
    tier: 3,
    nameFr: 'Filtres HEPA Régénératifs',
    costPr: 50_000,
    effectDescriptionFr: "Réduit les charges fixes d'usine de 20 %",
    modifierValue: 0.2,
  }),

  // Branche IV : Hybridation Plasmidique
  Object.freeze({
    id: 'M1',
    branch: 'TECH_BRANCH_IV_PLASMID',
    branchNameFr: 'Hybridation Plasmidique',
    tier: 1,
    nameFr: 'Pipettes Chauffantes',
    costPr: 500,
    effectDescriptionFr: 'Divise le coût en Bio de scissiparité par deux',
    modifierValue: 0.5,
  }),
  Object.freeze({
    id: 'M2',
    branch: 'TECH_BRANCH_IV_PLASMID',
    branchNameFr: 'Hybridation Plasmidique',
    tier: 2,
    nameFr: 'Catalyseur Chimique',
    costPr: 8_000,
    effectDescriptionFr: '+10 % de probabilité de rang supérieur en croisement',
    modifierValue: 0.1,
  }),
  Object.freeze({
    id: 'M3',
    branch: 'TECH_BRANCH_IV_PLASMID',
    branchNameFr: 'Hybridation Plasmidique',
    tier: 3,
    nameFr: 'Matrice à Trois Canaux',
    costPr: 75_000,
    effectDescriptionFr: 'Permet de conjuguer trois souches en une seule opération',
    modifierValue: 3,
  }),
]);

export const TECH_BY_ID: Readonly<Record<TechId, TechDefinition>> = Object.freeze(
  Object.fromEntries(TECH_TREE.map((t) => [t.id, t])) as Record<TechId, TechDefinition>
);
