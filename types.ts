
export type AppLanguage = 'English' | 'Hindi' | 'Marathi' | 'Tamil' | 'Bengali';

export enum RiskLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface Household {
  id: string;
  location: string;
  composition: string;
  currentLifeStage: string;
  riskLevel: RiskLevel;
  lastVisit: string;
  notes: string;
  flagReason: string;
}

export interface FamilyMember {
  age?: string | number;
  gender?: string;
  qualification?: string;
  occupationType?: 'Student' | 'Working' | 'Retired' | 'Homemaker' | 'Unemployed' | 'Other';
  occupationSector?: string; // Govt, Private, etc.
  govtRole?: string;
  studentLevel?: string;
  incomeRange?: string;
  disability?: string; // Yes/No or specific
  maritalStatus?: string;
  isAlive?: boolean;
  name?: string; // Optional identifier
  role?: string; // 'Father', 'Mother'
  [key: string]: any;
}

export interface CitizenProfile {
  username: string;
  accountScope?: 'Myself' | 'Family';
  memberCount: number;
  primaryUser: FamilyMember & {
    state?: string;
    residenceType?: 'Urban' | 'Rural';
    isPregnant?: boolean;
  };
  spouse?: FamilyMember & {
    isPregnant?: boolean;
  };
  children?: FamilyMember[];
  parents?: FamilyMember[];
  siblings?: FamilyMember[];
  socialCategory?: string;
  
  // Computed/Legacy fields
  state?: string;
  residenceType?: string;
  livelihood?: string;
  incomeStability?: string;
  financialPressure?: string;
  isPregnant?: boolean; // Derived summary
  childrenCounts?: {
    age0to1: number;
    age1to6: number;
    age6to14: number;
    age14to18: number;
    [key: string]: number;
  };
  [key: string]: any;
}

export interface FocusAreaContent {
  title: string;
  shortDescription: string;
  whyItMatters: string;
}

export interface LifeStageUpdate {
  currentStage: string;
  previousStage?: string;
  activeStages?: string[];
  schemeIndicators?: string[];
  nextStagePrediction: string;
  immediateNeeds: string[];
  explanation: string;
  journeySummary: string;
  profileUpdates?: any;
  focusAreas?: {
    health: FocusAreaContent;
    education: FocusAreaContent;
    livelihood: FocusAreaContent;
    support: FocusAreaContent;
  };
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

export interface SnapshotUpdateEntry {
  id: string;
  date: string;
  user_input: string;
  change_summary: string;
  changes_detailed?: any[];
  previous_profile_state?: string;
  life_stage?: string;
  timestamp: number;
}

export type LifeJourneyEntry = SnapshotUpdateEntry;

export interface CitizenSettings {
  isPaused: boolean;
  language: AppLanguage;
}

export interface DetectedProfileUpdate {
  summary: string;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    affectedMember: string;
  }>;
  newProfileState: CitizenProfile;
}

export interface Scheme {
  name: string;
  description: string;
  eligibilityReason: string;
  benefits: string;
  beneficiary: string;
  beneficiaryType?: string;
  category?: string;
  probability?: 'Likely applicable' | 'May apply' | 'Requires verification';
  // New application fields
  applicationProcess: string[]; // Steps 1, 2, 3...
  requiredDocuments: string[];
  applicationMode: 'Offline' | 'Online' | 'Assisted';
}

export interface SchemeAnalysisResult {
  status: 'eligible' | 'missing_info' | 'no_schemes_found';
  schemes?: Scheme[];
  missingField?: keyof CitizenProfile;
  missingFieldQuestion?: string;
}

export type UserRole = 'citizen' | 'worker';
