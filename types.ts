
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export type UserRole = 'citizen' | 'worker';

export type AppLanguage = 'English' | 'Hindi' | 'Marathi' | 'Tamil' | 'Bengali';

export interface CitizenSettings {
  isPaused: boolean;
  lastPausedAt?: number;
  language: AppLanguage;
}

// -- Detailed Family Structures --

export interface FamilyMember {
  age?: number; // Age or age range
  gender?: 'Male' | 'Female' | 'Other';
  disability?: boolean;
}

export interface PrimaryUser extends FamilyMember {
  state?: string;
  residenceType?: 'Urban' | 'Rural';
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  occupation?: string;
  incomeRange?: string;
}

export interface Spouse extends FamilyMember {
  workingStatus?: 'Working' | 'Homemaker' | 'Unemployed';
  sector?: string;
  incomeRange?: string;
  isPregnant?: boolean;
}

export interface Child extends FamilyMember {
  id: string;
  studentStatus?: boolean;
  educationLevel?: string;
}

export interface Parent extends FamilyMember {
  relation: 'Father' | 'Mother';
  workingStatus?: 'Working' | 'Retired' | 'Dependent';
  sector?: string;
  incomeRange?: string;
}

export interface Sibling extends FamilyMember {
  id: string;
  maritalStatus?: 'Married' | 'Unmarried';
  workingStatus?: 'Working' | 'Student' | 'Unemployed';
  sector?: string; // or education if student
  incomeRange?: string;
}

export interface CitizenProfile {
  username?: string;
  
  // High-level summary (kept for backward compat or quick stats)
  memberCount: number;
  
  // Detailed Demographics
  primaryUser: PrimaryUser;
  spouse?: Spouse;
  children: Child[];
  parents: Parent[];
  siblings: Sibling[];
  
  // Community / Social
  socialCategory?: string; // SC / ST / OBC / General / Minority / ...

  // Deprecated / Derived fields (kept optional to avoid breaking old logic immediately)
  isPregnant?: boolean; // Derived from spouse or primary user if female
  childrenCounts?: {
    age0to1: number;
    age1to6: number;
    age6to14: number;
    age14to18: number;
  };
  livelihood?: string; // Derived from primary user occupation
  incomeStability?: 'steady' | 'variable';
  financialPressure?: 'manageable' | 'stressful';
  state?: string; // duplicate of primaryUser.state
  residenceType?: 'rural' | 'urban'; // duplicate
}

export interface Scheme {
  name: string;
  description: string;
  eligibilityReason: string;
  benefits: string;
  beneficiary: string; // e.g., "Mother", "Child (0-6)", "Household"
}

export interface SchemeAnalysisResult {
  status: 'eligible' | 'missing_info' | 'no_schemes_found';
  schemes?: Scheme[];
  missingField?: keyof CitizenProfile;
  missingFieldQuestion?: string;
}

export interface LifeStageUpdate {
  currentStage: string;
  nextStagePrediction: string;
  immediateNeeds: string[];
  explanation: string;
  journeySummary?: string; // For the timeline history
  profileUpdates?: Partial<CitizenProfile>; // Extracted updates for the profile
}

export interface LifeJourneyEntry {
  id: string;
  date: string;
  eventType: 'life_stage_change' | 'household_update';
  summary: string;
  lifeStagesAfter: string[];
  source: 'user_update' | 'system_inference';
  timestamp: number;
}

export interface SnapshotUpdateEntry {
  id: string;
  date: string;
  user_input: string;
  interpreted_change: string;
  affected_life_stages: string[];
  linked_journey_entry_id: string;
  source: 'user_update' | 'system_inference';
  timestamp: number;
}

export interface Household {
  id: string;
  location: string;
  composition: string;
  currentLifeStage: string;
  riskLevel: RiskLevel;
  lastVisit: string;
  notes: string;
  flagReason?: string; // Why is this flagged for the worker?
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}
