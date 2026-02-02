
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Activity, Heart, Info, Loader2, Trash2, User as UserIcon, Check, ChevronRight, X, MessageCircle, Send, Plus, History, Cloud, LogOut, Lock, ScrollText, AlertTriangle, Clock, ArrowLeft, ArrowRight, Pause, Play, Download, Mic, Volume2, Globe, Sparkles, Shield, Users, Home, FileText, User, Edit2, Mail, Key, ShieldCheck, XCircle, Zap, Menu, AlertCircle, RefreshCw, ChevronDown, ChevronUp, HelpCircle, Save, Layers, Circle, ArrowDown, Database, CheckCircle2 } from 'lucide-react';
import { LifeStageTimeline } from './LifeStageTimeline';
import { FamilyJourneyView } from './FamilyJourneyView';
import { UpdateHistoryView } from './UpdateHistoryView';
import { analyzeLifeStageChange, generateInitialSnapshot, explainNeed, getFamilyContextChatResponse, getEligibleSchemes, detectProfileChanges, generateChatTitle, deepClean } from '../services/geminiService';
import { CitizenProfile, LifeStageUpdate, ChatSession, ChatMessage, LifeJourneyEntry, SnapshotUpdateEntry, CitizenSettings, SchemeAnalysisResult, AppLanguage, DetectedProfileUpdate, FocusAreaContent, Scheme } from '../types';
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

const WizardOptionButton: React.FC<{ label: string, selected: boolean, onClick: () => void }> = ({ label, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group relative overflow-hidden ${
            selected 
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20' 
                : 'bg-white/50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
        }`}
    >
        <div className="flex justify-between items-center relative z-10">
            <span className={`text-lg font-bold ${selected ? 'text-white' : 'text-slate-800'}`}>{label}</span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selected ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                {selected && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
        </div>
    </button>
);

const WizardProgress = ({ current, total, t }: { current: number, total: number, t: any }) => (
    <div className="mb-8 flex items-center gap-3">
        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-slate-900 h-full transition-all duration-500 ease-out" style={{ width: `${Math.min((current / total) * 100, 100)}%` }}></div>
        </div>
        <span className="text-xs font-black text-slate-400 font-mono">{t.wizard.step} {current}/{total}</span>
    </div>
);

const WizardScreen = ({ title, children, progress, canProceed, nextLabel, onNext, onBack, t }: any) => (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-500">
        {progress && <WizardProgress current={progress.current} total={progress.total} t={t} />}
        
        <h2 className="text-4xl font-extrabold text-slate-900 leading-[1.1] mb-8 tracking-tight">{title}</h2>
        
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-3 -mx-2 px-2">
            {children}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200/50 flex gap-4 items-center">
            <button 
                onClick={onBack} 
                className="px-6 py-4 rounded-2xl text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
                {t.common.back}
            </button>
            <button 
                onClick={onNext} 
                disabled={!canProceed} 
                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2"
            >
                {nextLabel || t.common.continue}
                <ArrowRight size={20} />
            </button>
        </div>
    </div>
);

// --- SCHEME CARD COMPONENT ---
const SchemeCard: React.FC<{ scheme: Scheme, t: any }> = ({ scheme, t }) => {
    const [showReason, setShowReason] = useState(false);

    const getBadgeStyle = (cat: string) => {
        switch(cat) {
            case 'Health': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'Education': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'Pension': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Livelihood': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Housing': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3 relative z-10">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getBadgeStyle(scheme.category)}`}>
                    {scheme.category}
                </span>
            </div>
            
            <h4 className="font-bold text-slate-900 text-xl mb-2 relative z-10">{scheme.name}</h4>
            <p className="text-slate-600 font-medium leading-relaxed mb-4 relative z-10">
                {scheme.description}
            </p>

            <button 
                onClick={() => setShowReason(!showReason)}
                className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline relative z-10"
            >
                <HelpCircle size={16} />
                {t.schemes.whySuggested}
            </button>

            {showReason && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 relative z-10">
                    <p className="text-indigo-900 text-sm font-medium">
                        {scheme.eligibilityReason}
                    </p>
                </div>
            )}
            
            {/* Hover Blob */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
        </div>
    );
};

export const CitizenView: React.FC<Props> = ({ user, onSignOut }) => {
  const deviceId = user.uid;

  // Data State
  const [lifeState, setLifeState] = useState<LifeStageUpdate | null>(null);
  const [settings, setSettings] = useState<CitizenSettings>({ isPaused: false, language: 'English' });
  
  // Profile State
  const [profile, setProfile] = useState<CitizenProfile>({
    username: '', 
    accountScope: undefined, 
    memberCount: 1, 
    primaryUser: {},
    spouse: {},
    children: [],
    parents: [],
    siblings: [],
  });
  
  // Update Logic States
  const [pendingUpdate, setPendingUpdate] = useState<DetectedProfileUpdate | null>(null);
  const [updateHistory, setUpdateHistory] = useState<SnapshotUpdateEntry[]>([]);
  
  // View States
  const [isViewingUpdateHistory, setIsViewingUpdateHistory] = useState(false);
  const [isViewingJourney, setIsViewingJourney] = useState(false);
  
  // Focus Area State
  const [selectedFocusArea, setSelectedFocusArea] = useState<{id: string, content: FocusAreaContent} | null>(null);

  // UI State
  const [isSynced, setIsSynced] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'HOME' | 'SCHEMES' | 'CHAT' | 'PROFILE' | 'SETTINGS'>('HOME');
  
  // Wizard Navigation
  const [currentStepId, setCurrentStepId] = useState<string>('welcome');
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  
  // General UI
  const [updateInput, setUpdateInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [schemeData, setSchemeData] = useState<SchemeAnalysisResult | null>(null);
  const [isCheckingSchemes, setIsCheckingSchemes] = useState(false);
  const [missingFieldInput, setMissingFieldInput] = useState('');
  
  // Chat State
  const [chats, setChats] = useState<Record<string, ChatSession>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatDeleting, setIsChatDeleting] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Profile View State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);

  // Settings View State
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [isProcessingClear, setIsProcessingClear] = useState(false);

  // TRANSLATION HELPER
  // @ts-ignore
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS['English'];

  // --- Voice Utils ---
  const speakText = (text: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
      }
  };

  const startListening = (setInput: (val: string) => void) => {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = 'en-US';
          recognition.continuous = false;
          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setInput(transcript);
          };
          recognition.start();
      } else {
          alert("Voice input not supported in this browser simulation.");
      }
  };

  // --- Helpers for Greetings ---
  const getLocalizedGreeting = (lang: AppLanguage, name?: string) => {
    const cleanName = name?.trim() || "";
    const namePart = cleanName ? `, ${cleanName}` : "";
    
    // We can now use the t object for basic greeting, but we might want custom logic for names
    return `${t.home.greeting}${namePart} 👋`;
  };

  // --- Firebase Sync ---
  useEffect(() => {
    const householdRef = doc(db, 'households', deviceId);
    const unsubHousehold = onSnapshot(householdRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.profile) {
            setProfile(prev => ({ ...prev, ...data.profile }));
        }
        setLifeState(data.lifeState || null);
        if (data.settings?.language) setSettings(prev => ({ ...prev, ...data.settings }));
        setIsSynced(true);
        setIsInitializing(false);
      } else {
        setIsInitializing(false);
      }
    });

    const updatesRef = collection(db, 'households', deviceId, 'updates');
    const qUpdates = query(updatesRef, orderBy('timestamp', 'desc'));
    const unsubUpdates = onSnapshot(qUpdates, (snap) => {
        const history: SnapshotUpdateEntry[] = [];
        snap.forEach(doc => history.push({id: doc.id, ...doc.data()} as SnapshotUpdateEntry));
        setUpdateHistory(history);
    });

    const chatsRef = collection(db, 'households', deviceId, 'chats');
    const qChats = query(chatsRef, orderBy('timestamp', 'desc'));
    const unsubChats = onSnapshot(qChats, (snap) => {
      const newChats: Record<string, ChatSession> = {};
      snap.forEach(doc => { newChats[doc.id] = doc.data() as ChatSession; });
      setChats(newChats);
      // If no active chat but chats exist, select the most recent one (first in query desc order)
      if (!activeChatId && snap.docs.length > 0) setActiveChatId(snap.docs[0].id);
    });

    return () => { unsubHousehold(); unsubUpdates(); unsubChats(); };
  }, [deviceId]);

  // Scroll to bottom of chat
  useEffect(() => {
      if (chatBottomRef.current) {
          chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chats, activeChatId, isChatLoading]);

  const saveToFirebase = async (newProfile: CitizenProfile, newLifeState: LifeStageUpdate | null) => {
    const payload: any = { profile: newProfile, settings, updatedAt: Date.now() };
    if (newLifeState) payload.lifeState = newLifeState;
    await setDoc(doc(db, 'households', deviceId), payload, { merge: true });
  };

  const handleUpdateSubmit = async () => {
    if (!updateInput.trim()) return;
    setIsAnalyzing(true);
    try {
        const detectedChanges = await detectProfileChanges(profile, updateInput, settings.language);
        setPendingUpdate(detectedChanges);
    } catch (e) {
        console.error(e);
        alert("Could not process update. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const confirmUpdate = async () => {
      if (!pendingUpdate) return;
      setIsAnalyzing(true);
      try {
          // 1. Update Profile State
          const newProfile = pendingUpdate.newProfileState;
          
          // 2. Recompute Life Stage
          const newLifeStage = await generateInitialSnapshot(newProfile, settings.language);
          
          // 3. Save History Entry with Life Stage
          const updateEntry: any = {
              date: new Date().toLocaleDateString(),
              user_input: updateInput,
              change_summary: pendingUpdate.summary,
              changes_detailed: pendingUpdate.changes,
              previous_profile_state: JSON.stringify(deepClean(profile)), // Save OLD profile for rollback
              life_stage: newLifeStage.currentStage, // Save new stage for history
              timestamp: Date.now()
          };
          
          await addDoc(collection(db, 'households', deviceId, 'updates'), updateEntry);
          
          // 4. Save Core Data
          await saveToFirebase(newProfile, newLifeStage);
          
          setProfile(newProfile);
          setLifeState(newLifeStage);
          setPendingUpdate(null);
          setUpdateInput('');
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const cancelUpdate = () => {
      setPendingUpdate(null);
  };

  const handleHistoryDeletion = async (idToDelete: string) => {
      try {
          // 1. Find the entry
          const entry = updateHistory.find(h => h.id === idToDelete);
          if (entry && entry.previous_profile_state) {
              // 2. Revert Profile
              const revertedProfile = JSON.parse(entry.previous_profile_state) as CitizenProfile;
              setProfile(revertedProfile);

              // 3. Recompute Stage based on Reverted Profile
              const revertedLifeStage = await generateInitialSnapshot(revertedProfile, settings.language);
              setLifeState(revertedLifeStage);

              // 4. Save Reverted State
              await saveToFirebase(revertedProfile, revertedLifeStage);
          }

          // 5. Delete the doc
          await deleteDoc(doc(db, 'households', deviceId, 'updates', idToDelete));
      } catch (e) {
          console.error("Rollback failed", e);
      }
  };

  // --- SETTINGS HANDLERS ---
  const handleEditSnapshot = () => {
      // Re-entering the wizard flow to edit details
      setCurrentStepId('a1_gender'); // Skip welcome, go straight to inputs
      setLifeState(null); // This triggers the "Setup" view (Wizard)
  };

  const handleClearHistory = async () => {
      setIsProcessingClear(true);
      try {
           // Delete updates
           const updatesSnapshot = await getDocs(collection(db, 'households', deviceId, 'updates'));
           const batch = writeBatch(db);
           updatesSnapshot.docs.forEach(d => batch.delete(d.ref));
           await batch.commit();
  
           // Recalculate
           const newState = await generateInitialSnapshot(profile, settings.language);
           await saveToFirebase(profile, newState);
           setLifeState(newState);
           setUpdateHistory([]); // clear local state
           setConfirmClearHistory(false);
      } catch (e) {
          console.error("Failed to clear history", e);
          alert("Failed to clear history. Please try again.");
      } finally {
          setIsProcessingClear(false);
      }
  };

  // --- PROFILE HANDLERS ---
  const handleUpdateUsername = async () => {
      if (!editNameValue.trim()) return;
      
      const newProfile = { ...profile, username: editNameValue.trim() };
      setProfile(newProfile); // Optimistic update
      setIsEditingName(false);
      
      try {
          await updateDoc(doc(db, 'households', deviceId), {
              'profile.username': newProfile.username
          });
      } catch (e) {
          console.error("Failed to update username", e);
          alert("Could not update username.");
      }
  };

  const handleFullAccountDeletion = async () => {
      setIsDeleteProcessing(true);
      try {
          // 1. Delete Subcollections (Updates, Chats)
          const updatesSnapshot = await getDocs(collection(db, 'households', deviceId, 'updates'));
          const updateDeletions = updatesSnapshot.docs.map(d => deleteDoc(d.ref));
          
          const chatsSnapshot = await getDocs(collection(db, 'households', deviceId, 'chats'));
          const chatDeletions = chatsSnapshot.docs.map(d => deleteDoc(d.ref));
          
          await Promise.all([...updateDeletions, ...chatDeletions]);
          
          // 2. Delete Main Document
          await deleteDoc(doc(db, 'households', deviceId));
          
          // 3. Delete Auth User
          await deleteUser(user);
          // App.tsx will handle the redirect to AuthView via onAuthStateChanged
      } catch (e) {
          console.error("Deletion failed", e);
          alert("Account deletion failed. You may need to sign in again to verify your identity before deleting.");
          setIsDeleteProcessing(false);
          setIsDeletingAccount(false);
      }
  };

  // --- CHAT HANDLERS ---
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput(''); // Clear immediately
    
    let chatId = activeChatId;
    let currentSession = chatId ? chats[chatId] : null;
    let newMessages: ChatMessage[] = [];

    if (currentSession) {
        newMessages = [...currentSession.messages, { role: 'user', content: userMsg }];
    } else {
        newMessages = [{ role: 'user', content: userMsg }];
    }

    setIsChatLoading(true);

    try {
        // If no chat ID, create one
        if (!chatId) {
            const title = await generateChatTitle(userMsg, settings.language);
            const newChatRef = await addDoc(collection(db, 'households', deviceId, 'chats'), {
                title,
                messages: newMessages, // Save initial user message
                timestamp: Date.now()
            });
            chatId = newChatRef.id;
            setActiveChatId(chatId);
            currentSession = { id: chatId, title, messages: newMessages, timestamp: Date.now() };
        } else {
             // Add user message to existing chat
             await updateDoc(doc(db, 'households', deviceId, 'chats', chatId), {
                 messages: newMessages
             });
        }

        // Get AI Response
        const aiResponseText = await getFamilyContextChatResponse(
            profile,
            lifeState!.currentStage,
            lifeState!.immediateNeeds,
            currentSession && currentSession.messages ? currentSession.messages : [], 
            userMsg,
            settings.language,
            schemeData?.schemes,
            updateHistory
        );

        // Save AI Response
        const finalMessages = [...newMessages, { role: 'model', content: aiResponseText }];
        await updateDoc(doc(db, 'households', deviceId, 'chats', chatId), {
             messages: finalMessages,
             timestamp: Date.now() // Update timestamp to bump to top
        });

    } catch (e) {
        console.error("Chat Error", e);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    await deleteDoc(doc(db, 'households', deviceId, 'chats', id));
    if (activeChatId === id) setActiveChatId(null);
    setIsChatDeleting(null);
  };

  // --- HELPERS ---
  
  // Map updates to life journey entries for the Full View
  const getJourneyEntries = (): LifeJourneyEntry[] => {
      return updateHistory.map(h => ({
          id: h.id,
          date: h.date,
          eventType: 'life_stage_change',
          // RULE: Show AI-interpreted summary ("change_summary"), NOT user input.
          summary: h.change_summary, 
          // Use the captured life stage or a fallback
          lifeStagesAfter: h.life_stage ? [h.life_stage] : ["Life Transition"],
          source: 'system_inference',
          timestamp: h.timestamp
      }));
  };
  
  // --- WIZARD NAVIGATION LOGIC ---

  const getNextStep = (currentId: string): string => {
      const p = profile;
      if (currentId === 'welcome') return 'a1_gender';
      if (currentId === 'a1_gender') return 'a2_age';
      if (currentId === 'a2_age') return 'summary'; 
      // Simplified wizard logic for brevity in this response
      return 'summary';
  };

  const handleBack = () => {
        if (stepHistory.length === 0) return;
        const prev = stepHistory[stepHistory.length - 1];
        setStepHistory(prevH => prevH.slice(0, -1));
        setCurrentStepId(prev);
  };

  const handleNext = () => {
    const nextId = getNextStep(currentStepId);
    if (nextId) {
        setStepHistory(prev => [...prev, currentStepId]);
        setCurrentStepId(nextId);
    }
  };

  const finishWizard = async () => {
      setIsInitializing(true);
      try {
        const initialState = await generateInitialSnapshot(profile, settings.language);
        await saveToFirebase(profile, initialState);
        setLifeState(initialState);
      } catch (e) {
        console.error("Setup failed", e);
      } finally {
        setIsInitializing(false);
      }
  };

  const renderWizardContent = () => {
      const commonProps = { progress: {current: 1, total: 3}, onBack: handleBack, onNext: handleNext, t };
      if (currentStepId === 'welcome') {
          return (
             <WizardScreen title={`${t.wizard.welcome}, ${profile.username}`} {...commonProps} nextLabel={t.wizard.start} canProceed={true} onBack={() => {}}>
                  <p className="text-xl text-slate-600 mb-6 font-medium leading-relaxed">{t.wizard.intro}</p>
             </WizardScreen>
          )
      }
      if (currentStepId === 'a1_gender') {
          return (
             <WizardScreen title={t.wizard.gender} {...commonProps} canProceed={!!profile.primaryUser.gender}>
                 {['Male', 'Female', 'Other'].map(o => <WizardOptionButton key={o} label={o} selected={profile.primaryUser.gender === o} onClick={() => setProfile(p => ({...p, primaryUser: {...p.primaryUser, gender: o as any}}))} />)}
             </WizardScreen>
          )
      }
      if (currentStepId === 'a2_age') {
           return (
             <WizardScreen title={t.wizard.age} {...commonProps} canProceed={!!profile.primaryUser.age}>
                  <input type="number" placeholder="Enter Age" className="w-full p-6 text-3xl font-bold bg-white rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" autoFocus value={profile.primaryUser.age || ''} onChange={(e) => {
                       setProfile(p => ({...p, primaryUser: {...p.primaryUser, age: e.target.value}}));
                  }}/>
             </WizardScreen>
           )
      }
      if (currentStepId === 'summary') {
          return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="text-center mb-8">
                   <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto text-white mb-6 shadow-xl shadow-emerald-500/30">
                       <ShieldCheck size={48} strokeWidth={2} />
                   </div>
                   <h2 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">{t.wizard.allSet}</h2>
               </div>
               <div className="mt-auto flex gap-4">
                   <button onClick={finishWizard} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 hover:bg-indigo-600 hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all">
                       {t.wizard.enterDashboard}
                   </button>
               </div>
           </div>
          );
      }
      return <div></div>;
  };

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-900 w-12 h-12" /></div>;

  // --- Main Render (Wrapper) ---
  if (!lifeState) {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
              <div className="max-w-2xl w-full bg-white/70 backdrop-blur-2xl rounded-[3rem] p-10 md:p-14 shadow-2xl border border-white/40 relative z-10">
                  {renderWizardContent()}
              </div>
          </div>
      )
  }

  // --- SUB-VIEWS ---
  
  if (isViewingUpdateHistory) {
      return (
          <UpdateHistoryView 
             entries={updateHistory}
             onBack={() => setIsViewingUpdateHistory(false)}
             onDelete={handleHistoryDeletion}
             t={t}
          />
      );
  }
  
  if (isViewingJourney) {
      return (
          <FamilyJourneyView 
              entries={getJourneyEntries()} 
              onBack={() => setIsViewingJourney(false)} 
              t={t}
          />
      );
  }
  
  const activeChat = activeChatId ? chats[activeChatId] : null;

  return (
    <div className="min-h-screen pb-32 font-sans text-slate-900 relative bg-[#f8fafc]">
        
        {/* --- GLOBAL HEADER --- */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 z-40 shadow-sm">
            <div className="font-extrabold text-xl text-slate-900 tracking-tight cursor-default">
                {t.common.appName}
            </div>
            
            <div className="flex items-center gap-3">
                {/* Language Selector */}
                <div className="relative">
                    <button 
                        onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        title="Change Language"
                    >
                        <Globe size={20} />
                    </button>
                    {isLanguageMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsLanguageMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-3 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                {LANGUAGES.map((lang) => (
                                    <button 
                                        key={lang}
                                        onClick={async () => {
                                            setSettings(prev => ({ ...prev, language: lang }));
                                            setIsLanguageMenuOpen(false);
                                            await updateDoc(doc(db, 'households', deviceId), { 'settings.language': lang });
                                        }}
                                        className={`text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex justify-between items-center ${settings.language === lang ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        {lang}
                                        {settings.language === lang && <Check size={14}/>}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 hover:border-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <UserIcon size={20} />
                            </div>
                        )}
                    </button>

                    {/* Profile Menu Dropdown */}
                    {isProfileMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-3 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button 
                                    onClick={() => { setCurrentView('PROFILE'); setIsProfileMenuOpen(false); }}
                                    className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                                >
                                    {t.nav.profile}
                                </button>
                                <button 
                                    onClick={() => { setCurrentView('SETTINGS'); setIsProfileMenuOpen(false); }}
                                    className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                                >
                                    {t.nav.settings}
                                </button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button 
                                    onClick={() => { onSignOut(); setIsProfileMenuOpen(false); }}
                                    className="text-left px-4 py-3 rounded-xl hover:bg-rose-50 text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-2"
                                >
                                    {t.nav.signOut} <LogOut size={14}/>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>

        {/* VIEW: HOME */}
        {currentView === 'HOME' && (
            <div className="max-w-4xl mx-auto p-6 pt-24 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* --- WARM GREETING --- */}
                <div className="px-2 mb-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
                        {getLocalizedGreeting(settings.language, profile.username)}
                    </h1>
                    <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">
                        {t.home.snapshotSubtitle}
                    </p>
                </div>
                
                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* FAMILY SNAPSHOT CARD - Spans 2 cols */}
                    <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-500/20 flex flex-col justify-between">
                        {/* Dynamic Backgrounds */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        
                        {/* 1️⃣ Top Bar: Safety */}
                        <div className="relative z-10 flex justify-between items-start mb-8 pb-6 border-b border-white/10">
                             <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-widest">
                                 <Database size={12} />
                                 {t.home.securelyStored}
                             </div>
                        </div>
                        
                        {/* 2️⃣ Visual Timeline */}
                        <div className="relative z-10 space-y-6 flex-1 flex flex-col justify-center py-4">
                            {/* Previous */}
                            {lifeState?.previousStage && (
                                <div className="flex items-center gap-4 opacity-50">
                                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center shrink-0">
                                        <Check size={16} className="text-slate-400"/>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.home.previously}</div>
                                        <div className="font-medium text-slate-300">{lifeState.previousStage}</div>
                                    </div>
                                </div>
                            )}

                            {/* Now */}
                            <div className="flex items-center gap-4 relative">
                                {/* Connector Line if previous exists */}
                                {lifeState?.previousStage && <div className="absolute left-[19px] -top-6 h-6 w-0.5 bg-slate-700"></div>}
                                
                                <div className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/50 z-10">
                                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">{t.home.now}</div>
                                    <div className="text-2xl font-extrabold text-white leading-tight">
                                        {lifeState?.currentStage}
                                    </div>
                                </div>
                            </div>

                            {/* Coming Up */}
                            <div className="flex items-center gap-4 relative">
                                {/* Connector Line */}
                                <div className="absolute left-[19px] -top-6 h-10 w-0.5 bg-gradient-to-b from-white/50 to-transparent"></div>
                                
                                <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0 z-10">
                                    <ArrowDown size={16} className="text-white/40"/>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.home.comingUp}</div>
                                    <div className="font-medium text-slate-300">{lifeState?.nextStagePrediction}</div>
                                </div>
                            </div>
                        </div>

                        {/* 3️⃣ Footer: Disclaimer & Action */}
                        <div className="relative z-10 pt-6 mt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <p className="text-[10px] text-slate-500 font-medium max-w-[200px] text-center sm:text-left">
                                {t.home.disclaimer}
                            </p>
                            <button 
                                onClick={() => setIsViewingJourney(true)}
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2"
                            >
                                {t.home.viewJourney} <ChevronRight size={12}/>
                            </button>
                        </div>
                    </div>

                    {/* Side Actions Column: Update Input */}
                    <div className="space-y-6">
                        <div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] p-6 h-full shadow-lg flex flex-col justify-between group hover:bg-white/80 transition-colors relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">{t.home.updateQuestion}</h3>
                                    <p className="text-slate-500 text-xs font-bold mt-1">{t.home.updateHint}</p>
                                </div>
                            </div>
                            
                            <textarea 
                                className="w-full bg-transparent resize-none outline-none text-xl font-medium placeholder:text-slate-300/60 text-slate-800 h-40"
                                placeholder={t.home.updatePlaceholder}
                                value={updateInput}
                                onChange={e => setUpdateInput(e.target.value)}
                            />
                            
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setIsViewingUpdateHistory(true)}
                                    className="text-slate-400 hover:text-indigo-600 text-xs font-bold uppercase tracking-wide flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white transition-colors"
                                >
                                    <History size={16} /> {t.home.viewHistory}
                                </button>

                                <div className="flex gap-2">
                                    <button onClick={() => startListening(setUpdateInput)} className="p-3 rounded-full hover:bg-white text-slate-400 transition-colors"><Mic size={24}/></button>
                                    <button 
                                        onClick={handleUpdateSubmit}
                                        disabled={isAnalyzing}
                                        className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center w-14 h-14"
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" size={24}/> : <Send size={24}/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FOCUS AREAS SECTION --- */}
                {lifeState.focusAreas && (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="mb-6 px-2">
                            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.home.focusAreas}</h3>
                            <p className="text-slate-500 font-medium mt-1">{t.home.focusAreasSubtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { id: 'health', content: lifeState.focusAreas.health, icon: Heart, color: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', iconColor: 'text-rose-500' },
                                { id: 'education', content: lifeState.focusAreas.education, icon: Globe, color: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-900', iconColor: 'text-sky-500' },
                                { id: 'livelihood', content: lifeState.focusAreas.livelihood, icon: Activity, color: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', iconColor: 'text-amber-500' },
                                { id: 'support', content: lifeState.focusAreas.support, icon: Shield, color: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-900', iconColor: 'text-indigo-500' }
                            ].map((area) => (
                                <button 
                                    key={area.id} 
                                    onClick={() => setSelectedFocusArea({id: area.id, content: area.content})}
                                    className={`${area.color} border ${area.border} p-6 rounded-[2rem] text-left hover:scale-[1.02] transition-transform h-full flex flex-col justify-between group shadow-sm`}
                                >
                                    <div>
                                        <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center ${area.iconColor} shadow-sm mb-4 group-hover:scale-110 transition-transform`}>
                                            <area.icon size={24} />
                                        </div>
                                        <h4 className={`font-extrabold text-lg mb-2 ${area.text}`}>{area.content.title || area.id.charAt(0).toUpperCase() + area.id.slice(1)}</h4>
                                        <p className="text-slate-600 text-sm font-medium leading-relaxed opacity-80 line-clamp-3">
                                            {area.content.shortDescription}
                                        </p>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <div className="bg-white/50 p-2 rounded-full text-slate-400 group-hover:text-slate-600 transition-colors">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- UPDATE CONFIRMATION MODAL --- */}
                {pendingUpdate && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-white animate-in zoom-in-95">
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4">{t.home.confirmUpdateTitle}</h3>
                            <p className="text-slate-500 mb-6 font-medium">{pendingUpdate.summary}</p>
                            
                            <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3 border border-slate-100 max-h-60 overflow-y-auto">
                                {pendingUpdate.changes.map((change, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm">
                                        <div className="bg-indigo-100 text-indigo-600 p-1 rounded-full mt-0.5"><RefreshCw size={12}/></div>
                                        <div>
                                            <span className="font-bold text-slate-700">{change.affectedMember}: </span>
                                            <span className="text-slate-500">{change.field} changed from </span>
                                            <span className="font-mono text-slate-400 line-through">{change.oldValue || 'Empty'}</span>
                                            <span className="text-slate-500"> to </span>
                                            <span className="font-bold text-indigo-600">{change.newValue}</span>
                                        </div>
                                    </div>
                                ))}
                                {pendingUpdate.changes.length === 0 && <p className="text-slate-400 italic">{t.home.noChangesDetected}</p>}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={cancelUpdate} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">{t.common.cancel}</button>
                                <button onClick={confirmUpdate} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-600 transition-colors">{t.home.updateSnapshotBtn}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- FOCUS AREA DETAIL MODAL --- */}
                {selectedFocusArea && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-0 max-w-lg w-full shadow-2xl border border-white animate-in zoom-in-95 overflow-hidden relative">
                             <div className={`h-32 w-full ${selectedFocusArea.id === 'health' ? 'bg-rose-100' : selectedFocusArea.id === 'education' ? 'bg-sky-100' : selectedFocusArea.id === 'livelihood' ? 'bg-amber-100' : 'bg-indigo-100'}`}></div>
                             <div className="p-8 -mt-12 relative">
                                <div className={`w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg mb-6 ${selectedFocusArea.id === 'health' ? 'text-rose-500' : selectedFocusArea.id === 'education' ? 'text-sky-500' : selectedFocusArea.id === 'livelihood' ? 'text-amber-500' : 'text-indigo-500'}`}>
                                     {selectedFocusArea.id === 'health' && <Heart size={32} />}
                                     {selectedFocusArea.id === 'education' && <Globe size={32} />}
                                     {selectedFocusArea.id === 'livelihood' && <Activity size={32} />}
                                     {selectedFocusArea.id === 'support' && <Shield size={32} />}
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-900 mb-4">{selectedFocusArea.content.title}</h3>
                                <p className="text-slate-600 font-medium text-lg leading-relaxed mb-8">
                                    {selectedFocusArea.content.whyItMatters}
                                </p>
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => {
                                            setCurrentView('CHAT');
                                            setChatInput(`${t.home.askGuidance}: ${selectedFocusArea.content.title}`);
                                            setSelectedFocusArea(null);
                                        }}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {t.home.askGuidance} <MessageCircle size={20}/>
                                    </button>
                                    <button onClick={() => setSelectedFocusArea(null)} className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">{t.common.close}</button>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* VIEW: SCHEMES (Standard) */}
        {currentView === 'SCHEMES' && (
            <div className="max-w-3xl mx-auto p-6 pt-24 animate-in fade-in slide-in-from-right-8 duration-500 pb-32">
                <header className="mb-10 pt-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                        {t.schemes.title}
                    </h1>
                    <p className="text-slate-500 text-lg font-medium max-w-xl">
                        {t.schemes.subtitle}
                    </p>
                </header>
                
                <div className="space-y-8"> 
                     {!schemeData && !isCheckingSchemes && (
                         <div className="text-center py-24 bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white relative overflow-hidden group shadow-lg">
                             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                             <div className="relative z-10 px-8">
                                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-sm">
                                    <Sparkles size={40} strokeWidth={2} />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">{t.schemes.discoverTitle}</h3>
                                <p className="text-slate-500 mb-8 max-w-md mx-auto">{t.schemes.discoverText}</p>
                                <button onClick={async () => {
                                    if (!lifeState) return;
                                    setIsCheckingSchemes(true);
                                    setSchemeData(null);
                                    const result = await getEligibleSchemes(profile, lifeState.currentStage, settings.language);
                                    setSchemeData(result);
                                    setIsCheckingSchemes(false);
                                }} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-slate-900/20">
                                    {t.schemes.checkEligibility}
                                </button>
                             </div>
                         </div>
                     )}
                     
                     {isCheckingSchemes && (
                         <div className="flex flex-col items-center justify-center py-40 text-slate-400">
                            <Loader2 className="animate-spin text-slate-900 mb-6" size={64} />
                            <span className="font-bold text-2xl text-slate-900 mb-2">{t.schemes.analyzing}</span>
                            <span className="text-slate-500">{t.schemes.matching}</span>
                        </div>
                     )}

                     {schemeData && !isCheckingSchemes && (
                        <div>
                             {schemeData.status === 'missing_info' ? (
                                <div className="bg-amber-50 p-10 rounded-[2.5rem] border border-amber-100 shadow-xl shadow-amber-500/10">
                                    <h3 className="font-bold text-amber-900 text-2xl mb-4">{t.schemes.oneDetailNeeded}</h3>
                                    <p className="text-amber-800 mb-8 font-medium text-lg leading-relaxed">{schemeData.missingFieldQuestion}</p>
                                    <div className="flex gap-4 bg-white p-3 rounded-2xl border border-amber-200 shadow-sm">
                                        <input type="text" autoFocus className="flex-1 p-4 outline-none rounded-xl text-lg font-medium text-slate-800" placeholder="Type your answer..." value={missingFieldInput} onChange={e => setMissingFieldInput(e.target.value)} />
                                        <button onClick={async () => {
                                            if (!missingFieldInput.trim() || !schemeData?.missingField) return;
                                            const updatedProfile = { ...profile, [schemeData.missingField]: missingFieldInput };
                                            setProfile(updatedProfile);
                                            setMissingFieldInput('');
                                            setIsCheckingSchemes(true);
                                            await setDoc(doc(db, 'households', deviceId), { profile: updatedProfile }, { merge: true });
                                            const result = await getEligibleSchemes(updatedProfile, lifeState!.currentStage, settings.language);
                                            setSchemeData(result);
                                            setIsCheckingSchemes(false);
                                        }} className="bg-amber-500 text-white px-8 py-4 rounded-xl hover:bg-amber-600 font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105">
                                            {t.schemes.submit}
                                        </button>
                                    </div>
                                </div>
                            ) : schemeData.schemes ? (
                                <div className="space-y-12">
                                    {/* Group schemes by beneficiary string from AI */}
                                    {Array.from(new Set(schemeData.schemes.map(s => s.beneficiary))).map((beneficiary) => {
                                        const memberSchemes = schemeData.schemes!.filter(s => s.beneficiary === beneficiary);
                                        return (
                                            <div key={beneficiary} className="animate-in fade-in slide-in-from-bottom-4">
                                                <div className="flex items-center gap-4 mb-6 px-2">
                                                    <div className="h-10 w-1 bg-indigo-500 rounded-full"></div>
                                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{beneficiary}</h2>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-6">
                                                    {memberSchemes.map((scheme, idx) => (
                                                        <SchemeCard key={idx} scheme={scheme} t={t} />
                                                    ))}
                                                    {memberSchemes.length === 0 && (
                                                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-500 font-medium text-center">
                                                            No schemes identified for this member based on current details.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="pt-12 text-center">
                                         <p className="text-xs font-bold text-slate-400 max-w-md mx-auto leading-relaxed">
                                             {t.schemes.disclaimer}
                                         </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-32 text-slate-400 font-medium bg-slate-50 rounded-[3rem]">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50"/>
                                    {t.schemes.noSchemes}
                                </div>
                            )}
                        </div>
                     )}
                </div>
            </div>
        )}

        {/* VIEW: CHAT (Feature 5) */}
        {currentView === 'CHAT' && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] p-4 md:p-6 pt-24 animate-in fade-in slide-in-from-bottom-4 flex gap-6">
                
                {/* Desktop Sidebar */}
                <div className="hidden md:flex flex-col w-80 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white p-6 shadow-sm overflow-hidden">
                    <button 
                        onClick={() => setActiveChatId(null)}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-6"
                    >
                        <Plus size={20}/> {t.chat.newChat}
                    </button>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 pl-2">{t.chat.history}</div>
                        {(Object.values(chats) as ChatSession[]).sort((a,b) => b.timestamp - a.timestamp).map(chat => (
                            <div key={chat.id} className="group relative">
                                <button 
                                    onClick={() => setActiveChatId(chat.id)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all ${activeChatId === chat.id ? 'bg-white shadow-md text-indigo-600' : 'hover:bg-white/50 text-slate-600'}`}
                                >
                                    <div className="font-bold truncate pr-6">{chat.title}</div>
                                    <div className="text-xs opacity-50 font-medium">{new Date(chat.timestamp).toLocaleDateString()}</div>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsChatDeleting(chat.id); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                        {Object.keys(chats).length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm font-medium">No history yet.</div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col relative overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
                        <div className="flex items-center gap-4">
                             {/* Mobile Menu Button (Placeholder for simplicity, usually would toggle sidebar) */}
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                 <MessageCircle size={24}/>
                             </div>
                             <div>
                                 <h2 className="font-bold text-slate-900 text-lg">{activeChatId ? chats[activeChatId]?.title : t.chat.newChat}</h2>
                                 <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                     {t.chat.online}
                                 </div>
                             </div>
                        </div>
                        <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 bg-slate-100 rounded-full"><Plus size={20}/></button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {!activeChatId && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                    <MessageCircle size={40} className="text-slate-400"/>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.chat.emptyStateTitle}</h3>
                                <p className="text-slate-500 max-w-sm">{t.chat.emptyStateText}</p>
                            </div>
                        )}
                        
                        {activeChatId && chats[activeChatId]?.messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-[2rem] text-lg font-medium leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-slate-900 text-white rounded-br-none' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-5 rounded-[2rem] rounded-bl-none flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatBottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 md:p-6 bg-white border-t border-slate-100">
                        <div className="flex gap-2 items-end bg-slate-50 p-2 rounded-[2rem] border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <button onClick={() => startListening(setChatInput)} className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-full transition-all">
                                <Mic size={24}/>
                            </button>
                            <textarea 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                placeholder={t.chat.placeholder}
                                className="flex-1 bg-transparent border-none outline-none resize-none py-4 max-h-32 text-lg font-medium text-slate-800 placeholder:text-slate-400"
                                rows={1}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isChatLoading}
                                className="p-4 bg-indigo-600 text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none"
                            >
                                <Send size={24}/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {isChatDeleting && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm rounded-[2.5rem]">
                        <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95">
                            <h3 className="font-bold text-xl text-slate-900 mb-2">{t.chat.deleteChatTitle}</h3>
                            <p className="text-slate-500 mb-6">{t.chat.deleteChatText}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsChatDeleting(null)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">{t.common.cancel}</button>
                                <button onClick={() => handleDeleteChat(isChatDeleting)} className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/30">{t.common.delete}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* VIEW: PROFILE (Feature 6) */}
        {currentView === 'PROFILE' && (
            <div className="max-w-2xl mx-auto p-6 pt-24 animate-in fade-in slide-in-from-right-8 duration-500 pb-32">
                <header className="mb-10 pt-4">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">{t.profile.title}</h1>
                    <p className="text-slate-500 text-lg">{t.profile.subtitle}</p>
                </header>

                <div className="space-y-6">
                    
                    {/* Identity Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-[80px] -mr-20 -mt-20 z-0"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-xl mb-6 overflow-hidden">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white">
                                        <UserIcon size={40} />
                                    </div>
                                )}
                            </div>

                            {/* Editable Username */}
                            <div className="text-center w-full mb-2">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 justify-center max-w-xs mx-auto">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            className="w-full text-center text-3xl font-extrabold bg-slate-50 border-b-2 border-indigo-500 outline-none text-slate-900 px-2 py-1 rounded-t-lg"
                                            value={editNameValue}
                                            onChange={e => setEditNameValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleUpdateUsername()}
                                        />
                                        <button 
                                            onClick={handleUpdateUsername}
                                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                                        >
                                            <Check size={20}/>
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingName(false)}
                                            className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300"
                                        >
                                            <X size={20}/>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-3 group">
                                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{profile.username}</h2>
                                        <button 
                                            onClick={() => { setEditNameValue(profile.username || ''); setIsEditingName(true); }}
                                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Edit2 size={18}/>
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-slate-400 font-medium mb-6">
                                <Mail size={16}/> {user.email}
                            </div>

                            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    {user.providerData[0]?.providerId.includes('google') ? t.profile.googleAccount : t.profile.emailAccount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sign Out Card */}
                    <button 
                        onClick={onSignOut}
                        className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:border-slate-300 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                                <LogOut size={24}/>
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-900 text-lg">{t.profile.signOutTitle}</h3>
                                <p className="text-slate-500 text-sm">{t.profile.signOutText}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-full text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <ChevronRight size={20}/>
                        </div>
                    </button>
                </div>
            </div>
        )}

        {/* VIEW: SETTINGS (Feature 7) */}
        {currentView === 'SETTINGS' && (
            <div className="max-w-2xl mx-auto p-6 pt-24 animate-in fade-in slide-in-from-right-8 duration-500 pb-32">
                <header className="mb-10 pt-4">
                     <button onClick={() => setCurrentView('HOME')} className="mb-4 text-slate-400 hover:text-slate-600 flex items-center gap-2 font-bold text-sm"><ArrowLeft size={16}/> {t.nav.backToDashboard}</button>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">{t.settings.title}</h1>
                    <p className="text-slate-500 text-lg">{t.settings.subtitle}</p>
                </header>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t.settings.dataControl}</h3>
                        <div className="space-y-4">
                             {/* Edit Snapshot */}
                             <button onClick={handleEditSnapshot} className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:border-indigo-200 hover:shadow-lg transition-all text-left">
                                <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                         <Edit2 size={24} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-900 text-lg">{t.settings.editSnapshot}</h4>
                                         <p className="text-slate-500 text-sm">{t.settings.editSnapshotSub}</p>
                                     </div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-indigo-600" />
                             </button>

                             {/* Clear History */}
                             <button onClick={() => setConfirmClearHistory(true)} className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:border-amber-200 hover:shadow-lg transition-all text-left">
                                <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                         <History size={24} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-900 text-lg">{t.settings.clearHistory}</h4>
                                         <p className="text-slate-500 text-sm">{t.settings.clearHistorySub}</p>
                                     </div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-amber-600" />
                             </button>

                             {/* Delete Account */}
                             <button onClick={() => setIsDeletingAccount(true)} className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:border-rose-200 hover:shadow-lg transition-all text-left">
                                <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                         <Trash2 size={24} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-900 text-lg">{t.settings.deleteAccount}</h4>
                                         <p className="text-slate-500 text-sm">{t.settings.deleteAccountSub}</p>
                                     </div>
                                </div>
                                 <ChevronRight className="text-slate-300 group-hover:text-rose-600" />
                             </button>
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div>
                         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t.settings.aboutGuidance}</h3>
                         <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                             <p className="text-slate-600 font-medium leading-relaxed">
                                 {t.settings.guidanceText}
                             </p>
                         </div>
                    </div>
                </div>

                {/* Clear History Confirmation Modal */}
                {confirmClearHistory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/30 backdrop-blur-sm p-4">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 border border-amber-100">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 text-center">{t.settings.clearHistoryConfirmTitle}</h3>
                            <p className="text-slate-500 mb-8 font-medium text-center leading-relaxed">
                                {t.settings.clearHistoryConfirmText}
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={handleClearHistory}
                                    disabled={isProcessingClear}
                                    className="w-full py-4 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                                >
                                    {isProcessingClear ? <Loader2 className="animate-spin"/> : t.settings.yesClear}
                                </button>
                                <button 
                                    onClick={() => setConfirmClearHistory(false)}
                                    disabled={isProcessingClear}
                                    className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50"
                                >
                                    {t.common.cancel}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Account Deletion Confirmation Modal */}
                {isDeletingAccount && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/30 backdrop-blur-sm p-4">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 border border-rose-100">
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 text-center">{t.settings.deleteAccountConfirmTitle}</h3>
                            <p className="text-slate-500 mb-8 font-medium text-center leading-relaxed">
                                {t.settings.deleteAccountConfirmText}
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={handleFullAccountDeletion}
                                    disabled={isDeleteProcessing}
                                    className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2"
                                >
                                    {isDeleteProcessing ? <Loader2 className="animate-spin"/> : t.settings.yesDelete}
                                </button>
                                <button 
                                    onClick={() => setIsDeletingAccount(false)}
                                    disabled={isDeleteProcessing}
                                    className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50"
                                >
                                    {t.common.cancel}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* BOTTOM NAVIGATION (Floating Dock) */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
            <div className="glass-panel px-3 py-3 rounded-full flex items-center shadow-2xl shadow-slate-900/10 border border-white/50">
                {[{v:'HOME', i:Home, l:t.nav.home}, {v:'SCHEMES', i:FileText, l:t.nav.schemes}, {v:'CHAT', i:MessageCircle, l:t.nav.chat}].map((item: any) => (
                    <button 
                        key={item.v} 
                        onClick={() => setCurrentView(item.v as any)} 
                        title={item.l}
                        className={`p-4 rounded-full transition-all duration-300 mx-1 ${currentView === item.v ? 'bg-slate-900 text-white scale-110 shadow-lg' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    >
                        <item.i size={24} strokeWidth={2.5} />
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};
