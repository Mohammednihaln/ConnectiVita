
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Activity, Heart, Info, Loader2, Trash2, User as UserIcon, Check, ChevronRight, X, MessageCircle, Send, Plus, History, Cloud, LogOut, Lock, ScrollText, AlertTriangle, Clock, ArrowLeft, ArrowRight, Pause, Play, Download, Mic, Volume2, Globe, Sparkles, Shield, Users, Home, FileText, User, Edit2, Mail, Key, ShieldCheck, XCircle, Zap, Menu, AlertCircle, RefreshCw, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Briefcase, Star, GraduationCap, Building2, MapPin, Accessibility } from 'lucide-react';
import { LifeStageTimeline } from './LifeStageTimeline';
import { FamilyJourneyView } from './FamilyJourneyView';
import { UpdateHistoryView } from './UpdateHistoryView';
import { analyzeLifeStageChange, generateInitialSnapshot, explainNeed, getFamilyContextChatResponse, getEligibleSchemes, detectProfileChanges, generateChatTitle, safeStringifyProfile, deepClean } from '../services/geminiService';
import { CitizenProfile, LifeStageUpdate, ChatSession, ChatMessage, LifeJourneyEntry, SnapshotUpdateEntry, CitizenSettings, SchemeAnalysisResult, AppLanguage, DetectedProfileUpdate, FocusAreaContent, Scheme, FamilyMember } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, deleteDoc, updateDoc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { User as FirebaseUser, deleteUser } from 'firebase/auth';
import { TRANSLATIONS } from '../translations';

interface Props {
    user: FirebaseUser;
    onSignOut: () => void;
}

const LANGUAGES: AppLanguage[] = ['English', 'Hindi', 'Marathi', 'Tamil', 'Bengali'];

// -- Constants for Options --
const STATES_LIST = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'];
const INCOME_RANGES = ['Below ₹1 Lakh', '₹1 - 3 Lakh', '₹3 - 5 Lakh', 'Above ₹5 Lakh', 'Prefer not to say'];
const SECTORS = ['Government', 'Private', 'Self-employed', 'Agriculture', 'Daily Wage', 'Other'];
const QUALIFICATIONS = ["Not Joined school yet", "Less than 8th grade", "10th grade", "12th grade", "Diploma", "Undergraduate", "Post Graduate", "Other"];
const SOCIAL_CATEGORIES = ['General', 'SC', 'ST', 'OBC', 'Minority', 'Prefer not to say'];
const GOVERNMENT_ROLES = [
  'Central Government (Civil Services)',
  'State Government Services',
  'Public Sector Undertaking (PSU)',
  'Government School Teacher',
  'Government College / University Staff',
  'Defence Services (Army / Navy / Air Force)',
  'Paramilitary Forces (CRPF, BSF, CISF, etc.)',
  'Police Department',
  'Railways',
  'Public Sector Bank',
  'Government Hospital / Health Worker',
  'Municipal / Local Body Employee',
  'Anganwadi / ICDS Worker',
  'Other Government Role',
  'Prefer not to say'
];

const WizardOptionButton: React.FC<{ label: string, selected: boolean, onClick: () => void, icon?: any }> = ({ label, selected, onClick, icon: Icon }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left p-4 rounded-xl border font-medium transition-all flex justify-between items-center ${selected ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
    >
        <div className="flex items-center gap-3">
            {Icon && <Icon size={18} className={selected ? 'text-teal-200' : 'text-stone-400'} />}
            <span>{label}</span>
        </div>
        {selected && <Check size={18} className="text-teal-200" />}
    </button>
);

const WizardProgress = ({ current, total, t }: { current: number, total: number, t: any }) => (
    <div className="mb-6">
        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 text-right">{t.wizard.step} {current} / {total}</div>
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-full transition-all duration-500 ease-out" style={{ width: `${Math.min((current / total) * 100, 100)}%` }}></div>
        </div>
    </div>
);

const WizardScreen = ({ title, children, progress, canProceed, nextLabel, onNext, onBack, t }: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {progress && <WizardProgress current={progress.current} total={progress.total} t={t} />}
        
        <h2 className="text-xl font-bold text-stone-800 leading-snug">{title}</h2>
        
        <div className="space-y-3 py-2">
            {children}
        </div>

        <div className="flex gap-3 pt-4">
            <button onClick={onBack} className="px-6 py-4 rounded-xl border border-stone-200 text-stone-500 font-bold hover:bg-stone-50 transition">
                {t.common.back}
            </button>
            <button onClick={onNext} disabled={!canProceed} className="flex-1 bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:shadow-none hover:bg-black transition-all flex justify-center items-center gap-2">
                {nextLabel || t.common.next}
                {!canProceed && <span className="hidden group-hover:block text-[10px] font-normal opacity-70">{t.wizard.enterValue}</span>}
            </button>
        </div>
    </div>
);

// --- COMPONENT: SCHEME CARD ---
const SchemeCard: React.FC<{ scheme: Scheme, t: any }> = ({ scheme, t }) => {
    const [showReason, setShowReason] = useState(false);
    const [showApply, setShowApply] = useState(false);

    return (
         <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-stone-100 text-stone-600">{scheme.category || 'General'}</span>
            </div>
            <h4 className="font-bold text-stone-800 text-lg mb-2">{scheme.name}</h4>
            <p className="text-stone-600 text-sm mb-4">{scheme.description}</p>
            <div className="flex gap-3 text-xs font-bold text-teal-600">
                <button onClick={() => setShowReason(!showReason)}>{t.schemes.whySuggested}</button>
                <button onClick={() => setShowApply(!showApply)}>{t.schemes.howToApply}</button>
            </div>
            {showReason && <div className="mt-3 p-3 bg-stone-50 rounded-xl text-xs">{scheme.eligibilityReason}</div>}
            {showApply && <div className="mt-3 p-3 bg-teal-50 rounded-xl text-xs">{scheme.applicationProcess?.join(', ')}</div>}
        </div>
    )
}

// --- TOP HEADER ---
const TopHeader: React.FC<{ 
    onNavigate: (view: 'PROFILE' | 'SETTINGS') => void, 
    onSignOut: () => void 
}> = ({ onNavigate, onSignOut }) => {
    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-stone-200 px-5 py-3 flex justify-between items-center shadow-sm">
            <div className="text-xl font-bold text-stone-800 tracking-tight">ConnectiVita</div>
            <button onClick={onSignOut} className="text-xs font-bold text-red-500">Sign Out</button>
        </header>
    );
};

export const CitizenView: React.FC<Props> = ({ user, onSignOut }) => {
  const deviceId = user.uid;

  // Data State
  const [lifeState, setLifeState] = useState<LifeStageUpdate | null>(null);
  const [settings, setSettings] = useState<CitizenSettings>({ isPaused: false, language: 'English' });
  const [profile, setProfile] = useState<CitizenProfile>({
    username: '', 
    accountScope: 'Family', 
    memberCount: 1, 
    primaryUser: {},
    spouse: {},
    children: [],
    parents: [],
    siblings: [],
  });
  
  // UI State
  const [currentView, setCurrentView] = useState<'HOME' | 'SCHEMES' | 'CHAT' | 'PROFILE' | 'SETTINGS'>('HOME');
  const [isInitializing, setIsInitializing] = useState(true);
  const [schemeData, setSchemeData] = useState<SchemeAnalysisResult | null>(null);
  
  // Wizard Navigation
  const [currentStepId, setCurrentStepId] = useState<string>('welcome');
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  
  // Wizard Loop Indices
  const [currentChildIndex, setCurrentChildIndex] = useState(0);
  const [totalChildren, setTotalChildren] = useState(0);
  const [currentSiblingIndex, setCurrentSiblingIndex] = useState(0);
  const [totalSiblings, setTotalSiblings] = useState(0);
  const [parentIterators, setParentIterators] = useState<string[]>([]); // 'Father', 'Mother'
  const [currentParentIndex, setCurrentParentIndex] = useState(0);

  // Chat & Updates
  const [updateInput, setUpdateInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chats, setChats] = useState<Record<string, ChatSession>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // @ts-ignore
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS['English'];

  // --- Firebase Sync ---
  useEffect(() => {
    const householdRef = doc(db, 'households', deviceId);
    const unsubHousehold = onSnapshot(householdRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
        setLifeState(data.lifeState || null);
        if (data.settings?.language) setSettings(prev => ({ ...prev, ...data.settings }));
        setIsInitializing(false);
      } else {
        setIsInitializing(false);
      }
    });
    return () => unsubHousehold();
  }, [deviceId]);

  // --- WIZARD LOGIC ENGINE ---
  const handleNext = () => {
    const nextStep = determineNextStep(currentStepId);
    setStepHistory(prev => [...prev, currentStepId]);
    setCurrentStepId(nextStep);
  };

  const handleBack = () => {
    if (stepHistory.length === 0) return;
    const prevStep = stepHistory[stepHistory.length - 1];
    setStepHistory(prev => prev.slice(0, -1));
    setCurrentStepId(prevStep);
  };

  const determineNextStep = (current: string): string => {
      // 1. Account Setup
      if (current === 'welcome') return 'account_scope';
      
      // 2. Primary User ('You')
      if (current === 'account_scope') return 'p_gender';
      if (current === 'p_gender') return 'p_age';
      if (current === 'p_age') return 'p_qual';
      if (current === 'p_qual') {
          // Cond: Female + Reprod Age -> Pregnant?
          const isFemale = profile.primaryUser.gender === 'Female';
          const age = Number(profile.primaryUser.age);
          if (isFemale && age >= 18 && age <= 45) return 'p_pregnant';
          return 'p_work_status';
      }
      if (current === 'p_pregnant') return 'p_work_status';
      if (current === 'p_work_status') {
          const occ = profile.primaryUser.occupationType;
          if (occ === 'Working') return 'p_work_sector';
          if (occ === 'Student') return 'p_student_level';
          return 'p_income'; // Skip details
      }
      if (current === 'p_work_sector') {
          if (profile.primaryUser.occupationSector === 'Government') return 'p_govt_role';
          return 'p_income';
      }
      if (current === 'p_govt_role') return 'p_income';
      if (current === 'p_student_level') return 'p_income'; // Or ask grade?
      if (current === 'p_income') return 'p_disability';
      if (current === 'p_disability') return 'p_location';
      if (current === 'p_location') return 'p_residence';
      if (current === 'p_residence') return 'p_marital';

      // 3. Spouse
      if (current === 'p_marital') {
          if (profile.primaryUser.maritalStatus === 'Married') return 's_alive';
          return 'c_check'; // Skip spouse
      }
      if (current === 's_alive') {
          if (profile.spouse?.isAlive) return 's_age';
          return 'c_check';
      }
      if (current === 's_age') return 's_qual';
      if (current === 's_qual') return 's_work_status';
      if (current === 's_work_status') {
          const occ = profile.spouse?.occupationType;
          if (occ === 'Working') return 's_work_sector';
          return 's_disability'; // Simplified for spouse
      }
      if (current === 's_work_sector') {
           if (profile.spouse?.occupationSector === 'Government') return 's_govt_role';
           return 's_disability';
      }
      if (current === 's_govt_role') return 's_disability';
      if (current === 's_disability') {
           // Cond: Spouse Female + Reprod Age
           const pMale = profile.primaryUser.gender === 'Male';
           const sAge = Number(profile.spouse?.age);
           if (pMale && sAge >= 18 && sAge <= 45) return 's_pregnant';
           return 'c_check';
      }
      if (current === 's_pregnant') return 'c_check';

      // 4. Children (Loop)
      if (current === 'c_check') {
          return 'c_count'; 
      }
      if (current === 'c_count') {
          if (totalChildren > 0) {
              setCurrentChildIndex(0);
              return 'child_loop_age';
          }
          return 'pa_check';
      }
      // Child Loop Steps
      if (current === 'child_loop_age') return 'child_loop_gender';
      if (current === 'child_loop_gender') return 'child_loop_status';
      if (current === 'child_loop_status') return 'child_loop_disability'; 
      if (current === 'child_loop_disability') {
          if (currentChildIndex < totalChildren - 1) {
              setCurrentChildIndex(prev => prev + 1);
              return 'child_loop_age';
          }
          return 'pa_check';
      }

      // 5. Parents
      if (current === 'pa_check') {
           if (parentIterators.length > 0) {
               setCurrentParentIndex(0);
               return 'parent_loop_age';
           }
           return 'sib_check';
      }
      // Parent Loop
      if (current === 'parent_loop_age') return 'parent_loop_status';
      if (current === 'parent_loop_status') {
           if (currentParentIndex < parentIterators.length - 1) {
               setCurrentParentIndex(prev => prev + 1);
               return 'parent_loop_age';
           }
           return 'sib_check';
      }

      // 6. Siblings
      if (current === 'sib_check') return 'sib_count';
      if (current === 'sib_count') {
          if (totalSiblings > 0) {
              setCurrentSiblingIndex(0);
              return 'sib_loop_age';
          }
          return 'social_cat';
      }
      // Sibling Loop
      if (current === 'sib_loop_age') return 'sib_loop_gender';
      if (current === 'sib_loop_gender') return 'sib_loop_marital';
      if (current === 'sib_loop_marital') return 'sib_loop_status';
      if (current === 'sib_loop_status') {
           if (currentSiblingIndex < totalSiblings - 1) {
               setCurrentSiblingIndex(prev => prev + 1);
               return 'sib_loop_age';
           }
           return 'social_cat';
      }

      // 7. Social & End
      if (current === 'social_cat') return 'summary';
      if (current === 'summary') return 'finish';

      return 'welcome';
  };

  // --- WIZARD RENDERER ---
  const renderWizardContent = () => {
    // HELPERS FOR UPDATING STATE
    const updatePrimary = (key: keyof FamilyMember, val: any) => 
        setProfile(p => ({ ...p, primaryUser: { ...p.primaryUser, [key]: val } }));
    
    const updateSpouse = (key: keyof FamilyMember, val: any) => 
        setProfile(p => ({ ...p, spouse: { ...p.spouse, [key]: val } }));

    const updateChild = (idx: number, key: keyof FamilyMember, val: any) => {
        const newChildren = [...(profile.children || [])];
        if (!newChildren[idx]) newChildren[idx] = {};
        newChildren[idx][key] = val;
        setProfile(p => ({ ...p, children: newChildren }));
    };

    const updateParent = (idx: number, key: keyof FamilyMember, val: any) => {
        const newParents = [...(profile.parents || [])];
        if (!newParents[idx]) newParents[idx] = { role: parentIterators[idx] };
        newParents[idx][key] = val;
        setProfile(p => ({ ...p, parents: newParents }));
    };

    const updateSibling = (idx: number, key: keyof FamilyMember, val: any) => {
        const newSib = [...(profile.siblings || [])];
        if (!newSib[idx]) newSib[idx] = {};
        newSib[idx][key] = val;
        setProfile(p => ({ ...p, siblings: newSib }));
    };

    // 1. WELCOME & SCOPE
    if (currentStepId === 'welcome') return (
        <div className="space-y-6 text-center animate-in fade-in">
             <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-4"><Activity size={32}/></div>
             <h1 className="text-2xl font-bold">{t.wizard.welcomeTitle}</h1>
             <p className="text-stone-500">{t.wizard.welcomeSubtitle}</p>
             <button onClick={handleNext} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold">{t.wizard.continue}</button>
        </div>
    );

    if (currentStepId === 'account_scope') return (
        <WizardScreen title="Who is this account for?" progress={{current:1, total:15}} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
            {['Myself', 'My Family'].map(opt => (
                <WizardOptionButton key={opt} label={opt} selected={profile.accountScope === (opt === 'My Family' ? 'Family' : 'Myself')} onClick={() => setProfile(p => ({...p, accountScope: opt === 'My Family' ? 'Family' : 'Myself'}))} />
            ))}
        </WizardScreen>
    );

    // 2. PRIMARY USER
    if (currentStepId === 'p_gender') return (
        <WizardScreen title={t.wizard.genderTitle} progress={{current:2, total:15}} canProceed={!!profile.primaryUser.gender} onNext={handleNext} onBack={handleBack} t={t}>
            {['Male', 'Female', 'Other'].map(opt => <WizardOptionButton key={opt} label={opt} selected={profile.primaryUser.gender === opt} onClick={() => updatePrimary('gender', opt)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'p_age') return (
        <WizardScreen title={t.wizard.ageTitle} progress={{current:3, total:15}} canProceed={!!profile.primaryUser.age} onNext={handleNext} onBack={handleBack} t={t}>
            <input type="number" className="w-full p-4 border rounded-xl text-lg" placeholder="Age" value={profile.primaryUser.age || ''} onChange={e => updatePrimary('age', e.target.value)} autoFocus />
        </WizardScreen>
    );
    if (currentStepId === 'p_qual') return (
        <WizardScreen title="Highest Qualification?" progress={{current:4, total:15}} canProceed={!!profile.primaryUser.qualification} onNext={handleNext} onBack={handleBack} t={t}>
            {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.primaryUser.qualification === q} onClick={() => updatePrimary('qualification', q)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'p_pregnant') return (
        <WizardScreen title="Are you currently pregnant?" progress={{current:5, total:15}} canProceed={profile.primaryUser.isPregnant !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
             <WizardOptionButton label="Yes" selected={profile.primaryUser.isPregnant === true} onClick={() => updatePrimary('isPregnant', true)} />
             <WizardOptionButton label="No" selected={profile.primaryUser.isPregnant === false} onClick={() => updatePrimary('isPregnant', false)} />
        </WizardScreen>
    );
    if (currentStepId === 'p_work_status') return (
        <WizardScreen title="Are you working or studying?" progress={{current:6, total:15}} canProceed={!!profile.primaryUser.occupationType} onNext={handleNext} onBack={handleBack} t={t}>
             {['Working', 'Student', 'Unemployed', 'Homemaker', 'Retired'].map(s => <WizardOptionButton key={s} label={s} selected={profile.primaryUser.occupationType === s} onClick={() => updatePrimary('occupationType', s)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'p_work_sector') return (
        <WizardScreen title="Which sector do you work in?" progress={{current:7, total:15}} canProceed={!!profile.primaryUser.occupationSector} onNext={handleNext} onBack={handleBack} t={t}>
             {SECTORS.map(s => <WizardOptionButton key={s} label={s} selected={profile.primaryUser.occupationSector === s} onClick={() => updatePrimary('occupationSector', s)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'p_govt_role') return (
        <WizardScreen title="Which type of government job?" progress={{current:7, total:15}} canProceed={!!profile.primaryUser.govtRole} onNext={handleNext} onBack={handleBack} t={t}>
             <div className="max-h-60 overflow-y-auto space-y-2">
                {GOVERNMENT_ROLES.map(r => <WizardOptionButton key={r} label={r} selected={profile.primaryUser.govtRole === r} onClick={() => updatePrimary('govtRole', r)} />)}
             </div>
        </WizardScreen>
    );
    if (currentStepId === 'p_income') return (
        <WizardScreen title="Annual Income Range?" progress={{current:8, total:15}} canProceed={!!profile.primaryUser.incomeRange} onNext={handleNext} onBack={handleBack} t={t}>
             {INCOME_RANGES.map(r => <WizardOptionButton key={r} label={r} selected={profile.primaryUser.incomeRange === r} onClick={() => updatePrimary('incomeRange', r)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'p_disability') return (
        <WizardScreen title="Do you have any disability?" progress={{current:9, total:15}} canProceed={!!profile.primaryUser.disability} onNext={handleNext} onBack={handleBack} t={t}>
             <WizardOptionButton label="No" selected={profile.primaryUser.disability === 'No'} onClick={() => updatePrimary('disability', 'No')} />
             <WizardOptionButton label="Yes" selected={profile.primaryUser.disability === 'Yes'} onClick={() => updatePrimary('disability', 'Yes')} />
        </WizardScreen>
    );
    if (currentStepId === 'p_location') return (
        <WizardScreen title="Which state do you live in?" progress={{current:10, total:15}} canProceed={!!profile.primaryUser.state} onNext={handleNext} onBack={handleBack} t={t}>
             <select className="w-full p-4 rounded-xl border bg-white" value={profile.primaryUser.state || ''} onChange={e => updatePrimary('state', e.target.value)}>
                 <option value="">Select State</option>
                 {STATES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
        </WizardScreen>
    );
    if (currentStepId === 'p_residence') return (
        <WizardScreen title="Residence Area Type" progress={{current:11, total:15}} canProceed={!!profile.primaryUser.residenceType} onNext={handleNext} onBack={handleBack} t={t}>
             <WizardOptionButton label="Urban (City/Town)" selected={profile.primaryUser.residenceType === 'Urban'} onClick={() => updatePrimary('residenceType', 'Urban')} />
             <WizardOptionButton label="Rural (Village)" selected={profile.primaryUser.residenceType === 'Rural'} onClick={() => updatePrimary('residenceType', 'Rural')} />
        </WizardScreen>
    );
    if (currentStepId === 'p_marital') return (
        <WizardScreen title="Marital Status" progress={{current:12, total:15}} canProceed={!!profile.primaryUser.maritalStatus} onNext={handleNext} onBack={handleBack} t={t}>
             {['Single', 'Married', 'Divorced', 'Widowed'].map(s => <WizardOptionButton key={s} label={s} selected={profile.primaryUser.maritalStatus === s} onClick={() => updatePrimary('maritalStatus', s)} />)}
        </WizardScreen>
    );

    // 3. SPOUSE
    if (currentStepId === 's_alive') return (
         <WizardScreen title="Is your spouse currently alive?" progress={{current:12, total:15}} canProceed={profile.spouse?.isAlive !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
             <WizardOptionButton label="Yes" selected={profile.spouse?.isAlive === true} onClick={() => updateSpouse('isAlive', true)} />
             <WizardOptionButton label="No" selected={profile.spouse?.isAlive === false} onClick={() => updateSpouse('isAlive', false)} />
         </WizardScreen>
    );
    if (currentStepId === 's_age') return (
         <WizardScreen title="Spouse's Age" progress={{current:13, total:15}} canProceed={!!profile.spouse?.age} onNext={handleNext} onBack={handleBack} t={t}>
             <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.spouse?.age || ''} onChange={e => updateSpouse('age', e.target.value)} autoFocus />
         </WizardScreen>
    );
    if (currentStepId === 's_qual') return (
         <WizardScreen title="Spouse's Highest Qualification?" progress={{current:13, total:15}} canProceed={!!profile.spouse?.qualification} onNext={handleNext} onBack={handleBack} t={t}>
             {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.spouse?.qualification === q} onClick={() => updateSpouse('qualification', q)} />)}
         </WizardScreen>
    );
    if (currentStepId === 's_work_status') return (
         <WizardScreen title="Is spouse working or studying?" progress={{current:13, total:15}} canProceed={!!profile.spouse?.occupationType} onNext={handleNext} onBack={handleBack} t={t}>
             {['Working', 'Student', 'Unemployed', 'Homemaker'].map(s => <WizardOptionButton key={s} label={s} selected={profile.spouse?.occupationType === s} onClick={() => updateSpouse('occupationType', s)} />)}
         </WizardScreen>
    );
    if (currentStepId === 's_work_sector') return (
         <WizardScreen title="Spouse's work sector?" progress={{current:13, total:15}} canProceed={!!profile.spouse?.occupationSector} onNext={handleNext} onBack={handleBack} t={t}>
              {SECTORS.map(s => <WizardOptionButton key={s} label={s} selected={profile.spouse?.occupationSector === s} onClick={() => updateSpouse('occupationSector', s)} />)}
         </WizardScreen>
    );
    if (currentStepId === 's_govt_role') return (
         <WizardScreen title="Spouse's Government Role" progress={{current:13, total:15}} canProceed={!!profile.spouse?.govtRole} onNext={handleNext} onBack={handleBack} t={t}>
              <div className="max-h-60 overflow-y-auto space-y-2">
                 {GOVERNMENT_ROLES.map(r => <WizardOptionButton key={r} label={r} selected={profile.spouse?.govtRole === r} onClick={() => updateSpouse('govtRole', r)} />)}
              </div>
         </WizardScreen>
    );
    if (currentStepId === 's_disability') return (
         <WizardScreen title="Does spouse have disability?" progress={{current:13, total:15}} canProceed={!!profile.spouse?.disability} onNext={handleNext} onBack={handleBack} t={t}>
              <WizardOptionButton label="No" selected={profile.spouse?.disability === 'No'} onClick={() => updateSpouse('disability', 'No')} />
              <WizardOptionButton label="Yes" selected={profile.spouse?.disability === 'Yes'} onClick={() => updateSpouse('disability', 'Yes')} />
         </WizardScreen>
    );
    if (currentStepId === 's_pregnant') return (
         <WizardScreen title="Is your wife currently pregnant?" progress={{current:13, total:15}} canProceed={profile.spouse?.isPregnant !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
              <WizardOptionButton label="Yes" selected={profile.spouse?.isPregnant === true} onClick={() => updateSpouse('isPregnant', true)} />
              <WizardOptionButton label="No" selected={profile.spouse?.isPregnant === false} onClick={() => updateSpouse('isPregnant', false)} />
         </WizardScreen>
    );

    // 4. CHILDREN (Loop)
    if (currentStepId === 'c_check') return (
         <WizardScreen title="Do you have children?" progress={{current:14, total:15}} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
              <WizardOptionButton label="Yes" selected={false} onClick={() => { setTotalChildren(1); handleNext(); }} />
              <WizardOptionButton label="No" selected={false} onClick={() => { setTotalChildren(0); setCurrentStepId('pa_check'); }} />
         </WizardScreen>
    );
    if (currentStepId === 'c_count') return (
         <WizardScreen title="How many children?" progress={{current:14, total:15}} canProceed={totalChildren > 0} onNext={handleNext} onBack={handleBack} t={t}>
              <input type="number" className="w-full p-4 border rounded-xl" value={totalChildren || ''} onChange={e => setTotalChildren(Number(e.target.value))} autoFocus />
         </WizardScreen>
    );
    // Loop Steps
    if (currentStepId === 'child_loop_age') return (
         <WizardScreen title={`Child ${currentChildIndex + 1}: Age?`} progress={{current:14, total:15}} canProceed={!!profile.children?.[currentChildIndex]?.age} onNext={handleNext} onBack={handleBack} t={t}>
              <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.children?.[currentChildIndex]?.age || ''} onChange={e => updateChild(currentChildIndex, 'age', e.target.value)} autoFocus />
         </WizardScreen>
    );
    if (currentStepId === 'child_loop_gender') return (
         <WizardScreen title={`Child ${currentChildIndex + 1}: Gender?`} progress={{current:14, total:15}} canProceed={!!profile.children?.[currentChildIndex]?.gender} onNext={handleNext} onBack={handleBack} t={t}>
              {['Male', 'Female'].map(g => <WizardOptionButton key={g} label={g} selected={profile.children?.[currentChildIndex]?.gender === g} onClick={() => updateChild(currentChildIndex, 'gender', g)} />)}
         </WizardScreen>
    );
    if (currentStepId === 'child_loop_status') return (
         <WizardScreen title={`Child ${currentChildIndex + 1}: Status?`} progress={{current:14, total:15}} canProceed={!!profile.children?.[currentChildIndex]?.occupationType} onNext={handleNext} onBack={handleBack} t={t}>
              {['Student', 'Not in School', 'Working'].map(s => <WizardOptionButton key={s} label={s} selected={profile.children?.[currentChildIndex]?.occupationType === s} onClick={() => updateChild(currentChildIndex, 'occupationType', s)} />)}
         </WizardScreen>
    );
    if (currentStepId === 'child_loop_disability') return (
         <WizardScreen title={`Child ${currentChildIndex + 1}: Disability?`} progress={{current:14, total:15}} canProceed={!!profile.children?.[currentChildIndex]?.disability} onNext={handleNext} onBack={handleBack} t={t}>
              <WizardOptionButton label="No" selected={profile.children?.[currentChildIndex]?.disability === 'No'} onClick={() => updateChild(currentChildIndex, 'disability', 'No')} />
              <WizardOptionButton label="Yes" selected={profile.children?.[currentChildIndex]?.disability === 'Yes'} onClick={() => updateChild(currentChildIndex, 'disability', 'Yes')} />
         </WizardScreen>
    );

    // 5. PARENTS
    if (currentStepId === 'pa_check') return (
        <WizardScreen title="Are your parents alive?" progress={{current:14, total:15}} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
             <WizardOptionButton label="Both Alive" selected={false} onClick={() => { setParentIterators(['Father', 'Mother']); handleNext(); }} />
             <WizardOptionButton label="Only Father Alive" selected={false} onClick={() => { setParentIterators(['Father']); handleNext(); }} />
             <WizardOptionButton label="Only Mother Alive" selected={false} onClick={() => { setParentIterators(['Mother']); handleNext(); }} />
             <WizardOptionButton label="Both Passed Away" selected={false} onClick={() => { setParentIterators([]); setCurrentStepId('sib_check'); }} />
        </WizardScreen>
    );
    if (currentStepId === 'parent_loop_age') return (
        <WizardScreen title={`${parentIterators[currentParentIndex]}'s Age?`} progress={{current:14, total:15}} canProceed={!!profile.parents?.[currentParentIndex]?.age} onNext={handleNext} onBack={handleBack} t={t}>
             <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.parents?.[currentParentIndex]?.age || ''} onChange={e => updateParent(currentParentIndex, 'age', e.target.value)} autoFocus />
        </WizardScreen>
    );
    if (currentStepId === 'parent_loop_status') return (
        <WizardScreen title={`${parentIterators[currentParentIndex]} Status?`} progress={{current:14, total:15}} canProceed={!!profile.parents?.[currentParentIndex]?.occupationType} onNext={handleNext} onBack={handleBack} t={t}>
             {['Retired', 'Working', 'Homemaker'].map(s => <WizardOptionButton key={s} label={s} selected={profile.parents?.[currentParentIndex]?.occupationType === s} onClick={() => updateParent(currentParentIndex, 'occupationType', s)} />)}
        </WizardScreen>
    );

    // 6. SIBLINGS
    if (currentStepId === 'sib_check') return (
        <WizardScreen title="Do you have siblings?" progress={{current:15, total:15}} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
             <WizardOptionButton label="Yes" selected={false} onClick={() => { setTotalSiblings(1); handleNext(); }} />
             <WizardOptionButton label="No" selected={false} onClick={() => { setTotalSiblings(0); setCurrentStepId('social_cat'); }} />
        </WizardScreen>
    );
    if (currentStepId === 'sib_count') return (
        <WizardScreen title="How many siblings?" progress={{current:15, total:15}} canProceed={totalSiblings > 0} onNext={handleNext} onBack={handleBack} t={t}>
             <input type="number" className="w-full p-4 border rounded-xl" value={totalSiblings || ''} onChange={e => setTotalSiblings(Number(e.target.value))} autoFocus />
        </WizardScreen>
    );
    // Sibling Loop
    if (currentStepId === 'sib_loop_age') return (
        <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: Age?`} progress={{current:15, total:15}} canProceed={!!profile.siblings?.[currentSiblingIndex]?.age} onNext={handleNext} onBack={handleBack} t={t}>
             <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.siblings?.[currentSiblingIndex]?.age || ''} onChange={e => updateSibling(currentSiblingIndex, 'age', e.target.value)} autoFocus />
        </WizardScreen>
    );
    if (currentStepId === 'sib_loop_gender') return (
        <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: Gender?`} progress={{current:15, total:15}} canProceed={!!profile.siblings?.[currentSiblingIndex]?.gender} onNext={handleNext} onBack={handleBack} t={t}>
             {['Male', 'Female'].map(g => <WizardOptionButton key={g} label={g} selected={profile.siblings?.[currentSiblingIndex]?.gender === g} onClick={() => updateSibling(currentSiblingIndex, 'gender', g)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'sib_loop_marital') return (
        <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: Marital Status?`} progress={{current:15, total:15}} canProceed={!!profile.siblings?.[currentSiblingIndex]?.maritalStatus} onNext={handleNext} onBack={handleBack} t={t}>
             {['Single', 'Married'].map(s => <WizardOptionButton key={s} label={s} selected={profile.siblings?.[currentSiblingIndex]?.maritalStatus === s} onClick={() => updateSibling(currentSiblingIndex, 'maritalStatus', s)} />)}
        </WizardScreen>
    );
    if (currentStepId === 'sib_loop_status') return (
        <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: Status?`} progress={{current:15, total:15}} canProceed={!!profile.siblings?.[currentSiblingIndex]?.occupationType} onNext={handleNext} onBack={handleBack} t={t}>
             {['Student', 'Working', 'Unemployed'].map(s => <WizardOptionButton key={s} label={s} selected={profile.siblings?.[currentSiblingIndex]?.occupationType === s} onClick={() => updateSibling(currentSiblingIndex, 'occupationType', s)} />)}
        </WizardScreen>
    );

    // 7. SOCIAL CATEGORY
    if (currentStepId === 'social_cat') return (
        <WizardScreen title="Social Category" progress={{current:15, total:15}} canProceed={!!profile.socialCategory} onNext={handleNext} onBack={handleBack} t={t}>
             {SOCIAL_CATEGORIES.map(c => <WizardOptionButton key={c} label={c} selected={profile.socialCategory === c} onClick={() => setProfile(p => ({...p, socialCategory: c}))} />)}
        </WizardScreen>
    );

    // 8. SUMMARY & FINISH
    if (currentStepId === 'summary') return (
        <div className="space-y-6 animate-in fade-in">
             <div className="text-center">
                 <h2 className="text-2xl font-bold text-stone-800">{t.wizard.allSet}</h2>
                 <div className="bg-stone-50 p-6 rounded-3xl mt-4 text-left space-y-2 border border-stone-200">
                     <p><strong>Primary:</strong> {profile.primaryUser.age}yo {profile.primaryUser.gender}, {profile.primaryUser.occupationType}</p>
                     {profile.spouse?.isAlive && <p><strong>Spouse:</strong> {profile.spouse.age}yo</p>}
                     <p><strong>Children:</strong> {profile.children?.length || 0}</p>
                 </div>
             </div>
             <button onClick={async () => {
                 setIsInitializing(true);
                 try {
                    // Update member count
                    const count = 1 + (profile.spouse?.isAlive ? 1 : 0) + (profile.children?.length || 0) + (profile.parents?.length || 0) + (profile.siblings?.length || 0);
                    // Use deepClean here to ensure NO circular references or DOM nodes are passed to Firestore
                    // This fixes the "Converting circular structure to JSON" error.
                    const finalProfile = deepClean({ ...profile, memberCount: count });
                    
                    const initialLifeStage = await generateInitialSnapshot(finalProfile, settings.language);
                    await setDoc(doc(db, 'households', deviceId), { profile: finalProfile, lifeState: initialLifeStage, updatedAt: Date.now() }, { merge: true });
                    setProfile(finalProfile);
                    setLifeState(initialLifeStage);
                 } catch (e) {
                     console.error(e);
                     alert("Something went wrong while saving. Please try again.");
                 } finally {
                     setIsInitializing(false);
                 }
             }} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg">
                 {t.wizard.enterDashboard}
             </button>
         </div>
    );
    
    return <div>Loading...</div>;
  };

  // ... [Handlers for Chat and other views remain same, included below for completeness of component file structure] ...

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !lifeState) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    let currentSessionId = activeChatId;
    let sessionData = activeChatId ? chats[activeChatId] : null;

    if (!currentSessionId || !sessionData) {
        const newChatRef = doc(collection(db, 'households', deviceId, 'chats'));
        currentSessionId = newChatRef.id;
        sessionData = {
            id: currentSessionId,
            title: t.chat.newChat,
            messages: [],
            timestamp: Date.now()
        };
        setActiveChatId(currentSessionId);
    }

    const updatedMessages = [...sessionData.messages, userMsg];
    setChats(prev => ({ ...prev, [currentSessionId!]: { ...sessionData!, messages: updatedMessages } }));
    setChatInput('');
    setIsChatLoading(true);

    try {
        if (updatedMessages.length === 1) {
            const title = await generateChatTitle(userMsg.content, settings.language);
            sessionData.title = title;
        }

        const botResponseText = await getFamilyContextChatResponse(
            profile,
            lifeState.currentStage,
            updatedMessages,
            userMsg.content,
            settings.language,
            schemeData ? schemeData : undefined,
            []
        );

        const botMsg: ChatMessage = { role: 'model', content: botResponseText };
        const finalMessages = [...updatedMessages, botMsg];

        await setDoc(doc(db, 'households', deviceId, 'chats', currentSessionId), {
            ...sessionData,
            messages: finalMessages,
            timestamp: Date.now()
        });

    } catch (e) {
        console.error(e);
    } finally {
        setIsChatLoading(false);
    }
  };

  // Show generic loading if initial sync
  if (isInitializing && !lifeState && currentStepId === 'welcome') return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-teal-600 w-8 h-8" /></div>;

  if (!lifeState) {
      return (
          <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 relative">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-stone-100 my-4">
                  {renderWizardContent()}
              </div>
              
              {/* Loading Overlay for Wizard Submission */}
              {isInitializing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-stone-100 text-center max-w-xs mx-4">
                        <Loader2 className="animate-spin text-teal-600 w-10 h-10 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-stone-800 mb-2">Analyzing Family Profile</h3>
                        <p className="text-sm text-stone-500">Creating your personalized life stage snapshot...</p>
                    </div>
                </div>
              )}
          </div>
      )
  }

  // ... (Main Application Render) ...
  return (
    <div className="min-h-screen bg-stone-50 pb-24 font-sans flex flex-col relative">
         <TopHeader onNavigate={setCurrentView} onSignOut={onSignOut} />
         
         {/* Render Loading Overlay if app is re-initializing/syncing */}
         {isInitializing && (
             <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                 <Loader2 className="animate-spin text-teal-600 w-8 h-8" />
             </div>
         )}

         {currentView === 'HOME' && (
             <div className="max-w-xl w-full mx-auto p-5 space-y-6 animate-in fade-in">
                 <h1 className="text-3xl font-bold">Hello, {profile.username || 'Friend'}</h1>
                 
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                     <div className="flex justify-between items-start mb-4">
                         <div>
                            <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Current Stage</span>
                            <h2 className="text-xl font-bold mt-1">{lifeState.currentStage}</h2>
                         </div>
                         <button onClick={() => { setLifeState(null); setCurrentStepId('welcome'); setStepHistory([]); }} className="text-teal-600 text-xs font-bold bg-teal-50 px-3 py-1.5 rounded-lg">Edit</button>
                     </div>
                     <p className="text-stone-600 text-sm bg-stone-50 p-3 rounded-xl mb-4">{lifeState.explanation}</p>
                     <LifeStageTimeline current={lifeState.currentStage} previous={lifeState.previousStage} next={lifeState.nextStagePrediction} confidence={'High'} language={settings.language} />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setCurrentView('SCHEMES')} className="bg-indigo-50 p-6 rounded-3xl text-left hover:scale-[1.02] transition">
                        <FileText className="text-indigo-500 mb-3" />
                        <div className="font-bold text-indigo-900">Schemes</div>
                        <div className="text-xs text-indigo-400">Government Support</div>
                     </button>
                     <button onClick={() => setCurrentView('CHAT')} className="bg-teal-50 p-6 rounded-3xl text-left hover:scale-[1.02] transition">
                        <MessageCircle className="text-teal-500 mb-3" />
                        <div className="font-bold text-teal-900">Assistant</div>
                        <div className="text-xs text-teal-400">Ask anything</div>
                     </button>
                 </div>
             </div>
         )}

         {currentView === 'SCHEMES' && (
             <div className="max-w-xl w-full mx-auto p-5">
                 <h1 className="text-2xl font-bold mb-4">Eligible Schemes</h1>
                 <button onClick={async () => {
                     setIsInitializing(true);
                     const res = await getEligibleSchemes(profile, lifeState.currentStage, settings.language);
                     setSchemeData(res);
                     setIsInitializing(false);
                 }} className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold mb-6">Check Eligibility</button>
                 
                 {schemeData?.schemes?.map((s, i) => <div key={i} className="mb-4"><SchemeCard scheme={s} t={t} /></div>)}
                 {!schemeData && <div className="text-center py-10 text-stone-400">Tap check to find schemes.</div>}
             </div>
         )}
         
         {currentView === 'CHAT' && (
             <div className="flex flex-col h-[80vh] max-w-xl mx-auto p-4">
                 <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-white rounded-3xl border border-stone-100 mb-4">
                     {activeChatId && chats[activeChatId]?.messages.map((m, i) => (
                         <div key={i} className={`p-3 rounded-xl max-w-[80%] text-sm ${m.role === 'user' ? 'bg-stone-900 text-white self-end ml-auto' : 'bg-stone-100 text-stone-800'}`}>{m.content}</div>
                     ))}
                 </div>
                 <div className="flex gap-2">
                     <input className="flex-1 p-3 rounded-xl border" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type..." />
                     <button onClick={handleSendMessage} className="bg-teal-600 text-white p-3 rounded-xl"><Send size={20}/></button>
                 </div>
             </div>
         )}

        {currentView === 'PROFILE' && (
            <div className="max-w-xl w-full mx-auto p-5 space-y-6">
                <h1 className="text-2xl font-bold">Profile</h1>
                <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-4">
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-stone-500">Username</span>
                        <span className="font-bold">{profile.username}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-stone-500">Gender</span>
                        <span className="font-bold">{profile.primaryUser.gender}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-stone-500">Occupation</span>
                        <span className="font-bold">{profile.primaryUser.occupationType}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-500">State</span>
                        <span className="font-bold">{profile.primaryUser.state}</span>
                    </div>
                </div>
                <button onClick={() => { setLifeState(null); setCurrentStepId('welcome'); }} className="w-full py-4 bg-stone-100 font-bold rounded-xl text-stone-600">Edit Family Details</button>
            </div>
        )}

         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 flex justify-around">
            {['HOME', 'SCHEMES', 'CHAT', 'PROFILE'].map((v: any) => (
                <button key={v} onClick={() => setCurrentView(v)} className={`p-2 ${currentView === v ? 'text-teal-600' : 'text-stone-400'}`}>
                    {v === 'HOME' && <Home size={24} />}
                    {v === 'SCHEMES' && <FileText size={24} />}
                    {v === 'CHAT' && <MessageCircle size={24} />}
                    {v === 'PROFILE' && <UserIcon size={24} />}
                </button>
            ))}
         </div>
    </div>
  );
};
