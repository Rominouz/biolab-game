import type {
  ContractConstraintDefinition,
  ContractConstraintId,
  ContractObjectiveDefinition,
  ContractObjectiveType,
  SponsorDefinition,
  SponsorId,
} from '../types/game.types.ts';

/**
 * Section 11 de specs.md — Contrats Dynamiques Procéduraux
 */
export const CONTRACT_SPONSORS: readonly SponsorDefinition[] = Object.freeze([
  Object.freeze({
    id: 'REGIONAL_HOSPITALS',
    nameFr: 'Hôpitaux Régionaux & Dispensaires',
    descriptionFr: 'Rémunération solide en Bio, requièrent des souches thérapeutiques stables.',
    primaryRewardType: 'BIO',
  }),
  Object.freeze({
    id: 'AGRO_FOOD_COOPS',
    nameFr: 'Coopératives Agro-Alimentaires',
    descriptionFr:
      'Demandent de gros volumes de ferments, fournissent des milieux de culture spécifiques scellés.',
    primaryRewardType: 'SEALED_MEDIA',
  }),
  Object.freeze({
    id: 'MILITARY_AEROSPACE_AGENCIES',
    nameFr: 'Agences de Recherche Militaire & Aérospatiale',
    descriptionFr:
      'Recherchent des extrêmophiles coriaces, paient quasi exclusivement en gros volumes de Points de Recherche (PR).',
    primaryRewardType: 'PR',
  }),
  Object.freeze({
    id: 'CLANDESTINE_LABS',
    nameFr: 'Laboratoires Clandestins',
    descriptionFr:
      'Missions courtes à haut risque, délivrent des souches mutagènes ou des réactifs radio-isotopiques rares.',
    primaryRewardType: 'MUTAGENIC_REAGENTS',
  }),
]);

export const CONTRACT_OBJECTIVES: readonly ContractObjectiveDefinition[] = Object.freeze([
  Object.freeze({
    type: 'DEFINITIVE_SAMPLING',
    nameFr: 'Prélèvement Définitif (Livraison directe)',
    consumesColony: true,
    descriptionFr: 'La boîte demandée est expédiée et consommée.',
  }),
  Object.freeze({
    type: 'CONTINUOUS_METABOLIC_EXTRACTION',
    nameFr: 'Extraction Métabolique Continue',
    consumesColony: false,
    descriptionFr:
      'Maintenir une culture adulte active sur la paillasse pendant une durée donnée sans la perdre. La culture est conservée.',
  }),
  Object.freeze({
    type: 'TIMED_INCUBATION_RACE',
    nameFr: "Course d'Incubation Chronométrée",
    consumesColony: false,
    descriptionFr: "Ensemencer et faire monter une colonie à 100 % de maturité avant l'échéance.",
  }),
  Object.freeze({
    type: 'PLATEAU_SYMBIOSIS',
    nameFr: 'Symbiose de Plateau',
    consumesColony: false,
    descriptionFr: 'Agencer simultanément 3 ou 4 souches de même famille sur les incubateurs.',
  }),
  Object.freeze({
    type: 'SPECIFIC_CHIMERA',
    nameFr: 'Chimère Spécifique',
    consumesColony: false,
    descriptionFr: 'Conjuguer deux espèces précises pour valider un profil plasmidique demandé.',
  }),
]);

export const CONTRACT_CONSTRAINTS: readonly ContractConstraintDefinition[] = Object.freeze([
  Object.freeze({
    id: 'VITAL_URGENCY',
    labelFr: '[Urgence Vitale]',
    descriptionFr: 'Délai de livraison réduit à 3 minutes.',
    rewardMultiplier: 2.5,
  }),
  Object.freeze({
    id: 'GENETIC_PURITY',
    labelFr: '[Pureté Génétique]',
    descriptionFr: 'La culture ne doit avoir subi aucune mutation préalable.',
    rewardMultiplier: 1.8,
  }),
  Object.freeze({
    id: 'CRYO_STABILIZATION',
    labelFr: '[Stabilisation Cryo]',
    descriptionFr: "Doit avoir passé au moins 2 minutes en tube d'azote avant validation.",
    rewardMultiplier: 1.5,
  }),
  Object.freeze({
    id: 'ECONOMIC_CULTURE',
    labelFr: '[Culture Économique]',
    descriptionFr: 'Doit avoir été ensemencée sur Gélose Ordinaire (50 Bio).',
    rewardMultiplier: 3.0,
  }),
]);

export const CONTRACT_SPONSORS_BY_ID: Readonly<Record<SponsorId, SponsorDefinition>> =
  Object.freeze(
    Object.fromEntries(CONTRACT_SPONSORS.map((s) => [s.id, s])) as Record<
      SponsorId,
      SponsorDefinition
    >
  );

export const CONTRACT_OBJECTIVES_BY_TYPE: Readonly<
  Record<ContractObjectiveType, ContractObjectiveDefinition>
> = Object.freeze(
  Object.fromEntries(CONTRACT_OBJECTIVES.map((o) => [o.type, o])) as Record<
    ContractObjectiveType,
    ContractObjectiveDefinition
  >
);

export const CONTRACT_CONSTRAINTS_BY_ID: Readonly<
  Record<ContractConstraintId, ContractConstraintDefinition>
> = Object.freeze(
  Object.fromEntries(CONTRACT_CONSTRAINTS.map((c) => [c.id, c])) as Record<
    ContractConstraintId,
    ContractConstraintDefinition
  >
);
