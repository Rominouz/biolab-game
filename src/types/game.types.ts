/**
 * BIOLAB — Types et Interfaces Stricte du Modèle de Données
 */

export type Rarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
  | 'MYTHIC'
  | 'SECRET';

export type StandardBranchId = 'BRANCH_I' | 'BRANCH_II' | 'BRANCH_III' | 'BRANCH_IV';
export type SpecialBranchId = 'BRANCH_V_MYTHIC' | 'BRANCH_SECRET';
export type BranchId = StandardBranchId | SpecialBranchId;

export type CultureMediumId =
  | 'MEDIUM_1_ORDINARY_AGAR'
  | 'MEDIUM_2_BRAIN_HEART_BROTH'
  | 'MEDIUM_3_SHEEP_BLOOD_AGAR'
  | 'MEDIUM_4_CHOCOLATE_ISOVITALEX'
  | 'MEDIUM_5_HYPERSALINE_VOLCANIC'
  | 'MEDIUM_6_CRYO_ABYSSAL_SERUM'
  | 'MEDIUM_7_RADIO_ISOTOPIC_AGAR';

export type FactoryTierLevel = 1 | 2 | 3 | 4 | 5;

export type FactoryModuleId = 'BENCH' | 'CRYO_CHAMBER' | 'TROPHY_CABINET' | 'LOGBOOK';

export type TechBranchId =
  | 'TECH_BRANCH_I_CELLULAR'
  | 'TECH_BRANCH_II_CRYO'
  | 'TECH_BRANCH_III_FLUX'
  | 'TECH_BRANCH_IV_PLASMID';

export type TechId =
  | 'T1'
  | 'T2'
  | 'T3'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'M1'
  | 'M2'
  | 'M3';

export type TrophyId =
  | 'TROPHY_01'
  | 'TROPHY_02'
  | 'TROPHY_03'
  | 'TROPHY_04'
  | 'TROPHY_05'
  | 'TROPHY_06'
  | 'TROPHY_07'
  | 'TROPHY_08'
  | 'TROPHY_09'
  | 'TROPHY_10'
  | 'TROPHY_11'
  | 'TROPHY_12'
  | 'TROPHY_13'
  | 'TROPHY_14'
  | 'TROPHY_15'
  | 'TROPHY_16';

export type TrophyShelfId =
  | 'SHELF_1_APPRENTICESHIP'
  | 'SHELF_2_BENCH_PRACTICE'
  | 'SHELF_3_INDUSTRIAL_MASTERY'
  | 'SHELF_4_HIGH_CONTAINMENT'
  | 'UPPER_BELL_RARE_ANOMALY';

export type BeneficialEventId =
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'B9'
  | 'B10';

export type IncidentEventId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export type BenchEventId = BeneficialEventId | IncidentEventId;

export type SponsorId =
  | 'REGIONAL_HOSPITALS'
  | 'AGRO_FOOD_COOPS'
  | 'MILITARY_AEROSPACE_AGENCIES'
  | 'CLANDESTINE_LABS';

export type ContractObjectiveType =
  | 'DEFINITIVE_SAMPLING'
  | 'CONTINUOUS_METABOLIC_EXTRACTION'
  | 'TIMED_INCUBATION_RACE'
  | 'PLATEAU_SYMBIOSIS'
  | 'SPECIFIC_CHIMERA';

export type ContractConstraintId =
  | 'VITAL_URGENCY'
  | 'GENETIC_PURITY'
  | 'CRYO_STABILIZATION'
  | 'ECONOMIC_CULTURE';

export interface RarityVisualDefinition {
  readonly id: Rarity;
  readonly labelFr: string;
  readonly colorHex: string;
  readonly secondaryColorHex?: string;
  readonly growthTimeRangeSeconds: readonly [number, number];
  readonly animationTitleFr: string;
  readonly animationDescriptionFr: string;
}

export interface DropTableEntry {
  readonly rarity: Rarity;
  /** Pourcentage affiché dans l'UI (ex: 74.6993) */
  readonly displayPercentage: number;
  /** Poids entier exact en parties par million (sur 1_000_000) */
  readonly weightPpm: number;
}

export type StandardBranchWeightsPpm = Readonly<Record<StandardBranchId, number>>;

export interface CultureMediumDefinition {
  readonly id: CultureMediumId;
  readonly index: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly nameFr: string;
  readonly costBio: number;
  readonly requiresMythicSacrifice: boolean;
  readonly profileDescriptionFr: string;
  readonly dropTable: readonly DropTableEntry[];
  readonly standardBranchWeightsPpm: StandardBranchWeightsPpm;
}

export type StrainEffectType =
  | 'STARTER_STABLE'
  | 'ADJACENT_BACILLI_BOOST'
  | 'PAUSE_AND_UNDERVOLTAGE_IMMUNITY'
  | 'ADJACENT_NEIGHBORS_BOOST'
  | 'PASSIVE_BIO_TO_PR_CONVERSION'
  | 'ADJACENT_WASTE_IMMUNITY'
  | 'GLOBAL_COCCI_SYNERGY'
  | 'MEDICAL_CONTRACT_VALUE_BOOST'
  | 'UV_MUTAGENESIS_LYSIS_IMMUNITY'
  | 'GLOBAL_FIXED_OVERHEAD_REDUCTION'
  | 'GLOBAL_DIVISION_SPEED_BOOST'
  | 'MANUAL_NUTRIENT_INJECTION_DOUBLE'
  | 'RARE_TIER_DROP_BOOST'
  | 'CONJUGATION_SPEED_BOOST'
  | 'HYBRIDIZATION_RANK_JUMP_BOOST'
  | 'SELF_CRYO_UPKEEP_HALVED'
  | 'ADJACENT_WASTE_PROTECTION'
  | 'COPY_BEST_ADJACENT_MULTIPLIER'
  | 'ADJACENT_WASTE_DESTRUCTION_BOUNTY'
  | 'FREE_EXTRA_CRYO_TUBE_SLOT'
  | 'GLOBAL_INCUBATION_SPEED_BOOST'
  | 'DOUBLE_BIOFILM_SYNERGY_COUNT'
  | 'AUTO_INCINERATE_WASTE_AND_STACK_YIELD'
  | 'SEEDING_DOUBLE_RESULT_CHANCE'
  | 'GLOBAL_GROSS_PRODUCTION_TENFOLD'
  | 'PERFECT_NON_DESTRUCTIVE_HYBRIDIZATION'
  | 'NULLIFY_ALL_FIXED_OVERHEAD';

export interface StrainEffectDefinition {
  readonly type: StrainEffectType;
  readonly value: number;
  readonly descriptionFr: string;
}

export interface StrainDefinition {
  readonly id: string;
  readonly index: number;
  readonly scientificName: string;
  readonly nicknameFr?: string;
  readonly branch: BranchId;
  readonly rarity: Rarity;
  readonly growthDurationSeconds: number;
  readonly adultLifespanSeconds: number;
  readonly multiplier: number;
  readonly cryoUpkeepBioPerSec: number;
  readonly scissiparityCostBio: number;
  readonly scissiparityCostPr: number;
  readonly flashAutoclaveCostBio: number;
  readonly effect: StrainEffectDefinition;
}

export interface FactoryPalette {
  readonly wallsHex: string;
  readonly floorHex: string;
  readonly neonHex: string;
}

export interface FactoryTierDefinition {
  readonly level: FactoryTierLevel;
  readonly nameFr: string;
  readonly unlockCostBio: number;
  readonly unlockCostPr: number;
  readonly incubatorSlots: number;
  readonly cryoTubeSlots: number;
  readonly fixedOverheadBioPerSec: number;
  readonly palette: FactoryPalette;
  readonly benchDescriptionFr: string;
  readonly cryoDescriptionFr: string;
}

export interface TechDefinition {
  readonly id: TechId;
  readonly branch: TechBranchId;
  readonly branchNameFr: string;
  readonly tier: 1 | 2 | 3;
  readonly nameFr: string;
  readonly costPr: number;
  readonly effectDescriptionFr: string;
  readonly modifierValue: number;
}

export interface TrophyDefinition {
  readonly id: TrophyId;
  readonly number: number;
  readonly shelf: TrophyShelfId;
  readonly nameFr: string;
  readonly pixelArtDescriptionFr: string;
  readonly unlockConditionDescriptionFr: string;
  readonly permanentEffectDescriptionFr: string;
  readonly targetValue: number;
  readonly effectValue: number;
}

export type EventInteractionType =
  | 'SWIPE_COVER'
  | 'AUTOMATIC_NO_CLICK'
  | 'CLICK_SPORE'
  | 'CLICK_BUBBLE'
  | 'CLICK_ENVELOPE'
  | 'CLICK_HALO'
  | 'TAP_DIAL'
  | 'OBSERVE_NO_TOUCH'
  | 'CLICK_POST_IT'
  | 'CLICK_VALVE'
  | 'CLICK_AIR_RING'
  | 'CLICK_3_TIMES_FROST'
  | 'CLICK_FAN_BOX'
  | 'CLICK_CALIBRATION_WHEEL'
  | 'CLICK_STERILE_COTTON';

export interface BenchEventDefinition {
  readonly id: BenchEventId;
  readonly category: 'BENEFICIAL' | 'INCIDENT';
  readonly titleFr: string;
  readonly visualDescriptionFr: string;
  readonly interactionType: EventInteractionType;
  readonly requiredClicks: number;
  readonly interactionDescriptionFr: string;
  readonly displayDurationSeconds: number;
  readonly effectDescriptionFr: string;
  readonly effectDurationSeconds: number;
  readonly primaryValue: number;
  readonly secondaryValue?: number;
}

export interface SponsorDefinition {
  readonly id: SponsorId;
  readonly nameFr: string;
  readonly descriptionFr: string;
  readonly primaryRewardType: 'BIO' | 'SEALED_MEDIA' | 'PR' | 'MUTAGENIC_REAGENTS';
}

export interface ContractObjectiveDefinition {
  readonly type: ContractObjectiveType;
  readonly nameFr: string;
  readonly consumesColony: boolean;
  readonly descriptionFr: string;
}

export interface ContractConstraintDefinition {
  readonly id: ContractConstraintId;
  readonly labelFr: string;
  readonly descriptionFr: string;
  readonly rewardMultiplier: number;
}
