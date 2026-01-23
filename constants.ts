import { Household, RiskLevel } from './types';

export const MOCK_HOUSEHOLDS: Household[] = [
  {
    id: 'HH-102',
    location: 'Sector 4, Block A',
    composition: 'Expecting mother (3rd trimester), 1 child (4yo)',
    currentLifeStage: 'Late Pregnancy',
    riskLevel: RiskLevel.HIGH,
    lastVisit: '2023-10-15',
    notes: 'Missed last scheduled check-up due to transport issues.',
    flagReason: 'Pregnancy with no recent check-in (3+ weeks)'
  },
  {
    id: 'HH-145',
    location: 'Sector 4, Block B',
    composition: 'Elderly couple, 1 adult son (unemployed)',
    currentLifeStage: 'Aging / Livelihood Transition',
    riskLevel: RiskLevel.MEDIUM,
    lastVisit: '2023-11-01',
    notes: 'Son looking for vocational training.',
    flagReason: 'Economic stability concern flagged by community volunteer'
  },
  {
    id: 'HH-089',
    location: 'Sector 2, Block C',
    composition: 'Young couple, newborn (2 months)',
    currentLifeStage: 'Post-natal / Early Infancy',
    riskLevel: RiskLevel.LOW,
    lastVisit: '2023-11-10',
    notes: 'Vaccinations up to date. Breastfeeding established.',
    flagReason: 'Routine monitoring'
  }
];

export const INITIAL_CITIZEN_STATE = {
  stage: "Early Childhood & Parenting",
  next: "School Readiness (6-12 mo)",
  needs: [
    "Nutritional diversity for toddler",
    "Socialization opportunities",
    "Vaccination schedule check"
  ],
  why: "At this stage, brain development is rapid. Ensuring diverse nutrition and social play sets the foundation for school readiness next year."
};
