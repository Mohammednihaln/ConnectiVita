
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
  consentGiven?: boolean;
}

// -- Detailed Family Structures --

export interface FamilyMember {
  age?: string | number; // Updated to allow ranges like "18-25"
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  disability?: string; // 'Yes', 'No', 'Prefer not to say'
  
  // Education & Qualification
  qualification?: string; // "10th grade", "Diploma", etc.
  otherQualification?: string; // If 'Other' is selected

  // Standardized Status & Education for ALL members
  workingStatus?: 'Student' | 'Working' | 'Not working' | 'Homemaker' | 'Retired';
  studentLevel?: 'School' | 'College' | 'Other';
  schoolGrade?: string;
  collegeCourse?: string;
  collegeYear?: string;
  otherStudy?: string;
}

export interface PrimaryUser extends FamilyMember {
  state?: string;
  residenceType?: 'Urban' | 'Rural';
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced' | 'Never married';
  occupation?: string; // Kept for legacy compatibility
  employmentStatus?: 'Student' | 'Working' | 'Not working' | 'Homemaker'; // Legacy field, mapped to workingStatus in logic
  employmentSector?: 'Government' | 'Private' | 'Self-employed';
  governmentRole?: string;
  governmentRoleDescription?: string;
  incomeRange?: string;
  isPregnant?: boolean;
}

export interface Spouse extends FamilyMember {
  isAlive?: boolean;
  // workingStatus inherited from FamilyMember
  employmentSector?: 'Government' | 'Private' | 'Self-employed';
  governmentRole?: string;
  governmentRoleDescription?: string;
  incomeRange?: string;
  isPregnant?: boolean;
}

export interface Child extends FamilyMember {
  id: string;
  isStudent?: boolean; // Legacy
  educationLevel?: string; // Legacy
  // New standardized fields inherited from FamilyMember
}

export interface Parent extends FamilyMember {
  relation: 'Father' | 'Mother' | 'Parent'; 
  isAlive?: boolean;
  // workingStatus inherited
  employmentSector?: 'Government' | 'Private' | 'Self-employed';
  governmentRole?: string;
  governmentRoleDescription?: string;
  incomeRange?: string;
  isPregnant?: boolean;
}

export interface Sibling extends FamilyMember {
  id: string;
  maritalStatus?: 'Married' | 'Unmarried';
  isStudent?: boolean; // Legacy
  isWorking?: boolean; // Legacy
  // workingStatus inherited
  
  educationLevel?: string; // Legacy
  employmentSector?: 'Government' | 'Private' | 'Self-employed';
  governmentRole?: string;
  governmentRoleDescription?: string;
  incomeRange?: string;
  isPregnant?: boolean;
}

export interface CitizenProfile {
  username?: string;
  accountScope?: 'individual' | 'family';
  
  // High-level summary
  memberCount: number;
  
  // Detailed Demographics
  primaryUser: PrimaryUser;
  spouse?: Spouse;
  children: Child[];
  parents: Parent[];
  siblings: Sibling[];
  
  // Community / Social
  socialCategory?: string; // SC / ST / OBC / General / Minority / ...

  // Deprecated / Derived fields
  isPregnant?: boolean;
  childrenCounts?: {
    age0to1: number;
    age1to6: number;
    age6to14: number;
    age14to18: number;
  };
  livelihood?: string;
  incomeStability?: 'steady' | 'variable';
  financialPressure?: 'manageable' | 'stressful';
  state?: string;
  residenceType?: 'rural' | 'urban';
}

export interface Scheme {
  name: string;
  description: string;
  eligibilityReason: string;
  benefits: string;
  beneficiary: string;
  category: 'Health' | 'Education' | 'Pension' | 'Livelihood' | 'Housing' | 'Other';
}

export interface SchemeAnalysisResult {
  status: 'eligible' | 'missing_info' | 'no_schemes_found';
  schemes?: Scheme[];
  missingField?: keyof CitizenProfile;
  missingFieldQuestion?: string;
}

export interface FocusAreaContent {
    title: string;
    shortDescription: string;
    whyItMatters: string;
}

export interface LifeStageUpdate {
  currentStage: string;
  previousStage?: string; // NEW: For Visual Timeline
  nextStagePrediction: string;
  immediateNeeds: string[];
  explanation: string;
  journeySummary?: string;
  profileUpdates?: Partial<CitizenProfile>;
  activeStages?: string[]; // E.g. ["Pregnancy", "School Age", "Senior Citizen"]
  schemeIndicators?: string[]; // E.g. ["Maternal health support may apply"]
  focusAreas?: {
      health: FocusAreaContent;
      education: FocusAreaContent;
      livelihood: FocusAreaContent;
      support: FocusAreaContent;
  };
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

export interface DetectedChange {
  field: string;
  oldValue: string;
  newValue: string;
  affectedMember: string;
}

export interface DetectedProfileUpdate {
  summary: string;
  changes: DetectedChange[];
  newProfileState: CitizenProfile;
}

export interface SnapshotUpdateEntry {
  id: string;
  date: string;
  user_input: string;
  change_summary: string;
  changes_detailed: DetectedChange[];
  previous_profile_state: string; // JSON stringified for safe storage
  life_stage?: string; // NEW: To track stage history
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
  flagReason?: string; 
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
