
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Activity, Heart, Info, Loader2, Trash2, User as UserIcon, Check, ChevronRight, X, MessageCircle, Send, Plus, History, Cloud, LogOut, Lock, ScrollText, AlertTriangle, Clock, ArrowLeft, ArrowRight, Pause, Play, Download, Mic, Volume2, Globe, Sparkles, Shield, Users, Home, FileText, User, Edit2, Mail, Key, ShieldCheck, XCircle, Zap, Menu, AlertCircle, RefreshCw, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Briefcase, Star, GraduationCap, Building2, MapPin, Accessibility, Coffee, Baby } from 'lucide-react';
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

const LANGUAGES: AppLanguage[] = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

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
    const [isExpanded, setIsExpanded] = useState(false);

    // Helper for tags
    const getModeColor = (mode?: string) => {
        if (!mode) return 'bg-stone-100 text-stone-600';
        if (mode.toLowerCase().includes('online')) return 'bg-blue-50 text-blue-700';
        if (mode.toLowerCase().includes('assisted')) return 'bg-purple-50 text-purple-700';
        return 'bg-amber-50 text-amber-700';
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            {/* Header Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-stone-100 text-stone-600 tracking-wider">
                    {scheme.category || 'General'}
                </span>
                {scheme.applicationMode && (
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getModeColor(scheme.applicationMode)}`}>
                        {scheme.applicationMode}
                    </span>
                )}
            </div>

            <h4 className="font-bold text-stone-900 text-lg mb-1 leading-tight">{scheme.name}</h4>

            {/* Beneficiary Info */}
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-3 font-medium">
                <UserIcon size={12} />
                <span>For: {scheme.beneficiary || 'Family'}</span>
            </div>

            <p className="text-stone-600 text-sm mb-4 leading-relaxed">{scheme.description}</p>

            {/* Expandable Section */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-stone-50 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors"
            >
                <span>{isExpanded ? t.common?.close || 'Close' : t.schemes.howToApply || 'How to Apply'}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExpanded && (
                <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-2">
                    {/* How to Apply */}
                    <div>
                        <h5 className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-2">{t.schemes.howToApply || 'How to Apply'}</h5>
                        {scheme.applicationProcess && scheme.applicationProcess.length > 0 ? (
                            <ol className="list-decimal pl-4 space-y-2">
                                {scheme.applicationProcess.map((step, idx) => (
                                    <li key={idx} className="text-sm text-stone-600 pl-1 marker:font-bold marker:text-stone-400">{step}</li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-sm text-stone-500 italic">No specific steps available.</p>
                        )}
                    </div>

                    {/* Documents */}
                    {scheme.requiredDocuments && scheme.requiredDocuments.length > 0 && (
                        <div>
                            <h5 className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-2">Documents Usually Required</h5>
                            <div className="flex flex-wrap gap-2">
                                {scheme.requiredDocuments.map((doc, idx) => (
                                    <span key={idx} className="bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg text-xs text-stone-600 flex items-center gap-1">
                                        <FileText size={10} className="text-stone-400" />
                                        {doc}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Why Suggested */}
                    {scheme.eligibilityReason && (
                        <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                            <h5 className="text-[10px] font-bold text-teal-800 uppercase tracking-widest mb-1">{t.schemes.whySuggested || 'Why this fits'}</h5>
                            <p className="text-xs text-teal-700 italic">{scheme.eligibilityReason}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// --- TOP HEADER ---
const TopHeader: React.FC<{
    onNavigate: (view: 'PROFILE' | 'SETTINGS') => void,
    onSignOut: () => void,
    currentLanguage: AppLanguage,
    onLanguageChange: (lang: AppLanguage) => void
}> = ({ onNavigate, onSignOut, currentLanguage, onLanguageChange }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [langMenuOpen, setLangMenuOpen] = useState(false);

    return (
        <header className="bg-white/60 backdrop-blur-xl sticky top-0 z-40 border-b border-white/50 px-6 py-4 flex justify-between items-center shadow-sm">
            <div className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent tracking-tight cursor-pointer" onClick={() => onNavigate('PROFILE')}>ConnectiVita</div>

            <div className="flex items-center gap-3">
                {/* Language Selector */}
                <div className="relative">
                    <button
                        onClick={() => setLangMenuOpen(!langMenuOpen)}
                        className="w-10 h-10 rounded-full bg-white/50 border border-white/60 flex items-center justify-center text-stone-600 hover:bg-white hover:shadow-md transition-all duration-300"
                        title="Change Language"
                    >
                        <Globe size={20} />
                    </button>

                    {langMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)}></div>
                            <div className="absolute right-0 top-12 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-2">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => { onLanguageChange(lang); setLangMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-between ${currentLanguage === lang ? 'bg-teal-50 text-teal-700' : 'text-stone-600 hover:bg-stone-50'}`}
                                    >
                                        {lang}
                                        {currentLanguage === lang && <Check size={16} className="text-teal-600" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Profile Menu */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-200 flex items-center justify-center hover:scale-105 transition-transform"
                    >
                        <UserIcon size={20} />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                            <div className="absolute right-0 top-12 w-52 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-2">
                                <button onClick={() => { onNavigate('PROFILE'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-teal-50 rounded-xl flex items-center gap-3 transition-colors">
                                    <UserIcon size={18} className="text-teal-600" /> Profile
                                </button>
                                <button onClick={() => { onNavigate('SETTINGS'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-teal-50 rounded-xl flex items-center gap-3 transition-colors">
                                    <Settings size={18} className="text-teal-600" /> Settings
                                </button>
                                <div className="border-t border-stone-100 my-2"></div>
                                <button onClick={onSignOut} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl flex items-center gap-3 transition-colors">
                                    <LogOut size={18} /> Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
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
    const [currentView, setCurrentView] = useState<'HOME' | 'SCHEMES' | 'CHAT' | 'PROFILE' | 'SETTINGS' | 'EDIT_FAMILY'>('HOME');
    const [editingMember, setEditingMember] = useState<{ section: string, index: number } | null>(null);
    const [tempMemberData, setTempMemberData] = useState<FamilyMember>({});
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
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Schemes State
    const [activeSchemeTab, setActiveSchemeTab] = useState<string>('You');
    const [isSchemeLoading, setIsSchemeLoading] = useState(false);

    // @ts-ignore
    const t = TRANSLATIONS[settings.language] || TRANSLATIONS['English'];

    // History State
    // const [historyEntries, setHistoryEntries] = useState<SnapshotUpdateEntry[]>([]);  <-- KEEPING ONE INSTANCE
    // Actually, I will just delete the redundant lines.

    // History State
    const [historyEntries, setHistoryEntries] = useState<SnapshotUpdateEntry[]>([]);
    const [chats, setChats] = useState<Record<string, ChatSession>>({});    // Restore missing chats state
    const [showJourney, setShowJourney] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

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

        // Fetch History / Journey Entries
        const historyRef = collection(db, 'households', deviceId, 'history');
        // Ensure we catch errors if index missing or collection empty
        const unsubHistory = onSnapshot(query(historyRef, orderBy('timestamp', 'desc')), (snap) => {
            const entries = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SnapshotUpdateEntry[];
            setHistoryEntries(entries);
        }, (err) => {
            console.log("History sync error (likely no collection yet):", err);
        });

        // Fetch Chats
        const chatsRef = collection(db, 'households', deviceId, 'chats');
        const unsubChats = onSnapshot(query(chatsRef, orderBy('timestamp', 'desc')), (snap) => {
            const loadedChats: Record<string, ChatSession> = {};
            snap.docs.forEach(d => {
                const data = d.data() as ChatSession;
                // Ensure ID is set
                loadedChats[d.id] = { ...data, id: d.id };
            });
            setChats(loadedChats);
        });

        return () => {
            unsubHousehold();
            unsubHistory();
            unsubChats();
        };
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
        // --- HELPER: Occupation Flow Logic ---
        // Returns the next step relative to the current sub-step of occupation
        // prefixes: p (primary), s (spouse), c (child), pa (parent), sib (sibling)
        const getNextOccStep = (prefix: string, currentSubStep: string, memberData: any): string | null => {
            // Entry point is usually '{prefix}_status'
            if (currentSubStep === 'status') {
                if (memberData?.occupationType === 'Student') return `${prefix}_student_level`;
                if (memberData?.occupationType === 'Working') return `${prefix}_work_sector`;
                // If neither (unemployed/homemaker/retired), go to Income (only for Primary/Spouse/Parent usually) or next section
                return null;
            }

            // Student Path
            if (currentSubStep === 'student_level') {
                if (memberData?.studentLevel === 'School') return `${prefix}_student_grade`;
                if (memberData?.studentLevel === 'College') return `${prefix}_student_course`;
                return null; // 'Other' or done
            }
            if (currentSubStep === 'student_grade') return null;
            if (currentSubStep === 'student_course') return `${prefix}_student_year`;
            if (currentSubStep === 'student_year') return null;

            // Working Path
            if (currentSubStep === 'work_sector') {
                if (memberData?.occupationSector === 'Government') return `${prefix}_govt_role`;
                if (memberData?.occupationSector === 'Other') return `${prefix}_work_role_desc`; // Hypothetical, user said "Describe role" if Other but usually implied in Govt. 
                // User req: "If Government: ... -> If Other: Describe"
                // We will simplify: If Govt -> Role. If Role == Other -> Describe.
                return `${prefix}_income`; // Go to income for working people
            }
            if (currentSubStep === 'govt_role') {
                if (memberData?.govtRole === 'Other Government Role') return `${prefix}_govt_role_desc`;
                return `${prefix}_income`;
            }
            if (currentSubStep === 'govt_role_desc') return `${prefix}_income`;

            // Income is usually the end of the work flow for that person
            if (currentSubStep === 'income') return null;

            return null;
        };

        // 1. Account Setup
        if (current === 'welcome') return 'account_setup';
        if (current === 'account_setup') return 'p_gender';

        // 2. Primary User ('You')
        if (current === 'p_gender') return 'p_age';
        if (current === 'p_age') return 'p_qual';
        if (current === 'p_qual') {
            // Cond: Female + Reprod Age (18-45) -> Pregnant?
            const isFemale = profile.primaryUser.gender === 'Female';
            const age = Number(profile.primaryUser.age);
            if (isFemale && age >= 18 && age <= 45) return 'p_pregnant';
            return 'p_status';
        }
        if (current === 'p_pregnant') return 'p_status';

        // Primary Occ Flow
        if (current.startsWith('p_') && !['p_disability', 'p_location', 'p_residence', 'p_marital'].includes(current)) {
            // We are in occupation/education flow
            const sub = current.replace('p_', '');
            const nextSub = getNextOccStep('p', sub, profile.primaryUser);
            if (nextSub) return nextSub;
            // If flow ended, go to Disability
            return 'p_disability';
        }

        if (current === 'p_disability') return 'p_location';
        if (current === 'p_location') return 'p_residence';
        if (current === 'p_residence') return 'p_marital';

        // 3. Spouse Section
        if (current === 'p_marital') {
            if (profile.primaryUser.maritalStatus === 'Married') return 's_alive';
            return 'c_check'; // Skip to children
        }
        if (current === 's_alive') {
            if (profile.spouse?.isAlive) return 's_age';
            return 'c_check';
        }
        if (current === 's_age') return 's_qual';
        if (current === 's_qual') return 's_status';

        // Spouse Occ Flow
        if (current.startsWith('s_') && !['s_disability', 's_pregnant'].includes(current)) {
            const sub = current.replace('s_', '');
            const nextSub = getNextOccStep('s', sub, profile.spouse);
            if (nextSub) return nextSub;

            // Spouse Pregnancy Check: Primary Male + Spouse 18-45
            const pMale = profile.primaryUser.gender === 'Male';
            const sAge = Number(profile.spouse?.age);
            if (pMale && sAge >= 18 && sAge <= 45) return 's_pregnant';
            return 's_disability';
        }

        if (current === 's_pregnant') return 's_disability';
        if (current === 's_disability') return 'c_check';

        // 4. Children Section
        if (current === 'c_check') return 'c_count';
        if (current === 'c_count') {
            if (totalChildren > 0) {
                setCurrentChildIndex(0);
                return 'child_loop_age';
            }
            return 'pa_check';
        }

        // Child Loop
        if (current === 'child_loop_age') return 'child_loop_qual';
        if (current === 'child_loop_qual') return 'child_loop_gender';
        if (current === 'child_loop_gender') {
            if (profile.children?.[currentChildIndex]?.qualification === "Not Joined school yet") return 'child_loop_disability';
            return 'child_loop_status';
        }

        // Child Occ Flow
        if (current.startsWith('child_loop_') && !['child_loop_disability'].includes(current)) {
            // Handle the dynamic occ flow for current child
            const sub = current.replace('child_loop_', '');
            // Special handling because 'status' maps to 'occupationType' in helper logic but string is simpler
            const nextSub = getNextOccStep('child_loop', sub, profile.children?.[currentChildIndex]);
            if (nextSub) return nextSub;
            return 'child_loop_disability';
        }

        if (current === 'child_loop_disability') {
            if (currentChildIndex < totalChildren - 1) {
                setCurrentChildIndex(prev => prev + 1);
                return 'child_loop_age';
            }
            return 'pa_check';
        }

        // 5. Parents Section
        if (current === 'pa_check') {
            if (parentIterators.length > 0) {
                setCurrentParentIndex(0);
                return 'parent_loop_age';
            }
            return 'sib_check';
        }

        // Parent Loop
        if (current === 'parent_loop_age') return 'parent_loop_qual';
        if (current === 'parent_loop_qual') return 'parent_loop_status';

        // Parent Occ Flow
        if (current.startsWith('parent_loop_') && !['parent_loop_disability'].includes(current)) {
            const sub = current.replace('parent_loop_', '');
            const nextSub = getNextOccStep('parent_loop', sub, profile.parents?.[currentParentIndex]);
            if (nextSub) return nextSub;
            return 'parent_loop_disability';
        }

        if (current === 'parent_loop_disability') {
            if (currentParentIndex < parentIterators.length - 1) {
                setCurrentParentIndex(prev => prev + 1);
                return 'parent_loop_age';
            }
            return 'sib_check';
        }

        // 6. Siblings Section
        if (current === 'sib_check') return 'sib_count';
        if (current === 'sib_count') {
            if (totalSiblings > 0) {
                setCurrentSiblingIndex(0);
                return 'sib_loop_gender';
            }
            return 'social_cat';
        }

        // Sibling Loop
        if (current === 'sib_loop_gender') return 'sib_loop_age';
        if (current === 'sib_loop_age') return 'sib_loop_qual';

        if (current === 'sib_loop_qual') {
            // Sibling pregnancy check? "If female sibling of reproductive age"
            const s = profile.siblings?.[currentSiblingIndex];
            const isFemale = s?.gender === 'Female';
            const age = Number(s?.age);
            if (isFemale && age >= 18 && age <= 45) return 'sib_loop_pregnant';
            return 'sib_loop_marital';
        }

        if (current === 'sib_loop_pregnant') return 'sib_loop_marital';
        if (current === 'sib_loop_marital') return 'sib_loop_status';

        // Sibling Occ Flow
        if (current.startsWith('sib_loop_') && !['sib_loop_disability'].includes(current)) {
            const sub = current.replace('sib_loop_', '');
            const nextSub = getNextOccStep('sib_loop', sub, profile.siblings?.[currentSiblingIndex]);
            if (nextSub) return nextSub;
            return 'sib_loop_disability';
        }

        if (current === 'sib_loop_disability') {
            if (currentSiblingIndex < totalSiblings - 1) {
                setCurrentSiblingIndex(prev => prev + 1);
                return 'sib_loop_gender';
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

        // --- REUSABLE OCCUPATION FLOW RENDERER ---
        const renderOccFlow = (prefix: string, personName: string, data: any, updateFn: (k: keyof FamilyMember, v: any) => void) => {
            if (currentStepId === `${prefix}_status`) return (
                <WizardScreen title={`Is ${personName} a student or working?`} progress={{ current: 5, total: 15 }} canProceed={!!data?.occupationType} onNext={handleNext} onBack={handleBack} t={t}>
                    {['Student', 'Working', 'Unemployed', 'Homemaker', 'Retired'].map(s => <WizardOptionButton key={s} label={s} selected={data?.occupationType === s} onClick={() => updateFn('occupationType', s)} />)}
                </WizardScreen>
            );

            // Student Flow
            if (currentStepId === `${prefix}_student_level`) return (
                <WizardScreen title={`What level is ${personName} studying at?`} progress={{ current: 6, total: 15 }} canProceed={!!data?.studentLevel} onNext={handleNext} onBack={handleBack} t={t}>
                    {['School', 'College', 'Other'].map(s => <WizardOptionButton key={s} label={s} selected={data?.studentLevel === s} onClick={() => updateFn('studentLevel', s)} />)}
                </WizardScreen>
            );
            if (currentStepId === `${prefix}_student_grade`) return (
                <WizardScreen title={`What grade is ${personName} in?`} progress={{ current: 6, total: 15 }} canProceed={!!data?.studentGrade} onNext={handleNext} onBack={handleBack} t={t}>
                    <input className="w-full p-4 border rounded-xl" placeholder="e.g. 5th Grade, 10th Standard" value={data?.studentGrade || ''} onChange={e => updateFn('studentGrade', e.target.value)} autoFocus />
                </WizardScreen>
            );
            if (currentStepId === `${prefix}_student_course`) return (
                <WizardScreen title={`What course is ${personName} doing?`} progress={{ current: 6, total: 15 }} canProceed={!!data?.studentCourse} onNext={handleNext} onBack={handleBack} t={t}>
                    <input className="w-full p-4 border rounded-xl" placeholder="e.g. B.Tech, B.Sc, Arts" value={data?.studentCourse || ''} onChange={e => updateFn('studentCourse', e.target.value)} autoFocus />
                </WizardScreen>
            );
            if (currentStepId === `${prefix}_student_year`) return (
                <WizardScreen title={`Which year?`} progress={{ current: 6, total: 15 }} canProceed={!!data?.studentYear} onNext={handleNext} onBack={handleBack} t={t}>
                    <input className="w-full p-4 border rounded-xl" placeholder="e.g. 1st Year, Final Year" value={data?.studentYear || ''} onChange={e => updateFn('studentYear', e.target.value)} autoFocus />
                </WizardScreen>
            );

            // Working Flow
            if (currentStepId === `${prefix}_work_sector`) return (
                <WizardScreen title={`Which sector does ${personName} work in?`} progress={{ current: 6, total: 15 }} canProceed={!!data?.occupationSector} onNext={handleNext} onBack={handleBack} t={t}>
                    {SECTORS.map(s => <WizardOptionButton key={s} label={s} selected={data?.occupationSector === s} onClick={() => updateFn('occupationSector', s)} />)}
                </WizardScreen>
            );
            if (currentStepId === `${prefix}_govt_role`) return (
                <WizardScreen title="Which type of government job?" progress={{ current: 6, total: 15 }} canProceed={!!data?.govtRole} onNext={handleNext} onBack={handleBack} t={t}>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {GOVERNMENT_ROLES.map(r => <WizardOptionButton key={r} label={r} selected={data?.govtRole === r} onClick={() => updateFn('govtRole', r)} />)}
                    </div>
                </WizardScreen>
            );
            if (currentStepId === `${prefix}_govt_role_desc` || currentStepId === `${prefix}_work_role_desc`) return (
                <WizardScreen title="Describe the role" progress={{ current: 6, total: 15 }} canProceed={!!data?.govtRole} onNext={handleNext} onBack={handleBack} t={t}>
                    <input className="w-full p-4 border rounded-xl" placeholder="Describe current role" value={data?.govtRole || ''} onChange={e => updateFn('govtRole', e.target.value)} autoFocus />
                </WizardScreen>
            );
            if (currentStepId === `${prefix}_income`) return (
                <WizardScreen title={`Which income range fits ${personName} best?`} progress={{ current: 6, total: 15 }} canProceed={!!data?.incomeRange} onNext={handleNext} onBack={handleBack} t={t}>
                    {INCOME_RANGES.map(r => <WizardOptionButton key={r} label={r} selected={data?.incomeRange === r} onClick={() => updateFn('incomeRange', r)} />)}
                </WizardScreen>
            );

            return null;
        };

        // 1. WELCOME & SCOPE
        if (currentStepId === 'welcome') return (
            <div className="space-y-6 text-center animate-in fade-in">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-4"><Activity size={32} /></div>
                <h1 className="text-2xl font-bold">{t.wizard.welcomeTitle}</h1>
                <p className="text-stone-500">{t.wizard.welcomeSubtitle}</p>
                <button onClick={handleNext} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold">{t.wizard.continue}</button>
            </div>
        );

        if (currentStepId === 'account_setup') return (
            <WizardScreen title="Who is this account for?" progress={{ current: 1, total: 15 }} canProceed={!!profile.accountScope} onNext={handleNext} onBack={handleBack} t={t}>
                {['Myself', 'My Family'].map(opt => (
                    <WizardOptionButton key={opt} label={opt === 'Myself' ? 'Only for myself' : 'For myself and family'} selected={profile.accountScope === (opt === 'My Family' ? 'Family' : 'Myself')} onClick={() => setProfile(p => ({ ...p, accountScope: opt === 'My Family' ? 'Family' : 'Myself' }))} />
                ))}
            </WizardScreen>
        );

        // 2. PRIMARY USER
        if (currentStepId === 'p_gender') return (
            <WizardScreen title={t.wizard.genderTitle} progress={{ current: 2, total: 15 }} canProceed={!!profile.primaryUser.gender} onNext={handleNext} onBack={handleBack} t={t}>
                {['Male', 'Female', 'Other'].map(opt => <WizardOptionButton key={opt} label={opt} selected={profile.primaryUser.gender === opt} onClick={() => updatePrimary('gender', opt)} />)}
            </WizardScreen>
        );
        if (currentStepId === 'p_age') return (
            <WizardScreen title={t.wizard.ageTitle} progress={{ current: 3, total: 15 }} canProceed={!!profile.primaryUser.age} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl text-lg" placeholder="Age" value={profile.primaryUser.age || ''} onChange={e => updatePrimary('age', e.target.value)} autoFocus />
            </WizardScreen>
        );
        if (currentStepId === 'p_qual') return (
            <WizardScreen title="Your Highest Qualification?" progress={{ current: 4, total: 15 }} canProceed={!!profile.primaryUser.qualification} onNext={handleNext} onBack={handleBack} t={t}>
                {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.primaryUser.qualification === q} onClick={() => updatePrimary('qualification', q)} />)}
            </WizardScreen>
        );
        if (currentStepId === 'p_pregnant') return (
            <WizardScreen title="Are you currently pregnant?" progress={{ current: 5, total: 15 }} canProceed={profile.primaryUser.isPregnant !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Yes" selected={profile.primaryUser.isPregnant === true} onClick={() => updatePrimary('isPregnant', true)} />
                <WizardOptionButton label="No" selected={profile.primaryUser.isPregnant === false} onClick={() => updatePrimary('isPregnant', false)} />
            </WizardScreen>
        );

        // Check for Primary Occupation Flow
        const pOcc = renderOccFlow('p', 'you', profile.primaryUser, updatePrimary);
        if (pOcc) return pOcc;

        if (currentStepId === 'p_disability') return (
            <WizardScreen title="Do you have any disability?" progress={{ current: 9, total: 15 }} canProceed={!!profile.primaryUser.disability} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="No" selected={profile.primaryUser.disability === 'No'} onClick={() => updatePrimary('disability', 'No')} />
                <WizardOptionButton label="Yes" selected={profile.primaryUser.disability === 'Yes'} onClick={() => updatePrimary('disability', 'Yes')} />
            </WizardScreen>
        );
        if (currentStepId === 'p_location') return (
            <WizardScreen title="Which state do you live in?" progress={{ current: 10, total: 15 }} canProceed={!!profile.primaryUser.state} onNext={handleNext} onBack={handleBack} t={t}>
                <select className="w-full p-4 rounded-xl border bg-white" value={profile.primaryUser.state || ''} onChange={e => updatePrimary('state', e.target.value)}>
                    <option value="">Select State</option>
                    {STATES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </WizardScreen>
        );
        if (currentStepId === 'p_residence') return (
            <WizardScreen title="Residence Area Type" progress={{ current: 11, total: 15 }} canProceed={!!profile.primaryUser.residenceType} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Urban (City/Town)" selected={profile.primaryUser.residenceType === 'Urban'} onClick={() => updatePrimary('residenceType', 'Urban')} />
                <WizardOptionButton label="Rural (Village)" selected={profile.primaryUser.residenceType === 'Rural'} onClick={() => updatePrimary('residenceType', 'Rural')} />
            </WizardScreen>
        );
        if (currentStepId === 'p_marital') return (
            <WizardScreen title="Marital Status" progress={{ current: 12, total: 15 }} canProceed={!!profile.primaryUser.maritalStatus} onNext={handleNext} onBack={handleBack} t={t}>
                {['Single', 'Married', 'Divorced', 'Widowed'].map(s => <WizardOptionButton key={s} label={s} selected={profile.primaryUser.maritalStatus === s} onClick={() => updatePrimary('maritalStatus', s)} />)}
            </WizardScreen>
        );

        // 3. SPOUSE
        if (currentStepId === 's_alive') return (
            <WizardScreen title="Is your spouse currently alive?" progress={{ current: 12, total: 15 }} canProceed={profile.spouse?.isAlive !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Yes" selected={profile.spouse?.isAlive === true} onClick={() => updateSpouse('isAlive', true)} />
                <WizardOptionButton label="No" selected={profile.spouse?.isAlive === false} onClick={() => updateSpouse('isAlive', false)} />
            </WizardScreen>
        );
        if (currentStepId === 's_age') return (
            <WizardScreen title="Spouse's Age" progress={{ current: 13, total: 15 }} canProceed={!!profile.spouse?.age} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.spouse?.age || ''} onChange={e => updateSpouse('age', e.target.value)} autoFocus />
            </WizardScreen>
        );
        if (currentStepId === 's_qual') return (
            <WizardScreen title="Spouse's Highest Qualification?" progress={{ current: 13, total: 15 }} canProceed={!!profile.spouse?.qualification} onNext={handleNext} onBack={handleBack} t={t}>
                {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.spouse?.qualification === q} onClick={() => updateSpouse('qualification', q)} />)}
            </WizardScreen>
        );

        // Spouse Occ Flow
        const sOcc = renderOccFlow('s', 'your spouse', profile.spouse, updateSpouse);
        if (sOcc) return sOcc;

        if (currentStepId === 's_disability') return (
            <WizardScreen title="Does your spouse have any disability?" progress={{ current: 13, total: 15 }} canProceed={!!profile.spouse?.disability} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="No" selected={profile.spouse?.disability === 'No'} onClick={() => updateSpouse('disability', 'No')} />
                <WizardOptionButton label="Yes" selected={profile.spouse?.disability === 'Yes'} onClick={() => updateSpouse('disability', 'Yes')} />
            </WizardScreen>
        );
        if (currentStepId === 's_pregnant') return (
            <WizardScreen title="Is your wife currently pregnant?" progress={{ current: 13, total: 15 }} canProceed={profile.spouse?.isPregnant !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Yes" selected={profile.spouse?.isPregnant === true} onClick={() => updateSpouse('isPregnant', true)} />
                <WizardOptionButton label="No" selected={profile.spouse?.isPregnant === false} onClick={() => updateSpouse('isPregnant', false)} />
            </WizardScreen>
        );

        // 4. CHILDREN (Loop)
        if (currentStepId === 'c_check') return (
            <WizardScreen title="Do you have children?" progress={{ current: 14, total: 15 }} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Yes" selected={false} onClick={() => { setTotalChildren(1); handleNext(); }} />
                <WizardOptionButton label="No" selected={false} onClick={() => { setTotalChildren(0); setCurrentStepId('pa_check'); }} />
            </WizardScreen>
        );
        if (currentStepId === 'c_count') return (
            <WizardScreen title="How many children do you have?" progress={{ current: 14, total: 15 }} canProceed={totalChildren > 0} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl" value={totalChildren || ''} onChange={e => setTotalChildren(Number(e.target.value))} autoFocus />
            </WizardScreen>
        );
        // Loop Steps
        if (currentStepId === 'child_loop_age') return (
            <WizardScreen title={`Child ${currentChildIndex + 1}: Age?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.children?.[currentChildIndex]?.age} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.children?.[currentChildIndex]?.age || ''} onChange={e => updateChild(currentChildIndex, 'age', e.target.value)} autoFocus />
            </WizardScreen>
        );
        if (currentStepId === 'child_loop_qual') return (
            <WizardScreen title={`Child ${currentChildIndex + 1}: Highest Qualification?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.children?.[currentChildIndex]?.qualification} onNext={handleNext} onBack={handleBack} t={t}>
                {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.children?.[currentChildIndex]?.qualification === q} onClick={() => updateChild(currentChildIndex, 'qualification', q)} />)}
            </WizardScreen>
        );
        if (currentStepId === 'child_loop_gender') return (
            <WizardScreen title={`Child ${currentChildIndex + 1}: Gender?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.children?.[currentChildIndex]?.gender} onNext={handleNext} onBack={handleBack} t={t}>
                {['Male', 'Female'].map(g => <WizardOptionButton key={g} label={g} selected={profile.children?.[currentChildIndex]?.gender === g} onClick={() => updateChild(currentChildIndex, 'gender', g)} />)}
            </WizardScreen>
        );

        // Child Occ Flow
        const cOcc = renderOccFlow('child_loop', `child ${currentChildIndex + 1}`, profile.children?.[currentChildIndex], (k, v) => updateChild(currentChildIndex, k, v));
        if (cOcc) return cOcc;

        if (currentStepId === 'child_loop_disability') return (
            <WizardScreen title={`Does Child ${currentChildIndex + 1} have any disability?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.children?.[currentChildIndex]?.disability} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="No" selected={profile.children?.[currentChildIndex]?.disability === 'No'} onClick={() => updateChild(currentChildIndex, 'disability', 'No')} />
                <WizardOptionButton label="Yes" selected={profile.children?.[currentChildIndex]?.disability === 'Yes'} onClick={() => updateChild(currentChildIndex, 'disability', 'Yes')} />
            </WizardScreen>
        );

        // 5. PARENTS
        if (currentStepId === 'pa_check') return (
            <WizardScreen title="Are your parents alive?" progress={{ current: 14, total: 15 }} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Both Alive" selected={false} onClick={() => { setParentIterators(['Father', 'Mother']); handleNext(); }} />
                <WizardOptionButton label="One Alive" selected={false} onClick={() => {
                    // Assume we need to ask who
                    // For simplicity, let's ask who is passed away? Or just show options for who is alive.
                    // The prompt says "If One alive: Who is passed away?" which implies we select the LIVING one.
                }} />
                {/* Sub-menu implementation for One Alive is complex in one screen, let's do simple override or expand */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <WizardOptionButton label="Only Father Alive" selected={false} onClick={() => { setParentIterators(['Father']); handleNext(); }} />
                    <WizardOptionButton label="Only Mother Alive" selected={false} onClick={() => { setParentIterators(['Mother']); handleNext(); }} />
                </div>
                <WizardOptionButton label="Both Passed Away" selected={false} onClick={() => { setParentIterators([]); setCurrentStepId('sib_check'); }} />
            </WizardScreen>
        );
        if (currentStepId === 'parent_loop_age') return (
            <WizardScreen title={`What is your ${parentIterators[currentParentIndex]}'s age?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.parents?.[currentParentIndex]?.age} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.parents?.[currentParentIndex]?.age || ''} onChange={e => updateParent(currentParentIndex, 'age', e.target.value)} autoFocus />
            </WizardScreen>
        );
        if (currentStepId === 'parent_loop_qual') return (
            <WizardScreen title={`Highest Qualification of ${parentIterators[currentParentIndex]}?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.parents?.[currentParentIndex]?.qualification} onNext={handleNext} onBack={handleBack} t={t}>
                {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.parents?.[currentParentIndex]?.qualification === q} onClick={() => updateParent(currentParentIndex, 'qualification', q)} />)}
            </WizardScreen>
        );

        // Parent Occ Flow
        const paOcc = renderOccFlow('parent_loop', parentIterators[currentParentIndex], profile.parents?.[currentParentIndex], (k, v) => updateParent(currentParentIndex, k, v));
        if (paOcc) return paOcc;

        if (currentStepId === 'parent_loop_disability') return (
            <WizardScreen title={`Does your ${parentIterators[currentParentIndex]} have disability?`} progress={{ current: 14, total: 15 }} canProceed={!!profile.parents?.[currentParentIndex]?.disability} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="No" selected={profile.parents?.[currentParentIndex]?.disability === 'No'} onClick={() => updateParent(currentParentIndex, 'disability', 'No')} />
                <WizardOptionButton label="Yes" selected={profile.parents?.[currentParentIndex]?.disability === 'Yes'} onClick={() => updateParent(currentParentIndex, 'disability', 'Yes')} />
            </WizardScreen>
        );

        // 6. SIBLINGS
        if (currentStepId === 'sib_check') return (
            <WizardScreen title="Do you have siblings?" progress={{ current: 15, total: 15 }} canProceed={true} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Yes" selected={false} onClick={() => { setTotalSiblings(1); handleNext(); }} />
                <WizardOptionButton label="No" selected={false} onClick={() => { setTotalSiblings(0); setCurrentStepId('social_cat'); }} />
            </WizardScreen>
        );
        if (currentStepId === 'sib_count') return (
            <WizardScreen title="How many siblings?" progress={{ current: 15, total: 15 }} canProceed={totalSiblings > 0} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl" value={totalSiblings || ''} onChange={e => setTotalSiblings(Number(e.target.value))} autoFocus />
            </WizardScreen>
        );
        // Sibling Loop
        if (currentStepId === 'sib_loop_gender') return (
            <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: What is their gender?`} progress={{ current: 15, total: 15 }} canProceed={!!profile.siblings?.[currentSiblingIndex]?.gender} onNext={handleNext} onBack={handleBack} t={t}>
                {['Male', 'Female'].map(g => <WizardOptionButton key={g} label={g} selected={profile.siblings?.[currentSiblingIndex]?.gender === g} onClick={() => updateSibling(currentSiblingIndex, 'gender', g)} />)}
            </WizardScreen>
        );
        if (currentStepId === 'sib_loop_age') return (
            <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: Age?`} progress={{ current: 15, total: 15 }} canProceed={!!profile.siblings?.[currentSiblingIndex]?.age} onNext={handleNext} onBack={handleBack} t={t}>
                <input type="number" className="w-full p-4 border rounded-xl" placeholder="Age" value={profile.siblings?.[currentSiblingIndex]?.age || ''} onChange={e => updateSibling(currentSiblingIndex, 'age', e.target.value)} autoFocus />
            </WizardScreen>
        );
        if (currentStepId === 'sib_loop_qual') return (
            <WizardScreen title={`Sibling ${currentSiblingIndex + 1}: Highest qualification?`} progress={{ current: 15, total: 15 }} canProceed={!!profile.siblings?.[currentSiblingIndex]?.qualification} onNext={handleNext} onBack={handleBack} t={t}>
                {QUALIFICATIONS.map(q => <WizardOptionButton key={q} label={q} selected={profile.siblings?.[currentSiblingIndex]?.qualification === q} onClick={() => updateSibling(currentSiblingIndex, 'qualification', q)} />)}
            </WizardScreen>
        );
        if (currentStepId === 'sib_loop_pregnant') return (
            <WizardScreen title="Is your sister pregnant?" progress={{ current: 15, total: 15 }} canProceed={profile.siblings?.[currentSiblingIndex]?.isPregnant !== undefined} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="Yes" selected={profile.siblings?.[currentSiblingIndex]?.isPregnant === true} onClick={() => updateSibling(currentSiblingIndex, 'isPregnant', true)} />
                <WizardOptionButton label="No" selected={profile.siblings?.[currentSiblingIndex]?.isPregnant === false} onClick={() => updateSibling(currentSiblingIndex, 'isPregnant', false)} />
            </WizardScreen>
        );
        if (currentStepId === 'sib_loop_marital') return (
            <WizardScreen title={`Is Sibling ${currentSiblingIndex + 1} married?`} progress={{ current: 15, total: 15 }} canProceed={!!profile.siblings?.[currentSiblingIndex]?.maritalStatus} onNext={handleNext} onBack={handleBack} t={t}>
                {['Single', 'Married', 'Divorced', 'Widowed'].map(s => <WizardOptionButton key={s} label={s} selected={profile.siblings?.[currentSiblingIndex]?.maritalStatus === s} onClick={() => updateSibling(currentSiblingIndex, 'maritalStatus', s)} />)}
            </WizardScreen>
        );

        const sibOcc = renderOccFlow('sib_loop', `sibling ${currentSiblingIndex + 1}`, profile.siblings?.[currentSiblingIndex], (k, v) => updateSibling(currentSiblingIndex, k, v));
        if (sibOcc) return sibOcc;

        if (currentStepId === 'sib_loop_disability') return (
            <WizardScreen title={`Does Sibling ${currentSiblingIndex + 1} have disability?`} progress={{ current: 15, total: 15 }} canProceed={!!profile.siblings?.[currentSiblingIndex]?.disability} onNext={handleNext} onBack={handleBack} t={t}>
                <WizardOptionButton label="No" selected={profile.siblings?.[currentSiblingIndex]?.disability === 'No'} onClick={() => updateSibling(currentSiblingIndex, 'disability', 'No')} />
                <WizardOptionButton label="Yes" selected={profile.siblings?.[currentSiblingIndex]?.disability === 'Yes'} onClick={() => updateSibling(currentSiblingIndex, 'disability', 'Yes')} />
            </WizardScreen>
        );

        // 7. SOCIAL CATEGORY
        if (currentStepId === 'social_cat') return (
            <WizardScreen title="Do you belong to any of the following categories?" progress={{ current: 15, total: 15 }} canProceed={!!profile.socialCategory} onNext={handleNext} onBack={handleBack} t={t}>
                {SOCIAL_CATEGORIES.map(c => <WizardOptionButton key={c} label={c} selected={profile.socialCategory === c} onClick={() => setProfile(p => ({ ...p, socialCategory: c }))} />)}
            </WizardScreen>
        );

        // 8. SUMMARY & FINISH
        if (currentStepId === 'summary') return (
            <div className="space-y-6 animate-in fade-in">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-stone-800">{t.wizard.allSet}</h2>
                    <p className="text-stone-500">Review your family structure</p>
                    <div className="bg-stone-50 p-6 rounded-3xl mt-4 text-left space-y-2 border border-stone-200">
                        <p><strong>Primary:</strong> {profile.primaryUser.age}yo {profile.primaryUser.gender}, {profile.primaryUser.occupationType}</p>
                        {profile.spouse?.isAlive && <p><strong>Spouse:</strong> {profile.spouse.age}yo, {profile.spouse.occupationType}</p>}
                        <p><strong>Children:</strong> {totalChildren}</p>
                        <p><strong>Parents:</strong> {parentIterators.join(', ') || 'None'}</p>
                        <p><strong>Siblings:</strong> {totalSiblings}</p>
                    </div>
                </div>
                <button onClick={async () => {
                    setIsInitializing(true);
                    try {
                        // Update member count
                        const count = 1 + (profile.spouse?.isAlive ? 1 : 0) + (profile.children?.length || 0) + (profile.parents?.length || 0) + (profile.siblings?.length || 0);
                        // Use deepClean here to ensure NO circular references or DOM nodes are passed to Firestore
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

    const handleStartNewChat = () => {
        const newChatRef = doc(collection(db, 'households', deviceId, 'chats'));
        const newId = newChatRef.id;

        // Ensure we have a valid welcome message even if translation is loading
        const welcomeText = t.chat?.welcome || "Hello! I’m here to help with guidance and schemes based on your family’s current situation. You can ask me anything.";

        const welcomeMsg: ChatMessage = {
            role: 'model',
            content: welcomeText
        };

        const newSession: ChatSession = {
            id: newId,
            title: t.chat?.newChat || 'New Chat',
            messages: [welcomeMsg],
            timestamp: Date.now()
        };

        setChats(prev => ({ ...prev, [newId]: newSession }));
        setActiveChatId(newId);
    };

    // Auto-start new chat if none exists when entering CHAT view
    useEffect(() => {
        if (currentView === 'CHAT') {
            // Check if we have chats, but allow a small delay or check initializing to avoid premature creation?
            // Actually, locally 'chats' state should be reflective.
            // But if it's the very first render, chats might be empty because of async load.
            // We should rely on `isInitializing` which is set to false after initial sync.
            if (!isInitializing && Object.keys(chats).length === 0 && !activeChatId) {
                handleStartNewChat();
            }
        }
    }, [currentView, isInitializing, chats, activeChatId]);

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || chatInput;
        if (!textToSend.trim() || !lifeState) return;
        const userMsg: ChatMessage = { role: 'user', content: textToSend };

        let currentSessionId = activeChatId;
        let sessionData = activeChatId ? chats[activeChatId] : null;

        // If 'new' (from button) or null (fallback), start fresh
        if (!currentSessionId || currentSessionId === 'new' || !sessionData) {
            const newChatRef = doc(collection(db, 'households', deviceId, 'chats'));
            currentSessionId = newChatRef.id;

            // If we are "converting" the 'new' placeholder or a null state to real chat, 
            // we should preserve the specific welcome message if it was visible in the UI for 'new'.
            // But usually 'new' state in standard UI meant empty.
            // WITH THE NEW REQ: We usually already have a session created by handleStartNewChat.
            // So this block really only runs if they clicked "New Chat" button which might set ID to 'new' or if something deleted the chat.

            // Let's ensure we have a clean session structure
            sessionData = {
                id: currentSessionId,
                title: t.chat.newChat,
                messages: [], // We'll append user msg below. 
                // NOTE: If we want to persist the "Welcome" message that might have been shown, we should include it.
                // But typically user sends first prompt.
                timestamp: Date.now()
            };

            // If we are coming from a 'handleStartNewChat' session (which has a real ID), we wouldn't be in this 'if'.
            // This 'if' catches the case where activeChatId is 'new' (the button) or null.
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
                historyEntries // Pass the update history
            );

            const botMsg: ChatMessage = { role: 'model', content: botResponseText };
            const finalMessages = [...updatedMessages, botMsg];

            await setDoc(doc(db, 'households', deviceId, 'chats', currentSessionId), {
                ...sessionData,
                messages: finalMessages,
                timestamp: Date.now()
            });

            // Update local state again with bot response to ensure UI reflects it immediately
            setChats(prev => ({ ...prev, [currentSessionId!]: { ...sessionData!, messages: finalMessages } }));

        } catch (e) {
            console.error(e);
        } finally {
            setIsChatLoading(false);
        }
    };

    // --- LIFE UPDATE LOGIC ---
    const handleLifeUpdate = async () => {
        if (!updateInput.trim()) return;
        setIsUpdating(true);
        setUpdateSuccess(false);
        try {
            // 1. Detect changes in profile
            const profileUpdate = await detectProfileChanges(profile, updateInput, settings.language);

            // 2. Calculate new Life Stage based on updated profile
            // We use generateInitialSnapshot because it's a full re-assessment of the new state
            const newLifeStage = await generateInitialSnapshot(profileUpdate.newProfileState, settings.language);

            // 3. Save to Firestore
            const historyEntry: SnapshotUpdateEntry = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                date: new Date().toLocaleDateString(),
                user_input: updateInput,
                change_summary: profileUpdate.summary,
                life_stage: newLifeStage.currentStage
            };

            const batch = writeBatch(db);
            const householdRef = doc(db, 'households', deviceId);
            batch.update(householdRef, {
                profile: profileUpdate.newProfileState,
                lifeState: newLifeStage,
                updatedAt: Date.now()
            });

            const historyRef = doc(db, 'households', deviceId, 'history', historyEntry.id);
            batch.set(historyRef, historyEntry);

            await batch.commit();

            // 4. Reset & Success Feedback
            setUpdateInput('');
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 3000);

        } catch (e) {
            console.error("Update failed", e);
            alert("Could not update. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteHistory = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'households', deviceId, 'history', id));
            // Note: We don't revert the profile state automatically as it's complex to undo specific merges.
            // In a real app we might want to rebuild state from history, but for this feature requirement
            // we primarily maintain the log. The prompt says "Recalculate", but without a base state 
            // from the past, we can only recalculate based on *current* profile which wouldn't change.
            // So we effectively just remove the log entry here.
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm("This will remove all past updates. Your current snapshot will remain. Are you sure?")) return;

        try {
            setIsInitializing(true);
            const batch = writeBatch(db);
            historyEntries.forEach(entry => {
                const ref = doc(db, 'households', deviceId, 'history', entry.id);
                batch.delete(ref);
            });
            await batch.commit();
            setIsInitializing(false);
            alert("Update history cleared.");
        } catch (e) {
            console.error("Clear history failed", e);
            setIsInitializing(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("This will permanently delete your account and all family data. This action cannot be undone.")) return;

        try {
            setIsInitializing(true);
            await deleteDoc(doc(db, 'households', deviceId));
            await deleteUser(user);
            onSignOut();
        } catch (e) {
            console.error("Account delete failed", e);
            setIsInitializing(false);
            alert("Could not delete account. Use 'Sign Out' if you just want to exit.");
        }
    };



    // --- FOCUS AREAS LOGIC ---
    const determineFocusAreas = () => {
        const areas: { id: string, icon: any, title: string, desc: string, theme: string }[] = [];
        // @ts-ignore
        const txt = t.home?.focusAreaContent || TRANSLATIONS['English'].home.focusAreaContent;

        const hasPregnancy = profile.isPregnant;
        const hasChildren = profile.children && profile.children.length > 0;
        const hasSchoolAge = hasChildren && profile.children!.some(c => c.age && c.age >= 4 && c.age <= 18);
        const hasSeniors = (profile.parents && profile.parents.length > 0) || (profile.primaryUser?.age && profile.primaryUser.age >= 60) || (profile.spouse?.age && profile.spouse.age >= 60);
        // Working age assumption: Self or Spouse between 20 and 60
        const hasWorkingAge = (profile.primaryUser?.age && profile.primaryUser.age >= 20 && profile.primaryUser.age < 60) || (profile.spouse?.age && profile.spouse.age >= 20 && profile.spouse.age < 60);

        // Theme Maps
        // health: rose
        // education: sky
        // income: emerald
        // welfare: indigo
        // routine: amber
        // caregiver: violet

        // Logic Map
        // Pregnancy
        if (hasPregnancy) {
            areas.push({ id: 'health', icon: Heart, title: txt.health.title, desc: txt.health.desc, theme: 'bg-rose-50 border-rose-100 text-rose-900 icon-rose-500' });
            areas.push({ id: 'caregiver', icon: Coffee, title: txt.caregiver.title, desc: txt.caregiver.desc, theme: 'bg-violet-50 border-violet-100 text-violet-900 icon-violet-500' });
            areas.push({ id: 'routine', icon: Clock, title: txt.routine.title, desc: txt.routine.desc, theme: 'bg-amber-50 border-amber-100 text-amber-900 icon-amber-500' });
        }

        // School Age
        if (hasSchoolAge) {
            areas.push({ id: 'education', icon: GraduationCap, title: txt.education.title, desc: txt.education.desc, theme: 'bg-sky-50 border-sky-100 text-sky-900 icon-sky-500' });
            areas.push({ id: 'routine', icon: Clock, title: txt.routine.title, desc: txt.routine.desc, theme: 'bg-amber-50 border-amber-100 text-amber-900 icon-amber-500' });
        }

        // Seniors
        if (hasSeniors) {
            areas.push({ id: 'health', icon: Heart, title: txt.health.title, desc: txt.health.desc, theme: 'bg-rose-50 border-rose-100 text-rose-900 icon-rose-500' });
            areas.push({ id: 'welfare', icon: Shield, title: txt.welfare.title, desc: txt.welfare.desc, theme: 'bg-indigo-50 border-indigo-100 text-indigo-900 icon-indigo-500' });
        }

        // Working Age
        if (hasWorkingAge) {
            areas.push({ id: 'income', icon: Briefcase, title: txt.income.title, desc: txt.income.desc, theme: 'bg-emerald-50 border-emerald-100 text-emerald-900 icon-emerald-500' });
            areas.push({ id: 'welfare', icon: Shield, title: txt.welfare.title, desc: txt.welfare.desc, theme: 'bg-indigo-50 border-indigo-100 text-indigo-900 icon-indigo-500' });
        }

        // Dedup and Prioritize
        const uniqueAreas = new Map();
        areas.forEach(a => {
            if (!uniqueAreas.has(a.id)) {
                uniqueAreas.set(a.id, a);
            }
        });

        let finalAreas = Array.from(uniqueAreas.values());

        // Priority Sort Helper
        const priorityOrder = ['caregiver', 'health', 'education', 'income', 'welfare', 'routine'];
        finalAreas.sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id));

        // Limit to 4
        return finalAreas.slice(0, 4);
    };


    const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(t.chat?.deleteConfirm || "Delete this chat?")) return;

        try {
            await deleteDoc(doc(db, 'households', deviceId, 'chats', chatId));
            const newChats = { ...chats };
            delete newChats[chatId];
            setChats(newChats);
            if (activeChatId === chatId) setActiveChatId(null);
        } catch (e) {
            console.error("Failed to delete chat", e);
        }
    };


    const handleExplainFocusArea = (area: { title: string, desc: string }) => {
        // 1. Redirect to Chat
        setCurrentView('CHAT');

        // 2. Construct Prompt (System-like instruction but sent as user message for visibility)
        // We make it natural but instructional.
        // Rule: "Explain why the focus area '{Focus Area Name}' is relevant to this family right now..."
        const prompt = `Can you explain why the focus area '${area.title}' is relevant to my family right now? Please keep it simple and calm.`;

        // 3. Trigger Message Send (with a slight delay to allow view switch if needed, though state update batching usually handles it)
        // We pass the overriden text.
        // We need to ensure activeChatId is set. If not, handleSendMessage handles creation.
        // But if 'handleStartNewChat' runs on view switch, we might have a race condition.
        // Ideally, we wait for the view to switch? React state updates are async.
        // However, handleSendMessage uses current state variables.
        // 'chats' and 'activeChatId' are available here.

        // Safe approach: just call it. State updates for visual transition will happen.
        handleSendMessage(prompt);
    };

    // --- AUTOMATIC SCHEME FETCHING ---
    useEffect(() => {
        const fetchSchemes = async () => {
            if (!lifeState || !lifeState.currentStage) return;
            // Avoid re-fetching if we already have data for this stage (simple cache check)
            // In a real app we might want more robust cache invalidation
            if (schemeData && !isInitializing) return;

            setIsSchemeLoading(true);
            try {
                const res = await getEligibleSchemes(profile, lifeState.currentStage, settings.language);
                setSchemeData(res);
            } catch (e) {
                console.error("Auto-fetch schemes failed", e);
            } finally {
                setIsSchemeLoading(false);
            }
        };

        if (currentView === 'SCHEMES') {
            fetchSchemes();
        }
    }, [currentView, lifeState, profile, settings.language]);

    // Helper: Get Schemes for Tab
    const getFilteredSchemes = () => {
        if (!schemeData?.schemes) return [];

        switch (activeSchemeTab) {
            case 'You':
                return schemeData.schemes.filter(s => ['SELF', 'FAMILY'].includes(s.beneficiaryType));
            case 'Spouse':
                return schemeData.schemes.filter(s => s.beneficiaryType === 'SPOUSE');
            case 'Children':
                return schemeData.schemes.filter(s => s.beneficiaryType === 'CHILD');
            case 'Parents':
                return schemeData.schemes.filter(s => s.beneficiaryType === 'PARENT');
            case 'Siblings':
                return schemeData.schemes.filter(s => s.beneficiaryType === 'SIBLING');
            default:
                return [];
        }
    };

    // Helper: Available Tabs
    const getAvailableTabs = () => {
        const tabs = ['You'];
        if (profile.spouse && (profile.spouse.age || profile.spouse.gender)) tabs.push('Spouse');
        if (profile.children && profile.children.length > 0) tabs.push('Children');
        if (profile.parents && profile.parents.length > 0) tabs.push('Parents');
        if (profile.siblings && profile.siblings.length > 0) tabs.push('Siblings');
        return tabs;
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

    // -- RENDER JOURNEY IF ACTIVE --
    if (showJourney) {
        return <FamilyJourneyView entries={historyEntries} onBack={() => setShowJourney(false)} />;
    }

    // -- RENDER UPDATE HISTORY IF ACTIVE --
    if (showHistory) {
        return <UpdateHistoryView entries={historyEntries} onBack={() => setShowHistory(false)} onDelete={handleDeleteHistory} />;
    }

    // ... (Main Application Render) ...
    return (
        <div className="min-h-screen pb-32 font-sans flex flex-col relative transition-colors duration-500">
            <TopHeader
                onNavigate={setCurrentView}
                onSignOut={onSignOut}
                currentLanguage={settings.language}
                onLanguageChange={async (lang) => {
                    // Optimistic update
                    setSettings(prev => ({ ...prev, language: lang }));
                    // Persist
                    try {
                        await setDoc(doc(db, 'households', deviceId), { settings: { language: lang } }, { merge: true });
                    } catch (e) {
                        console.error("Failed to save language setting", e);
                    }
                }}
            />

            {/* Render Loading Overlay if app is re-initializing/syncing */}
            {isInitializing && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-teal-600 w-8 h-8" />
                </div>
            )}

            {currentView === 'HOME' && (
                <div className="max-w-7xl w-full mx-auto p-5 space-y-8 animate-in fade-in duration-500 pb-32">
                    {/* Greeting */}
                    <div className="space-y-2 px-2">
                        <p className="text-stone-500 font-medium text-sm uppercase tracking-widest">ConnectiVita • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <h1 className="text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
                            Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500">{profile.username || 'Friend'}</span>
                        </h1>
                    </div>

                    {/* Two Column Layout: Snapshot (Left) + Update (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {/* LEFT: Family Snapshot Card - VIBRANT DARK */}
                        <div className="bg-white border border-stone-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">


                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Family Profile</span>
                                </div>

                            </div>

                            {/* Main Content */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-4xl font-bold text-stone-800 mb-3 tracking-tight">{lifeState.currentStage}</h2>
                                    <p className="text-stone-500 text-sm leading-relaxed font-medium mb-6 relative pl-4 border-l-2 border-teal-200">
                                        {lifeState.explanation}
                                    </p>
                                </div>

                                {/* Timeline container */}
                                <div className="mt-auto bg-stone-50/50 rounded-2xl p-4 border border-stone-100">
                                    <LifeStageTimeline
                                        current={lifeState.currentStage}
                                        previous={lifeState.previousStage}
                                        next={lifeState.nextStagePrediction}
                                        confidence={'High'}
                                        language={settings.language}
                                        onViewJourney={() => setShowJourney(true)}
                                    // Custom styling for dark mode timeline if supported, otherwise standard
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Has Anything Changed? Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-stone-200/40 border-2 border-stone-50 relative overflow-hidden flex flex-col justify-center h-full">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Sparkles size={120} />
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-stone-900 mb-2">Something new?</h3>
                                <p className="text-stone-500 text-base mb-8 font-medium max-w-xs">Keep your guidance fresh by updating us on life changes.</p>

                                <div className="space-y-4">
                                    <input
                                        className="w-full bg-stone-50 border-0 rounded-2xl px-6 py-5 text-base font-medium focus:outline-none focus:ring-4 focus:ring-stone-100 transition-all shadow-inner placeholder:text-stone-400"
                                        placeholder="Type here..."
                                        value={updateInput}
                                        onChange={e => setUpdateInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleLifeUpdate()}
                                        disabled={isUpdating}
                                    />
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setShowHistory(true)}
                                            className="text-xs font-bold text-stone-400 uppercase tracking-widest hover:text-stone-600 px-2"
                                        >
                                            History
                                        </button>
                                        <button
                                            onClick={handleLifeUpdate}
                                            disabled={!updateInput.trim() || isUpdating}
                                            className="bg-stone-900 text-white rounded-full px-8 py-4 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                                        >
                                            {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <>Update <Send size={18} /></>}
                                        </button>
                                    </div>
                                </div>

                                {updateSuccess && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center text-teal-600 font-bold animate-in fade-in zoom-in duration-300">
                                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                                            <Check size={32} />
                                        </div>
                                        <span className="text-xl text-teal-800">Got it!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Focus Areas Section - Bento Grid Style */}
                    <div>
                        <div className="flex items-end justify-between mb-6 px-2">
                            <div>
                                <h3 className="text-2xl font-bold text-stone-900">{t.home?.focusAreas || "Focus areas"}</h3>
                                <p className="text-stone-500 font-medium">{t.home?.focusAreasSubtitle || "Priorities for right now."}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {determineFocusAreas().length > 0 ? (
                                determineFocusAreas().map((area) => (
                                    <div key={area.id} className={`p-6 rounded-[2rem] transition-all duration-300 flex flex-col justify-between group cursor-default relative overflow-hidden min-h-[180px] hover:-translate-y-1 hover:shadow-xl ${area.theme.includes('rose') ? 'bg-rose-50 hover:shadow-rose-100' : area.theme.includes('sky') ? 'bg-sky-50 hover:shadow-sky-100' : area.theme.includes('emerald') ? 'bg-emerald-50 hover:shadow-emerald-100' : area.theme.includes('indigo') ? 'bg-indigo-50 hover:shadow-indigo-100' : area.theme.includes('amber') ? 'bg-amber-50 hover:shadow-amber-100' : 'bg-violet-50 hover:shadow-violet-100'}`}>

                                        <div className="flex justify-between items-start">
                                            <div className={`p-4 rounded-2xl text-white shadow-lg ${area.theme.includes('rose') ? 'bg-rose-500' : area.theme.includes('sky') ? 'bg-sky-500' : area.theme.includes('emerald') ? 'bg-emerald-500' : area.theme.includes('indigo') ? 'bg-indigo-500' : area.theme.includes('amber') ? 'bg-amber-500' : 'bg-violet-500'}`}>
                                                <area.icon size={28} strokeWidth={2.5} />
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleExplainFocusArea(area); }}
                                                className={`bg-white rounded-full p-2 shadow-sm font-bold text-[10px] uppercase tracking-widest hover:scale-110 transition-transform ${area.theme.includes('rose') ? 'text-rose-600' : area.theme.includes('sky') ? 'text-sky-600' : area.theme.includes('emerald') ? 'text-emerald-600' : area.theme.includes('indigo') ? 'text-indigo-600' : area.theme.includes('amber') ? 'text-amber-600' : 'text-violet-600'}`}
                                            >
                                                Explain
                                            </button>
                                        </div>

                                        <div className="mt-6">
                                            <h4 className={`text-xl font-bold mb-2 ${area.theme.split(' icon-')[0].split(' ').find(c => c.startsWith('text-'))}`}>{area.title}</h4>
                                            <p className="text-stone-600 text-sm font-medium leading-relaxed max-w-[90%]">{area.desc}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12 bg-stone-50 rounded-[2rem] border-2 border-dashed border-stone-200 text-stone-400">
                                    <p className="font-medium">{t.home?.focusAreaContent?.empty || "No specific focus areas right now."}</p>
                                </div>
                            )}
                        </div>
                    </div>


                </div >
            )
            }

            {
                currentView === 'SCHEMES' && (
                    <div className="max-w-4xl w-full mx-auto p-5 pb-32">
                        <h1 className="text-2xl font-bold mb-6 text-stone-800">Support for Your Family</h1>

                        {/* Family Tabs */}
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-5 px-5 select-none">
                            {getAvailableTabs().map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveSchemeTab(tab)}
                                    className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeSchemeTab === tab
                                        ? 'bg-teal-700 text-white shadow-xl shadow-teal-500/20 scale-105 ring-2 ring-white/50 backdrop-blur-md'
                                        : 'bg-white/40 text-stone-600 border border-white/60 hover:bg-white/70 hover:scale-105 backdrop-blur-sm'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        {isSchemeLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-4 animate-pulse">
                                <div className="w-12 h-12 bg-stone-200 rounded-full"></div>
                                <div className="h-4 w-48 bg-stone-200 rounded"></div>
                                <p className="text-sm">Finding best matches...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {getFilteredSchemes().length > 0 ? (
                                    getFilteredSchemes().map((s, i) => (
                                        <div key={i} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                            <SchemeCard scheme={s} t={t} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 border-dashed">
                                        <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="text-stone-300" size={24} />
                                        </div>
                                        <p className="text-stone-400 font-medium">No schemes currently apply to this stage.</p>
                                        <p className="text-stone-300 text-xs mt-1">Check back as life changes.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {
                currentView === 'CHAT' && (
                    <div className="h-[calc(100vh-120px)] w-full p-4 flex flex-col md:flex-row gap-6 pb-24 md:pb-8">
                        {/* Chat Sidebar (History) */}
                        <div className={`md:w-64 flex flex-col gap-3 ${activeChatId ? 'hidden md:flex' : 'flex-1'}`}>
                            <button
                                onClick={() => setActiveChatId('new')}
                                className="bg-teal-600 text-white p-4 rounded-xl font-bold shadow-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                {t.chat?.newChat || 'New Chat'}
                            </button>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {Object.values(chats).sort((a, b) => b.timestamp - a.timestamp).map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => setActiveChatId(chat.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all relative group ${activeChatId === chat.id ? 'bg-white border-teal-500 shadow-sm' : 'bg-white/50 border-stone-200 hover:bg-white hover:border-stone-300'}`}
                                    >
                                        <div className="text-sm font-bold text-stone-800 pr-6 truncate">{chat.title}</div>
                                        <div className="text-[10px] text-stone-400 mt-1">{new Date(chat.timestamp).toLocaleDateString()}</div>

                                        <button
                                            onClick={(e) => handleDeleteChat(chat.id, e)}
                                            className="absolute right-2 top-2 p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {Object.keys(chats).length === 0 && (
                                    <div className="text-center py-10 text-stone-300 text-xs">
                                        <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                                        No past conversations
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className={`flex-1 flex flex-col bg-white rounded-[2rem] border border-stone-100 shadow-2xl shadow-stone-200/50 overflow-hidden relative ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
                            {activeChatId && activeChatId !== 'new' && chats[activeChatId] ? (
                                <>
                                    <div className="p-5 border-b border-stone-100 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                        <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-stone-900 text-lg">{chats[activeChatId]?.title}</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                                                <p className="text-xs text-stone-500 font-medium">ConnectiVita Assistant</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar bg-stone-50/30">
                                        {chats[activeChatId].messages.map((m, i) => (
                                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`px-6 py-4 rounded-3xl max-w-[85%] text-[15px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-stone-900 text-white rounded-br-none' : 'bg-white border border-stone-100 text-stone-800 rounded-bl-none shadow-stone-100'}`}>
                                                    {m.content}
                                                </div>
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white px-5 py-4 rounded-3xl rounded-bl-none border border-stone-100 flex gap-1.5 shadow-sm">
                                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></span>
                                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-100"></span>
                                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-200"></span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="h-4"></div>
                                    </div>

                                    <div className="p-4 bg-white border-t border-stone-100">
                                        <div className="flex gap-2 relative bg-stone-50 p-2 rounded-[1.5rem] border border-stone-200 focus-within:ring-2 focus-within:ring-stone-900/10 focus-within:border-stone-400 transition-all">
                                            <input
                                                className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-medium focus:outline-none focus:ring-0 placeholder:text-stone-400"
                                                value={chatInput}
                                                onChange={e => setChatInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                                placeholder={t.chat?.placeholder || "Ask a question..."}
                                                disabled={isChatLoading}
                                            />
                                            <button
                                                onClick={() => handleSendMessage()}
                                                disabled={!chatInput.trim() || isChatLoading}
                                                className="bg-stone-900 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none transition-all"
                                            >
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-10 text-center relative">
                                    {activeChatId === 'new' && (
                                        <button onClick={() => setActiveChatId(null)} className="md:hidden absolute top-4 left-4 p-2 text-stone-500">
                                            <ArrowLeft size={20} />
                                        </button>
                                    )}
                                    <Sparkles size={48} className="mb-4 text-teal-100" />
                                    <h3 className="text-stone-800 font-bold mb-2">How can I help you?</h3>
                                    <p className="text-sm max-w-xs mb-6">I can help you understand schemes, guide you through life changes, or just answer questions for your family.</p>

                                    {activeChatId === 'new' ? (
                                        <div className="w-full max-w-lg flex gap-2 animate-in fade-in slide-in-from-bottom-4 bg-stone-50 p-2 rounded-[1.5rem] border border-stone-200 focus-within:ring-2 focus-within:ring-stone-900/10 transition-all">
                                            <input
                                                autoFocus
                                                className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-medium focus:outline-none placeholder:text-stone-400"
                                                value={chatInput}
                                                onChange={e => setChatInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                                placeholder="Ask anything..."
                                                disabled={isChatLoading}
                                            />
                                            <button
                                                onClick={() => handleSendMessage()}
                                                disabled={!chatInput.trim() || isChatLoading}
                                                className="bg-stone-900 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                                            >
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setActiveChatId('new')} className="text-teal-600 font-bold text-sm hover:underline">Start a new chat</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {
                currentView === 'PROFILE' && (
                    <div className="max-w-xl w-full mx-auto p-5 space-y-6 pb-32">
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
                        <button onClick={() => setCurrentView('EDIT_FAMILY')} className="w-full py-4 bg-stone-100 font-bold rounded-xl text-stone-600 hover:bg-stone-200 transition-colors">Edit Family Details</button>
                    </div>
                )
            }

            {
                currentView === 'SETTINGS' && (
                    <div className="max-w-xl w-full mx-auto p-5 space-y-8 animate-in fade-in pb-32">
                        <h1 className="text-2xl font-bold text-stone-800">Settings</h1>

                        {/* Section 1: Data & Control */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Data & Control</h2>

                            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
                                {/* Edit Snapshot */}
                                <button
                                    onClick={() => setCurrentView('EDIT_FAMILY')}
                                    className="w-full text-left p-4 hover:bg-stone-50 flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-100 transition-colors">
                                            <Edit2 size={18} />
                                        </div>
                                        <span className="font-medium text-stone-700">Edit Family Snapshot</span>
                                    </div>
                                    <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500" />
                                </button>

                                {/* Clear History */}
                                <button
                                    onClick={handleClearHistory}
                                    className="w-full text-left p-4 hover:bg-stone-50 flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                                            <History size={18} />
                                        </div>
                                        <span className="font-medium text-stone-700">Clear Update History</span>
                                    </div>
                                    <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500" />
                                </button>

                                {/* Delete Account */}
                                <button
                                    onClick={handleDeleteAccount}
                                    className="w-full text-left p-4 hover:bg-red-50 flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
                                            <Trash2 size={18} />
                                        </div>
                                        <span className="font-medium text-red-600">Delete Account</span>
                                    </div>
                                    <ChevronRight size={16} className="text-red-200 group-hover:text-red-400" />
                                </button>
                            </div>
                        </div>

                        {/* Section 2: About Guidance */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">About Guidance</h2>
                            <div className="bg-stone-100 p-6 rounded-3xl border border-stone-200 text-stone-600 text-sm leading-relaxed">
                                <div className="flex items-start gap-3">
                                    <Info size={20} className="text-stone-400 shrink-0 mt-0.5" />
                                    <p>Guidance is based on what you share. You can update or delete it anytime.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                currentView === 'EDIT_FAMILY' && (
                    <div className="max-w-3xl w-full mx-auto p-5 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/80 backdrop-blur-md py-4 z-30 -mx-5 px-5 border-b border-stone-100">
                            <button
                                onClick={() => setCurrentView('SETTINGS')}
                                className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-bold transition-colors"
                            >
                                <ArrowLeft size={20} />
                                <span>Settings</span>
                            </button>
                            <h1 className="text-xl font-bold text-stone-800">Family Details</h1>
                            <button
                                onClick={() => {
                                    const text = `Family Snapshot - ${new Date().toLocaleDateString()}\n\n` +
                                        `Primary User: ${profile.primaryUser.name || 'Citizen'} (${profile.primaryUser.age} | ${profile.primaryUser.occupationType})\n` +
                                        (profile.spouse ? `Spouse: ${profile.spouse.age} | ${profile.spouse.occupationType}\n` : '') +
                                        (profile.children?.length ? `Children: ${profile.children.length}\n` : '') +
                                        (profile.parents?.length ? `Parents: ${profile.parents.length}\n` : '');

                                    const element = document.createElement("a");
                                    const file = new Blob([text], { type: 'text/plain' });
                                    element.href = URL.createObjectURL(file);
                                    element.download = "ConnectiVita_Family_Details.txt";
                                    document.body.appendChild(element);
                                    element.click();
                                }}
                                className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-all"
                                title="Download Summary"
                            >
                                <Download size={20} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Primary User */}
                            <section>
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">You</h3>
                                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex justify-between items-center group hover:border-teal-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                                            <UserIcon size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900 text-lg">Primary Member</div>
                                            <div className="text-sm text-stone-500 flex gap-2">
                                                <span>{profile.primaryUser.age} yrs</span> •
                                                <span>{profile.primaryUser.gender || 'Not specified'}</span>
                                            </div>
                                            <div className="text-xs text-stone-400 mt-1">{profile.primaryUser.occupationType || 'No occupation listed'}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setEditingMember({ section: 'primaryUser', index: 0 }); setTempMemberData({ ...profile.primaryUser }); }}
                                        className="p-3 rounded-xl bg-stone-50 text-stone-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </section>

                            {/* Spouse */}
                            {profile.spouse && (
                                <section>
                                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Spouse</h3>
                                    <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex justify-between items-center group hover:border-teal-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                                                <Heart size={24} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-stone-900 text-lg">Spouse</div>
                                                <div className="text-sm text-stone-500 flex gap-2">
                                                    <span>{profile.spouse.age} yrs</span>
                                                </div>
                                                <div className="text-xs text-stone-400 mt-1">{profile.spouse.occupationType || 'No occupation listed'}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setEditingMember({ section: 'spouse', index: 0 }); setTempMemberData({ ...profile.spouse }); }}
                                            className="p-3 rounded-xl bg-stone-50 text-stone-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Children */}
                            {profile.children && profile.children.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Children</h3>
                                    <div className="space-y-4">
                                        {profile.children.map((child, idx) => (
                                            <div key={idx} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex justify-between items-center group hover:border-teal-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                        <Baby size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-lg">{child.role || 'Child'} {idx + 1}</div>
                                                        <div className="text-sm text-stone-500 flex gap-2">
                                                            <span>{child.age} yrs</span> •
                                                            <span>{child.gender}</span>
                                                        </div>
                                                        <div className="text-xs text-stone-400 mt-1">{child.studentLevel || child.occupationType || 'No status'}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setEditingMember({ section: 'children', index: idx }); setTempMemberData({ ...child }); }}
                                                    className="p-3 rounded-xl bg-stone-50 text-stone-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Parents */}
                            {profile.parents && profile.parents.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Parents</h3>
                                    <div className="space-y-4">
                                        {profile.parents.map((p, idx) => (
                                            <div key={idx} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex justify-between items-center group hover:border-teal-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                                                        <Users size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-lg">{p.role || 'Parent'}</div>
                                                        <div className="text-sm text-stone-500 flex gap-2">
                                                            <span>{p.age} yrs</span>
                                                        </div>
                                                        <div className="text-xs text-stone-400 mt-1">{p.occupationType || 'No occupation listed'}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setEditingMember({ section: 'parents', index: idx }); setTempMemberData({ ...p }); }}
                                                    className="p-3 rounded-xl bg-stone-50 text-stone-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                        </div>

                        {/* EDIT MODAL */}
                        {editingMember && (
                            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-6">
                                    <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                                        <h3 className="text-xl font-bold text-stone-800">Edit Details</h3>
                                        <button onClick={() => setEditingMember(null)} className="p-2 bg-stone-50 rounded-full text-stone-500 hover:bg-stone-100"><X size={20} /></button>
                                    </div>

                                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200">
                                        {/* BASIC INFO */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Age</label>
                                                <input
                                                    type="number"
                                                    value={tempMemberData.age || ''}
                                                    onChange={e => setTempMemberData({ ...tempMemberData, age: e.target.value })}
                                                    className="w-full bg-stone-50 border-0 rounded-xl p-3 font-bold text-stone-800 focus:ring-2 focus:ring-teal-500 transition-all"
                                                    placeholder="Age"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Gender</label>
                                                <select
                                                    value={tempMemberData.gender || ''}
                                                    onChange={e => setTempMemberData({ ...tempMemberData, gender: e.target.value })}
                                                    className="w-full bg-stone-50 border-0 rounded-xl p-3 font-bold text-stone-800 focus:ring-2 focus:ring-teal-500 transition-all"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* MARITAL STATUS */}
                                        {/* Show for adults usually, or based on age > 18 if age logic existed, simply showing for all for now or primary/spouse/parents */}
                                        {editingMember.section !== 'children' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Marital Status</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['Unmarried', 'Married', 'Widowed', 'Divorced'].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => setTempMemberData({ ...tempMemberData, maritalStatus: status })}
                                                            className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${tempMemberData.maritalStatus === status ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-stone-100 text-stone-500 hover:border-stone-200'}`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* PREGNANCY LOGIC - Only if Female and appropriate status */}
                                        {tempMemberData.gender === 'Female' &&
                                            (tempMemberData.maritalStatus === 'Married' || editingMember.section === 'primaryUser' || editingMember.section === 'spouse') && (
                                                <div className="space-y-2 bg-rose-50 p-4 rounded-xl border border-rose-100">
                                                    <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Baby size={14} /> Pregnancy Status
                                                    </label>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-rose-700">Is currently pregnant?</span>
                                                        <div className="flex bg-white rounded-lg p-1 border border-rose-100">
                                                            <button
                                                                onClick={() => setTempMemberData({ ...tempMemberData, isPregnant: false })}
                                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!tempMemberData.isPregnant ? 'bg-rose-100 text-rose-700' : 'text-stone-400'}`}
                                                            >
                                                                No
                                                            </button>
                                                            <button
                                                                onClick={() => setTempMemberData({ ...tempMemberData, isPregnant: true })}
                                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${tempMemberData.isPregnant ? 'bg-rose-500 text-white shadow-md' : 'text-stone-400'}`}
                                                            >
                                                                Yes
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        <div className="h-px bg-stone-100 my-2"></div>

                                        {/* OCCUPATION LOGIC */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Occupation Type</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['Student', 'Working', 'Homemaker', 'Retired', 'Unemployed', 'Other'].map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => {
                                                                // Reset dependent fields when type changes
                                                                const newData = { ...tempMemberData, occupationType: opt as any };
                                                                if (opt !== 'Working') { delete newData.occupationSector; delete newData.incomeRange; }
                                                                if (opt !== 'Student') { delete newData.studentLevel; }
                                                                setTempMemberData(newData);
                                                            }}
                                                            className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${tempMemberData.occupationType === opt ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-stone-100 text-stone-500 hover:border-stone-200'}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* CONDITIONAL: STUDENT -> What are they studying? */}
                                            {tempMemberData.occupationType === 'Student' && (
                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Current Education Level</label>
                                                    <select
                                                        value={tempMemberData.studentLevel || ''}
                                                        onChange={e => setTempMemberData({ ...tempMemberData, studentLevel: e.target.value })}
                                                        className="w-full bg-indigo-50 border-indigo-100 rounded-xl p-3 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                                                    >
                                                        <option value="">Select Level</option>
                                                        <option value="Primary School">Primary School (1-5)</option>
                                                        <option value="Middle School">Middle School (6-8)</option>
                                                        <option value="High School">High School (9-12)</option>
                                                        <option value="College/University">College / University</option>
                                                        <option value="Vocational">Vocational Training</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            )}

                                            {/* CONDITIONAL: WORKING -> Sector & Income */}
                                            {tempMemberData.occupationType === 'Working' && (
                                                <div className="bg-stone-50 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Employment Sector</label>
                                                        <select
                                                            value={tempMemberData.occupationSector || ''}
                                                            onChange={e => {
                                                                const newSector = e.target.value;
                                                                const newData = { ...tempMemberData, occupationSector: newSector };
                                                                // Reset govt role if not govt
                                                                if (newSector !== 'Government') delete newData.govtRole;
                                                                setTempMemberData(newData);
                                                            }}
                                                            className="w-full bg-white border border-stone-200 rounded-xl p-3 font-bold text-stone-800 focus:ring-2 focus:ring-teal-500"
                                                        >
                                                            <option value="">Select Sector</option>
                                                            <option value="Private">Private Sector</option>
                                                            <option value="Government">Government / Public Sector</option>
                                                            <option value="Business">Self-Employed / Business</option>
                                                            <option value="Daily Wage">Daily Wage / Labor</option>
                                                            <option value="Agriculture">Agriculture / Farming</option>
                                                        </select>
                                                    </div>

                                                    {/* CONDITIONAL: GOVT -> Role Category */}
                                                    {tempMemberData.occupationSector === 'Government' && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Government Job Category</label>
                                                            <select
                                                                value={tempMemberData.govtRole || ''}
                                                                onChange={e => setTempMemberData({ ...tempMemberData, govtRole: e.target.value })}
                                                                className="w-full bg-teal-50 border-teal-100 rounded-xl p-3 font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
                                                            >
                                                                <option value="">Select Category</option>
                                                                <option value="Group A">Group A (Gazetted)</option>
                                                                <option value="Group B">Group B</option>
                                                                <option value="Group C">Group C</option>
                                                                <option value="Group D">Group D</option>
                                                                <option value="Contractual">Contractual Staff</option>
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Monthly Income Range</label>
                                                        <select
                                                            value={tempMemberData.incomeRange || ''}
                                                            onChange={e => setTempMemberData({ ...tempMemberData, incomeRange: e.target.value })}
                                                            className="w-full bg-white border border-stone-200 rounded-xl p-3 font-bold text-stone-800 focus:ring-2 focus:ring-teal-500"
                                                        >
                                                            <option value="">Select Range</option>
                                                            <option value="< 5,000">Less than ₹5,000</option>
                                                            <option value="5,000 - 10,000">₹5,000 - ₹10,000</option>
                                                            <option value="10,000 - 20,000">₹10,000 - ₹20,000</option>
                                                            <option value="20,000 - 50,000">₹20,000 - ₹50,000</option>
                                                            <option value="> 50,000">More than ₹50,000</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-stone-100 my-2"></div>

                                        {/* DISABILITY */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Disability Status</label>
                                            <div className="p-4 rounded-xl bg-stone-50 flex items-center justify-between">
                                                <span className="text-sm font-bold text-stone-600">Has any disability?</span>
                                                <div className="flex bg-white rounded-lg p-1 border border-stone-200">
                                                    <button onClick={() => setTempMemberData({ ...tempMemberData, disability: 'No' })} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tempMemberData.disability !== 'Yes' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-400 hover:bg-stone-50'}`}>No</button>
                                                    <button onClick={() => setTempMemberData({ ...tempMemberData, disability: 'Yes' })} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tempMemberData.disability === 'Yes' ? 'bg-teal-500 text-white shadow-md' : 'text-stone-400 hover:bg-stone-50'}`}>Yes</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            onClick={() => {
                                                setProfile(prev => {
                                                    const newP = { ...prev };
                                                    const { section, index } = editingMember;
                                                    if (section === 'primaryUser') newP.primaryUser = { ...newP.primaryUser, ...tempMemberData };
                                                    else if (section === 'spouse') newP.spouse = { ...newP.spouse, ...tempMemberData };
                                                    else if (section === 'children' && newP.children) newP.children[index] = { ...newP.children[index], ...tempMemberData };
                                                    else if (section === 'parents' && newP.parents) newP.parents[index] = { ...newP.parents[index], ...tempMemberData };
                                                    return newP;
                                                });
                                                setEditingMember(null);
                                            }}
                                            className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-black hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* TRENDY FLOATING DOCK NAV for All Screens */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900/90 backdrop-blur-lg p-2 rounded-full shadow-2xl flex items-center gap-2 z-50 ring-1 ring-white/10 scale-90 md:scale-100 origin-bottom">
                {['HOME', 'SCHEMES', 'CHAT'].map((v: any) => (
                    <button
                        key={v}
                        onClick={() => setCurrentView(v)}
                        className={`relative rounded-full w-14 h-14 flex items-center justify-center transition-all duration-300 ${currentView === v ? 'bg-white/20 text-white shadow-inner scale-100' : 'text-stone-400 hover:text-white hover:bg-white/10 hover:scale-105'}`}
                    >
                        {v === 'HOME' && <Home size={24} strokeWidth={2.5} />}
                        {v === 'SCHEMES' && <FileText size={24} strokeWidth={2.5} />}
                        {v === 'CHAT' && <MessageCircle size={24} strokeWidth={2.5} />}

                        {/* Active Dot */}
                        {currentView === v && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                    </button>
                ))}


            </div>
        </div >
    );
};
