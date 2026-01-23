
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Activity, Heart, Info, Loader2, Trash2, User as UserIcon, Check, ChevronRight, X, MessageCircle, Send, Plus, History, Cloud, LogOut, Lock, ScrollText, AlertTriangle, Clock, ArrowLeft, ArrowRight, Pause, Play, Download, Mic, Volume2, Globe, Sparkles, Shield, Users, Home, FileText, User, Edit2, Mail, Key } from 'lucide-react';
import { LifeStageTimeline } from './LifeStageTimeline';
import { FamilyJourneyView } from './FamilyJourneyView';
import { analyzeLifeStageChange, generateInitialSnapshot, explainNeed, getFamilyContextChatResponse, getEligibleSchemes } from '../services/geminiService';
import { CitizenProfile, LifeStageUpdate, ChatSession, ChatMessage, LifeJourneyEntry, SnapshotUpdateEntry, CitizenSettings, SchemeAnalysisResult, AppLanguage } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, deleteDoc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { User as FirebaseUser, deleteUser } from 'firebase/auth';
import { jsPDF } from "jspdf";

interface Props {
    user: FirebaseUser;
    onSignOut: () => void;
}

const LANGUAGES: AppLanguage[] = ['English', 'Hindi', 'Marathi', 'Tamil', 'Bengali'];

// Simple translation dictionary for UI elements
const UI_TEXT: Record<string, Record<string, string>> = {
    English: {
        hello: "Hello",
        familySummary: "Here's your family summary.",
        currentStage: "Current Stage",
        edit: "Edit",
        familyOf: "Family of",
        updatedNow: "Updated just now",
        updatePrompt: "Has anything changed recently?",
        placeholderUpdate: "e.g. My child started college...",
        focusAreas: "Focus Areas",
        health: "Health & Well-being",
        education: "Education",
        livelihood: "Livelihood",
        govtSupport: "Govt. Support",
        schemesTitle: "Government Schemes You May Be Eligible For",
        schemesSubtitle: "Based on the family profile you provided.",
        checkEligibility: "Check Eligibility",
        analyzing: "Analyzing family profile...",
        missingInfo: "One quick question",
        friendlyGuide: "Friendly Guide",
        newChat: "New Chat",
        typeQuestion: "Type your question...",
        familyProfile: "Family Data",
        profileSubtitle: "Manage your account and family details.",
        primaryMember: "Primary Member",
        familyStructure: "Family Structure",
        navHome: "Home",
        navSchemes: "Schemes",
        navChat: "Chat",
        navProfile: "Profile",
        voiceNotSupported: "Voice input not supported in this browser simulation.",
        accountSettings: "User Account",
        email: "Email",
        method: "Method",
        deleteAccount: "Delete Account",
        deleteWarning: "This will permanently remove all family and scheme data.",
        confirmDelete: "Yes, Delete Everything",
        cancel: "Cancel",
        save: "Save",
        signOut: "Sign Out"
    },
    Hindi: {
        hello: "नमस्ते",
        familySummary: "यहाँ आपका परिवार सारांश है।",
        currentStage: "वर्तमान चरण",
        edit: "बदलें",
        familyOf: "परिवार के सदस्य",
        updatedNow: "अभी अपडेट किया गया",
        updatePrompt: "क्या हाल ही में कुछ बदला है?",
        placeholderUpdate: "जैसे: मेरा बच्चा कॉलेज जाने लगा...",
        focusAreas: "मुख्य क्षेत्र",
        health: "स्वास्थ्य",
        education: "शिक्षा",
        livelihood: "आजीविका",
        govtSupport: "सरकारी सहायता",
        schemesTitle: "सरकारी योजनाएं जिनके लिए आप पात्र हो सकते हैं",
        schemesSubtitle: "आपके परिवार के विवरण के आधार पर।",
        checkEligibility: "पात्रता जाँचें",
        analyzing: "विश्लेषण कर रहा है...",
        missingInfo: "एक छोटा सा सवाल",
        friendlyGuide: "सहायक मित्र",
        newChat: "नई चैट",
        typeQuestion: "अपना सवाल लिखें...",
        familyProfile: "परिवार डेटा",
        profileSubtitle: "अपने खाते और परिवार के विवरण का प्रबंधन करें।",
        primaryMember: "मुख्य सदस्य",
        familyStructure: "परिवार संरचना",
        navHome: "होम",
        navSchemes: "योजनाएं",
        navChat: "चैट",
        navProfile: "प्रोफ़ाइल",
        voiceNotSupported: "इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है।",
        accountSettings: "उपयोगकर्ता खाता",
        email: "ईमेल",
        method: "तरीका",
        deleteAccount: "खाता हटाएं",
        deleteWarning: "यह सभी परिवार और योजना डेटा को स्थायी रूप से हटा देगा।",
        confirmDelete: "हाँ, सब कुछ हटा दें",
        cancel: "रद्द करें",
        save: "सहेजें",
        signOut: "साइन आउट"
    },
    Marathi: {
        hello: "नमस्कार",
        familySummary: "येथे तुमचा कौटुंबिक सारांश आहे.",
        currentStage: "सध्याचा टप्पा",
        edit: "संपादित करा",
        familyOf: "कुटुंबातील सदस्य",
        updatedNow: "आत्ताच अपडेट केले",
        updatePrompt: "काही नवीन घडामोडी?",
        placeholderUpdate: "उदा. माझा मुलगा शाळेत जाऊ लागला...",
        focusAreas: "महत्वाचे क्षेत्र",
        health: "आरोग्य",
        education: "शिक्षण",
        livelihood: "उपजीविका",
        govtSupport: "सरकारी मदत",
        schemesTitle: "सरकारी योजना ज्यासाठी तुम्ही पात्र असू शकता",
        schemesSubtitle: "तुमच्या कौटुंबिक माहितीवर आधारित.",
        checkEligibility: "पात्रता तपासा",
        analyzing: "विश्लेषण करत आहे...",
        missingInfo: "एक प्रश्न",
        friendlyGuide: "मदतनीस",
        newChat: "नवीन चॅट",
        typeQuestion: "तुमचा प्रश्न टाइप करा...",
        familyProfile: "कौटुंबिक माहिती",
        profileSubtitle: "आपले खाते आणि कौटुंबिक तपशील व्यवस्थापित करा.",
        primaryMember: "प्रमुख सदस्य",
        familyStructure: "कुटुंब रचना",
        navHome: "होम",
        navSchemes: "योजना",
        navChat: "चॅट",
        navProfile: "प्रोफाइल",
        voiceNotSupported: "व्हॉइस इनपुट समर्थित नाही.",
        accountSettings: "वापरकर्ता खाते",
        email: "ईमेल",
        method: "पद्धत",
        deleteAccount: "खाते हटवा",
        deleteWarning: "हे सर्व कौटुंबिक आणि योजना डेटा कायमचे काढून टाकेल.",
        confirmDelete: "होय, सर्वकाही हटवा",
        cancel: "रद्द करा",
        save: "जतन करा",
        signOut: "साइन आउट"
    },
    Tamil: {
        hello: "வணக்கம்",
        familySummary: "உங்கள் குடும்ப விவரம்.",
        currentStage: "தற்போதைய நிலை",
        edit: "திருத்து",
        familyOf: "குடும்ப உறுப்பினர்",
        updatedNow: "இப்போது புதுப்பிக்கப்பட்டது",
        updatePrompt: "ஏதேனும் மாற்றம் உள்ளதா?",
        placeholderUpdate: "எ.கா. என் மகன் கல்லூரிக்குச் செல்கிறான்...",
        focusAreas: "முக்கிய பகுதிகள்",
        health: "சுகாதாரம்",
        education: "கல்வி",
        livelihood: "வாழ்வாதாரம்",
        govtSupport: "அரசு உதவி",
        schemesTitle: "தகுதியான அரசு திட்டங்கள்",
        schemesSubtitle: "உங்கள் குடும்ப விவரங்களின் அடிப்படையில்.",
        checkEligibility: "தகுதியை சரிபார்க்கவும்",
        analyzing: "ஆய்வு செய்கிறது...",
        missingInfo: "ஒரு கேள்வி",
        friendlyGuide: "நண்பன்",
        newChat: "புதிய அரட்டை",
        typeQuestion: "கேள்வியைக் கேட்கவும்...",
        familyProfile: "குடும்பத் தரவு",
        profileSubtitle: "உங்கள் கணக்கு மற்றும் குடும்ப விவரங்களை நிர்வகிக்கவும்.",
        primaryMember: "முதன்மை உறுப்பினர்",
        familyStructure: "குடும்ப அமைப்பு",
        navHome: "முகப்பு",
        navSchemes: "திட்டங்கள்",
        navChat: "அரட்டை",
        navProfile: "சுயவிவரம்",
        voiceNotSupported: "குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.",
        accountSettings: "பயனர் கணக்கு",
        email: "மின்னஞ்சல்",
        method: "முறை",
        deleteAccount: "கணக்கை நீக்கு",
        deleteWarning: "இது அனைத்து குடும்ப மற்றும் திட்டத் தரவையும் நிரந்தரமாக அகற்றும்.",
        confirmDelete: "ஆம், அனைத்தையும் நீக்கு",
        cancel: "ரத்துசெய்",
        save: "சேமி",
        signOut: "வெளியேறு"
    },
    Bengali: {
        hello: "নমস্কার",
        familySummary: "এখানে আপনার পরিবারের সারাংশ।",
        currentStage: "বর্তমান পর্যায়",
        edit: "সম্পাদনা",
        familyOf: "পরিবারের সদস্য",
        updatedNow: "এইমাত্র আপডেট করা হয়েছে",
        updatePrompt: "সম্প্রতি কিছু কি পরিবর্তন হয়েছে?",
        placeholderUpdate: "যেমন: আমার ছেলে কলেজে ভর্তি হয়েছে...",
        focusAreas: "ফোকাস এলাকা",
        health: "স্বাস্থ্য",
        education: "শিক্ষা",
        livelihood: "জীবিকা",
        govtSupport: "সরকারি সহায়তা",
        schemesTitle: "সরকারি প্রকল্প যার জন্য আপনি যোগ্য হতে পারেন",
        schemesSubtitle: "আপনার পরিবারের তথ্যের ভিত্তিতে।",
        checkEligibility: "যোগ্যতা যাচাই করুন",
        analyzing: "বিশ্লেষণ করা হচ্ছে...",
        missingInfo: "একটি প্রশ্ন",
        friendlyGuide: "বন্ধু",
        newChat: "নতুন চ্যাট",
        typeQuestion: "আপনার প্রশ্ন লিখুন...",
        familyProfile: "পারিবারিক তথ্য",
        profileSubtitle: "আপনার অ্যাকাউন্ট এবং পরিবারের বিবরণ পরিচালনা করুন।",
        primaryMember: "প্রধান সদস্য",
        familyStructure: "পারিবারিক কাঠামো",
        navHome: "হোম",
        navSchemes: "প্রকল্প",
        navChat: "চ্যাট",
        navProfile: "প্রোফাইল",
        voiceNotSupported: "ভয়েস ইনপুট সমর্থিত নয়।",
        accountSettings: "ব্যবহারকারী অ্যাকাউন্ট",
        email: "ইমেল",
        method: "পদ্ধতি",
        deleteAccount: "অ্যাকাউন্ট মুছুন",
        deleteWarning: "এটি স্থায়ীভাবে সমস্ত পরিবার এবং প্রকল্পের ডেটা সরিয়ে দেবে।",
        confirmDelete: "হ্যাঁ, সব মুছে ফেলুন",
        cancel: "বাতিল",
        save: "সংরক্ষণ",
        signOut: "সাইন আউট"
    }
};

const BCP47_MAP: Record<string, string> = {
    'English': 'en-US',
    'Hindi': 'hi-IN',
    'Marathi': 'mr-IN',
    'Tamil': 'ta-IN',
    'Bengali': 'bn-IN'
};

// -- Wizard Helper Components --

const WizardOptionButton: React.FC<{ label: string, selected: boolean, onClick: () => void }> = ({ label, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left p-4 rounded-xl border font-medium transition-all ${selected ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
    >
        {label}
    </button>
);

const ProgressBar = ({ current, total }: { current: number, total: number }) => (
    <div className="w-full bg-stone-100 h-1.5 rounded-full mb-6 overflow-hidden">
        <div className="bg-teal-500 h-full transition-all duration-300" style={{ width: `${(current / total) * 100}%` }}></div>
    </div>
);

export const CitizenView: React.FC<Props> = ({ user, onSignOut }) => {
  const deviceId = user.uid;

  // Data State
  const [lifeState, setLifeState] = useState<LifeStageUpdate | null>(null);
  const [settings, setSettings] = useState<CitizenSettings>({ isPaused: false, language: 'English' });
  
  // Initialize with safe defaults
  const [profile, setProfile] = useState<CitizenProfile>({
    username: '', 
    memberCount: 1, 
    primaryUser: {},
    spouse: {},
    children: [],
    parents: [],
    siblings: [],
    // Legacy defaults
    isPregnant: false,
    childrenCounts: { age0to1: 0, age1to6: 0, age6to14: 0, age14to18: 0 },
    livelihood: '', 
    incomeStability: 'variable', 
    financialPressure: 'manageable'
  });
  
  // UI State
  const [isSynced, setIsSynced] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'HOME' | 'SCHEMES' | 'CHAT' | 'PROFILE'>('HOME');

  // Wizard State
  const [wizardStep, setWizardStep] = useState(0); 
  const [accountScope, setAccountScope] = useState<'individual' | 'family' | null>(null);
  const [tempConsent, setTempConsent] = useState(false);

  // Wizard Temporary State
  const [tempChildCount, setTempChildCount] = useState<number | null>(null);
  
  // General UI
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [updateInput, setUpdateInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Profile Management State
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Schemes State
  const [schemeData, setSchemeData] = useState<SchemeAnalysisResult | null>(null);
  const [isCheckingSchemes, setIsCheckingSchemes] = useState(false);
  const [missingFieldInput, setMissingFieldInput] = useState('');
  
  // Chat State
  const [chats, setChats] = useState<Record<string, ChatSession>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const t = UI_TEXT[settings.language] || UI_TEXT['English'];
  
  const getProviderName = () => {
    if (user.providerData.length === 0) return 'Email/Password';
    const provider = user.providerData[0].providerId;
    if (provider === 'google.com') return 'Google';
    if (provider === 'password') return 'Email';
    return provider;
  };

  // --- Voice Utils ---
  const speakText = (text: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = BCP47_MAP[settings.language] || 'en-US';
          window.speechSynthesis.speak(utterance);
      }
  };

  const startListening = (setInput: (val: string) => void) => {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = BCP47_MAP[settings.language] || 'en-US';
          recognition.continuous = false;
          
          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setInput(transcript);
          };
          
          recognition.start();
      } else {
          alert(t.voiceNotSupported);
      }
  };

  // --- Auto-detect Language ---
  useEffect(() => {
    // Only detect if no language preference is saved
    if (isSynced && !settings.language) {
         const navLang = navigator.language.split('-')[0];
         let detected: AppLanguage = 'English';
         if (navLang === 'hi') detected = 'Hindi';
         if (navLang === 'mr') detected = 'Marathi';
         if (navLang === 'ta') detected = 'Tamil';
         if (navLang === 'bn') detected = 'Bengali';
         
         if (detected !== 'English') {
             updateSettings({ language: detected });
         }
    }
  }, [isSynced]);

  // --- Firebase Sync ---
  useEffect(() => {
    const householdRef = doc(db, 'households', deviceId);
    const unsubHousehold = onSnapshot(householdRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.profile) {
            // MERGE to ensure sub-objects exist even if DB is partial (Fix for undefined 'age')
            setProfile(prev => ({
                ...prev,
                ...data.profile,
                primaryUser: data.profile.primaryUser || {},
                spouse: data.profile.spouse || {},
                children: data.profile.children || [],
                parents: data.profile.parents || [],
                siblings: data.profile.siblings || []
            }));
        }
        setLifeState(data.lifeState || null);
        if (data.lifeState) setConsentGiven(true);
        if (data.settings?.language) {
            setSettings(prev => ({ ...prev, ...data.settings }));
        }
        setIsSynced(true);
        setIsInitializing(false);
      } else {
        setIsInitializing(false);
      }
    });

    const chatsRef = collection(db, 'households', deviceId, 'chats');
    const qChats = query(chatsRef, orderBy('timestamp', 'desc'));
    const unsubChats = onSnapshot(qChats, (snap) => {
      const newChats: Record<string, ChatSession> = {};
      snap.forEach(doc => { newChats[doc.id] = doc.data() as ChatSession; });
      setChats(newChats);
      if (!activeChatId && snap.docs.length > 0) setActiveChatId(snap.docs[0].id);
    });

    return () => { unsubHousehold(); unsubChats(); };
  }, [deviceId, activeChatId]);

  const saveToFirebase = async (newProfile: CitizenProfile, newLifeState: LifeStageUpdate) => {
    await setDoc(doc(db, 'households', deviceId), { 
        profile: newProfile, lifeState: newLifeState, settings, updatedAt: Date.now() 
    }, { merge: true });
  };

  const updateSettings = async (newSettings: Partial<CitizenSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await setDoc(doc(db, 'households', deviceId), { settings: updated }, { merge: true });
  };

  // --- Core Handlers ---

  const handleUpdate = async () => {
    if (!updateInput.trim() || !lifeState) return;
    setIsAnalyzing(true);
    const result = await analyzeLifeStageChange(lifeState.currentStage, updateInput, settings.language);
    let nextProfile = { ...profile };
    // Simplified update logic for prototype
    setLifeState(result);
    await saveToFirebase(nextProfile, result);
    setUpdateInput('');
    setIsAnalyzing(false);
  };

  const handleSaveUsername = async () => {
      if (!tempUsername.trim()) return;
      const updated = { ...profile, username: tempUsername };
      setProfile(updated);
      await setDoc(doc(db, 'households', deviceId), { profile: updated }, { merge: true });
      setIsEditingUsername(false);
  };
  
  const handleDeleteAccount = async () => {
      try {
          await deleteDoc(doc(db, 'households', deviceId));
          await deleteUser(user);
      } catch (error) {
          console.error("Delete account error", error);
          alert("For security, please sign out and sign in again before deleting your account.");
      }
  };

  const handleCheckSchemes = async () => {
      if (!lifeState) return;
      setIsCheckingSchemes(true);
      setSchemeData(null);
      const result = await getEligibleSchemes(profile, lifeState.currentStage, settings.language);
      setSchemeData(result);
      setIsCheckingSchemes(false);
  };

  const submitMissingSchemeInfo = async () => {
      if (!missingFieldInput.trim() || !schemeData?.missingField) return;
      const updatedProfile = { ...profile, [schemeData.missingField]: missingFieldInput };
      setProfile(updatedProfile);
      setMissingFieldInput('');
      setIsCheckingSchemes(true);
      await setDoc(doc(db, 'households', deviceId), { profile: updatedProfile }, { merge: true });
      const result = await getEligibleSchemes(updatedProfile, lifeState!.currentStage, settings.language);
      setSchemeData(result);
      setIsCheckingSchemes(false);
  };

  const createNewChat = async () => {
      const newId = Date.now().toString();
      const newChat: ChatSession = { id: newId, title: 'New Chat', messages: [], timestamp: Date.now() };
      await setDoc(doc(db, 'households', deviceId, 'chats', newId), newChat);
      setActiveChatId(newId);
      setCurrentView('CHAT');
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || !lifeState) {
          if (!activeChatId) await createNewChat(); 
      }
      
      let currentId = activeChatId;
      if (!currentId) {
           currentId = Date.now().toString();
           const newChat: ChatSession = { id: currentId, title: 'Family Chat', messages: [], timestamp: Date.now() };
           await setDoc(doc(db, 'households', deviceId, 'chats', currentId), newChat);
           setActiveChatId(currentId);
      }

      const userMessage: ChatMessage = { role: 'user', content: chatInput };
      const currentChat = chats[currentId!] || { messages: [] };
      const updatedMessages = [...currentChat.messages, userMessage];
      
      setChatInput('');
      setIsChatLoading(true);
      
      const chatRef = doc(db, 'households', deviceId, 'chats', currentId!);
      await updateDoc(chatRef, { messages: updatedMessages });
      
      const responseText = await getFamilyContextChatResponse(
          profile, lifeState!.currentStage, lifeState!.immediateNeeds,
          updatedMessages, userMessage.content, settings.language,
          schemeData?.schemes // Pass scheme data to AI
      );
      
      const aiMessage: ChatMessage = { role: 'model', content: responseText };
      await updateDoc(chatRef, { messages: [...updatedMessages, aiMessage] });
      setIsChatLoading(false);
      speakText(responseText); // Optional auto-speak response
  };

  // --- Wizard Logic ---

  const nextStep = () => setWizardStep(s => s + 1);
  const prevStep = () => setWizardStep(s => Math.max(0, s - 1));

  const WizardPage = ({ title, children, canProceed, onNext, onBack }: any) => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center gap-3 mb-2">
            {onBack && <button onClick={onBack} className="text-stone-400 hover:text-stone-600"><ArrowLeft size={20}/></button>}
            <h2 className="text-xl font-bold text-stone-800">{title}</h2>
          </div>
          <div className="space-y-4 py-2">
              {children}
          </div>
          {onNext && (
            <button onClick={onNext} disabled={!canProceed} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold mt-4 shadow-lg disabled:opacity-50 disabled:shadow-none">
                Next
            </button>
          )}
      </div>
  );

  const updatePrimary = (field: string, value: any) => {
      setProfile(p => ({ ...p, primaryUser: { ...p.primaryUser, [field]: value } }));
  };
  const updateSpouse = (field: string, value: any) => {
    setProfile(p => ({ ...p, spouse: { ...p.spouse, [field]: value } }));
  };

  const finishWizard = async () => {
    setIsInitializing(true);
    // Derive high-level fields for compatibility
    const updatedProfile = {
        ...profile,
        memberCount: 1 + (profile.spouse ? 1 : 0) + (profile.children?.length || 0) + (profile.parents?.length || 0) + (profile.siblings?.length || 0),
        state: profile.primaryUser.state,
        livelihood: profile.primaryUser.occupation,
        residenceType: profile.primaryUser.residenceType
    };
    const init = await generateInitialSnapshot(updatedProfile, settings.language);
    setLifeState(init);
    await saveToFirebase(updatedProfile, init);
    setConsentGiven(true);
    setIsInitializing(false);
  };


  // --- Render ---

  if (isInitializing) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-teal-600 w-8 h-8" /></div>;

  // --- Wizard Flow ---
  if (!consentGiven || !lifeState) {
      return (
          <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-stone-100">
                  {/* ... (Existing Wizard Steps preserved) ... */}
                  {/* Step 0: Welcome */}
                  {wizardStep === 0 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex justify-center mb-6">
                              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600"><Activity size={32} /></div>
                          </div>
                          <h1 className="text-2xl font-bold text-stone-800 text-center">Welcome to ConnectiVita</h1>
                          <p className="text-stone-500 text-center text-sm px-2">This space helps you understand life stages and government schemes.</p>
                          
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-3">
                              {['We ask questions to match schemes accurately.', 'You control what you share.', 'No documents are required.'].map((txt, i) => (
                                  <div key={i} className="flex gap-3 items-start">
                                      <div className="bg-white p-1 rounded shadow-sm"><Check size={14} className="text-teal-600"/></div>
                                      <p className="text-xs text-stone-600">{txt}</p>
                                  </div>
                              ))}
                          </div>

                          <div className="space-y-3 pt-2">
                              <p className="text-sm font-bold text-stone-700">Who are you creating this account for?</p>
                              {[
                                  { id: 'individual', icon: UserIcon, label: 'Only for myself' },
                                  { id: 'family', icon: Users, label: 'For myself and my entire family' }
                              ].map(opt => (
                                  <button key={opt.id} onClick={() => setAccountScope(opt.id as any)} className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${accountScope === opt.id ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-stone-200 hover:border-teal-200'}`}>
                                      <opt.icon size={20} className={accountScope === opt.id ? 'text-teal-600' : 'text-stone-400'} />
                                      <span className={`text-sm font-medium ${accountScope === opt.id ? 'text-teal-800' : 'text-stone-600'}`}>{opt.label}</span>
                                  </button>
                              ))}
                          </div>

                          <div className="pt-4 border-t border-stone-100">
                              <label className="flex gap-3 items-start cursor-pointer group">
                                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${tempConsent ? 'bg-teal-600 border-teal-600' : 'border-stone-300 group-hover:border-teal-400'}`}>{tempConsent && <Check size={14} className="text-white" />}</div>
                                  <input type="checkbox" className="hidden" checked={tempConsent} onChange={e => setTempConsent(e.target.checked)} />
                                  <span className="text-xs text-stone-500 select-none">I understand that I will be asked personal and family details to identify scheme eligibility.</span>
                              </label>
                          </div>
                          <button onClick={nextStep} disabled={!accountScope || !tempConsent} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">Continue</button>
                      </div>
                  )}

                  {/* Primary User Details */}
                  {wizardStep > 0 && <ProgressBar current={wizardStep} total={10} />}

                  {wizardStep === 1 && (
                      <WizardPage title="About You" canProceed={!!profile.primaryUser?.age} onNext={nextStep} onBack={prevStep}>
                           <label className="block text-sm font-medium text-stone-600">Your Age</label>
                           <input type="number" className="w-full p-3 border rounded-xl" value={profile.primaryUser?.age || ''} onChange={e => updatePrimary('age', parseInt(e.target.value))} placeholder="e.g. 35" />
                           
                           <label className="block text-sm font-medium text-stone-600 mt-4">Gender</label>
                           <div className="flex gap-2">
                               {['Male', 'Female', 'Other'].map(g => (
                                   <button key={g} onClick={() => updatePrimary('gender', g)} className={`flex-1 py-2 border rounded-lg ${profile.primaryUser?.gender === g ? 'bg-teal-600 text-white' : 'bg-white'}`}>{g}</button>
                               ))}
                           </div>

                           <label className="block text-sm font-medium text-stone-600 mt-4">Marital Status</label>
                           <select className="w-full p-3 border rounded-xl bg-white" value={profile.primaryUser?.maritalStatus || ''} onChange={e => updatePrimary('maritalStatus', e.target.value)}>
                               <option value="">Select...</option>
                               {['Single', 'Married', 'Widowed', 'Divorced'].map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                      </WizardPage>
                  )}

                  {wizardStep === 2 && (
                       <WizardPage title="Your Situation" canProceed={!!profile.primaryUser?.state} onNext={nextStep} onBack={prevStep}>
                           <label className="block text-sm font-medium text-stone-600">State of Residence</label>
                           <select className="w-full p-3 border rounded-xl bg-white" value={profile.primaryUser?.state || ''} onChange={e => updatePrimary('state', e.target.value)}>
                               <option value="">Select State...</option>
                               {['Maharashtra', 'Bihar', 'Uttar Pradesh', 'Tamil Nadu', 'West Bengal', 'Karnataka', 'Rajasthan'].map(s => <option key={s} value={s}>{s}</option>)}
                           </select>

                           <label className="block text-sm font-medium text-stone-600 mt-4">Area Type</label>
                           <div className="flex gap-2">
                               {['Urban', 'Rural'].map(t => (
                                   <button key={t} onClick={() => updatePrimary('residenceType', t)} className={`flex-1 py-2 border rounded-lg ${profile.primaryUser?.residenceType === t ? 'bg-teal-600 text-white' : 'bg-white'}`}>{t}</button>
                               ))}
                           </div>

                           <label className="block text-sm font-medium text-stone-600 mt-4">Disability Status</label>
                           <div className="flex gap-2">
                               <button onClick={() => updatePrimary('disability', false)} className={`flex-1 py-2 border rounded-lg ${profile.primaryUser?.disability === false ? 'bg-teal-600 text-white' : 'bg-white'}`}>No</button>
                               <button onClick={() => updatePrimary('disability', true)} className={`flex-1 py-2 border rounded-lg ${profile.primaryUser?.disability === true ? 'bg-teal-600 text-white' : 'bg-white'}`}>Yes</button>
                           </div>
                       </WizardPage>
                  )}

                  {wizardStep === 3 && (
                      <WizardPage title="Work & Income" canProceed={!!profile.primaryUser?.occupation} onNext={() => {
                          if (profile.primaryUser?.maritalStatus === 'Married') nextStep();
                          else setWizardStep(5); // Skip spouse
                      }} onBack={prevStep}>
                           <label className="block text-sm font-medium text-stone-600">Occupation</label>
                           <input type="text" className="w-full p-3 border rounded-xl" value={profile.primaryUser?.occupation || ''} onChange={e => updatePrimary('occupation', e.target.value)} placeholder="e.g. Farmer, Teacher" />

                           <label className="block text-sm font-medium text-stone-600 mt-4">Annual Income Range</label>
                           <div className="space-y-2">
                               {['< ₹1 Lakh', '₹1L - ₹3L', '₹3L - ₹6L', '> ₹6L'].map(r => (
                                   <WizardOptionButton key={r} label={r} selected={profile.primaryUser?.incomeRange === r} onClick={() => updatePrimary('incomeRange', r)} />
                               ))}
                           </div>
                      </WizardPage>
                  )}

                  {/* Spouse Step */}
                  {wizardStep === 4 && (
                      <WizardPage title="Spouse Details" canProceed={true} onNext={nextStep} onBack={prevStep}>
                           <label className="block text-sm font-medium text-stone-600">Spouse Age</label>
                           <input type="number" className="w-full p-3 border rounded-xl" value={profile.spouse?.age || ''} onChange={e => updateSpouse('age', parseInt(e.target.value))} />

                           <label className="block text-sm font-medium text-stone-600 mt-4">Working Status</label>
                           <select className="w-full p-3 border rounded-xl bg-white" value={profile.spouse?.workingStatus || ''} onChange={e => updateSpouse('workingStatus', e.target.value)}>
                               <option value="">Select...</option>
                               {['Working', 'Homemaker', 'Unemployed'].map(s => <option key={s} value={s}>{s}</option>)}
                           </select>

                           {profile.primaryUser?.gender === 'Male' && (
                               <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                                   <label className="flex items-center gap-3">
                                       <input type="checkbox" className="w-5 h-5 text-teal-600" checked={profile.spouse?.isPregnant || false} onChange={e => updateSpouse('isPregnant', e.target.checked)} />
                                       <span className="font-medium text-teal-900">Is she currently pregnant?</span>
                                   </label>
                               </div>
                           )}
                      </WizardPage>
                  )}

                  {/* Children Step */}
                  {wizardStep === 5 && (
                      <WizardPage title="Children" canProceed={true} onNext={nextStep} onBack={prevStep}>
                          <label className="block text-sm font-medium text-stone-600">Number of children</label>
                          <input type="number" autoFocus className="w-full p-4 border rounded-xl text-2xl text-center" value={tempChildCount !== null ? tempChildCount : ''} onChange={e => {
                              const val = parseInt(e.target.value);
                              setTempChildCount(val);
                              // Reset children array if count changes (simple implementation)
                              if (!isNaN(val)) {
                                  setProfile(p => ({ ...p, children: Array(val).fill({ id: 'temp', age: 0, gender: 'Male', studentStatus: true }) }));
                              }
                          }} placeholder="0" />
                          
                           {(tempChildCount || 0) > 0 && (
                               <div className="mt-4 space-y-4 max-h-60 overflow-y-auto">
                                   {profile.children?.map((child, idx) => (
                                       <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                                           <div className="text-xs font-bold text-stone-400 mb-2">Child {idx+1}</div>
                                           <div className="flex gap-2 mb-2">
                                               <input type="number" placeholder="Age" className="w-20 p-2 rounded border" value={child.age || ''} onChange={e => {
                                                   const newChildren = [...(profile.children || [])];
                                                   newChildren[idx] = { ...newChildren[idx], age: parseInt(e.target.value) };
                                                   setProfile(p => ({ ...p, children: newChildren }));
                                               }} />
                                               <select className="flex-1 p-2 rounded border" value={child.gender} onChange={e => {
                                                    const newChildren = [...(profile.children || [])];
                                                    newChildren[idx] = { ...newChildren[idx], gender: e.target.value as any };
                                                    setProfile(p => ({ ...p, children: newChildren }));
                                               }}>
                                                   <option value="Male">Boy</option>
                                                   <option value="Female">Girl</option>
                                               </select>
                                           </div>
                                            <label className="flex items-center gap-2 text-xs">
                                                <input type="checkbox" checked={child.studentStatus} onChange={e => {
                                                     const newChildren = [...(profile.children || [])];
                                                     newChildren[idx] = { ...newChildren[idx], studentStatus: e.target.checked };
                                                     setProfile(p => ({ ...p, children: newChildren }));
                                                }} /> Is a student
                                            </label>
                                       </div>
                                   ))}
                               </div>
                           )}
                      </WizardPage>
                  )}

                  {/* Parents */}
                  {wizardStep === 6 && (
                      <WizardPage title="Parents" canProceed={true} onNext={nextStep} onBack={prevStep}>
                          <p className="mb-4 text-stone-600 text-sm">Do you support your parents living with you?</p>
                          <div className="space-y-3">
                              <WizardOptionButton label="Yes, both parents" selected={profile.parents?.length === 2} onClick={() => setProfile(p => ({ ...p, parents: [{relation:'Father'}, {relation:'Mother'}] as any }))} />
                              <WizardOptionButton label="Yes, father only" selected={profile.parents?.length === 1 && profile.parents[0].relation === 'Father'} onClick={() => setProfile(p => ({ ...p, parents: [{relation:'Father'}] as any }))} />
                              <WizardOptionButton label="Yes, mother only" selected={profile.parents?.length === 1 && profile.parents[0].relation === 'Mother'} onClick={() => setProfile(p => ({ ...p, parents: [{relation:'Mother'}] as any }))} />
                              <WizardOptionButton label="No / Not applicable" selected={profile.parents?.length === 0} onClick={() => setProfile(p => ({ ...p, parents: [] }))} />
                          </div>
                      </WizardPage>
                  )}
                  
                  {/* Community */}
                  {wizardStep === 7 && (
                      <WizardPage title="Community Category" canProceed={true} onNext={finishWizard} onBack={prevStep}>
                          <p className="text-sm text-stone-500 mb-4">This helps identify specific reservation-based schemes.</p>
                          <div className="space-y-2">
                              {['General', 'SC', 'ST', 'OBC', 'Minority', 'Prefer not to say'].map(c => (
                                  <WizardOptionButton key={c} label={c} selected={profile.socialCategory === c} onClick={() => setProfile(p => ({ ...p, socialCategory: c }))} />
                              ))}
                          </div>
                      </WizardPage>
                  )}
              </div>
          </div>
      )
  }

  // --- Main Dashboard Views ---

  const activeChat = activeChatId ? chats[activeChatId] : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-24 font-sans">
        
        {/* VIEW: HOME */}
        {currentView === 'HOME' && (
            <div className="max-w-xl mx-auto p-5 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Greeting */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800">{t.hello}, {profile.username || 'Friend'} 👋</h1>
                        <p className="text-sm text-stone-400">{t.familySummary}</p>
                    </div>
                    <button onClick={() => setCurrentView('PROFILE')} className="relative">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 border border-teal-200 shadow-sm">
                            <UserIcon size={20} />
                        </div>
                    </button>
                </div>

                {/* 1. Family Snapshot */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t.currentStage}</span>
                                </div>
                                <h2 className="text-xl font-bold text-stone-800">{lifeState?.currentStage}</h2>
                             </div>
                             <button onClick={() => setWizardStep(1)} className="text-teal-600 text-sm font-bold bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition">
                                {t.edit}
                             </button>
                        </div>
                        
                        <div className="flex items-center gap-4 text-stone-500 text-sm mb-4">
                            <div className="flex items-center gap-1.5">
                                <Users size={16} />
                                <span>{t.familyOf} {profile.memberCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={16} />
                                <span>{t.updatedNow}</span>
                            </div>
                        </div>

                        <p className="text-stone-600 text-sm leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                            {lifeState?.explanation}
                        </p>
                    </div>
                </section>

                {/* 2. Update Input */}
                <section>
                    <h3 className="font-bold text-stone-800 mb-3 ml-1">{t.updatePrompt}</h3>
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-stone-100 flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-3 outline-none text-stone-700 placeholder:text-stone-300 bg-transparent"
                            placeholder={t.placeholderUpdate}
                            value={updateInput}
                            onChange={e => setUpdateInput(e.target.value)}
                        />
                         <button onClick={() => startListening(setUpdateInput)} className="p-3 text-stone-400 hover:text-teal-600 bg-stone-50 rounded-xl transition"><Mic size={20}/></button>
                         <button onClick={handleUpdate} disabled={isAnalyzing || !updateInput} className="p-3 bg-stone-800 text-white rounded-xl shadow-md hover:bg-stone-700 disabled:opacity-50 transition">
                             {isAnalyzing ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                         </button>
                    </div>
                </section>

                {/* 3. Focus Areas */}
                <section>
                    <h3 className="font-bold text-stone-800 mb-3 ml-1">{t.focusAreas}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { setCurrentView('CHAT'); setTimeout(() => setChatInput("What health advice do you have for my family?"), 100); }} className="bg-rose-50 p-5 rounded-2xl text-left hover:bg-rose-100 transition border border-rose-100">
                            <Heart className="text-rose-500 mb-3" size={24} />
                            <div className="font-bold text-rose-900">{t.health}</div>
                        </button>

                        <button onClick={() => { setCurrentView('CHAT'); setTimeout(() => setChatInput("How can I support my family's education needs?"), 100); }} className="bg-sky-50 p-5 rounded-2xl text-left hover:bg-sky-100 transition border border-sky-100">
                            <BookOpenIcon className="text-sky-500 mb-3" size={24} />
                            <div className="font-bold text-sky-900">{t.education}</div>
                        </button>

                        <button onClick={() => { setCurrentView('CHAT'); setTimeout(() => setChatInput("What are good livelihood opportunities for us?"), 100); }} className="bg-amber-50 p-5 rounded-2xl text-left hover:bg-amber-100 transition border border-amber-100">
                            <BriefcaseIcon className="text-amber-500 mb-3" size={24} />
                            <div className="font-bold text-amber-900">{t.livelihood}</div>
                        </button>

                        <button onClick={() => setCurrentView('SCHEMES')} className="bg-indigo-50 p-5 rounded-2xl text-left hover:bg-indigo-100 transition border border-indigo-100">
                            <Sparkles className="text-indigo-500 mb-3" size={24} />
                            <div className="font-bold text-indigo-900">{t.govtSupport}</div>
                        </button>
                    </div>
                </section>
            </div>
        )}

        {/* VIEW: SCHEMES */}
        {currentView === 'SCHEMES' && (
            <div className="max-w-xl mx-auto p-5 animate-in fade-in slide-in-from-right-4">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-stone-800">{t.schemesTitle}</h1>
                    <p className="text-stone-500 text-sm">{t.schemesSubtitle}</p>
                </header>
                {/* ... (Scheme rendering logic same as before) ... */}
                <div className="space-y-8 pb-20"> {/* pb-20 for bottom nav clearance */}
                     {!schemeData && !isCheckingSchemes && (
                         <div className="text-center py-10">
                             <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                 <Sparkles size={32} />
                             </div>
                             <p className="text-stone-600 mb-6 max-w-xs mx-auto">We scan 100+ schemes to find exactly what you qualify for.</p>
                             <button onClick={handleCheckSchemes} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition">
                                 {t.checkEligibility}
                             </button>
                         </div>
                     )}

                     {isCheckingSchemes && (
                         <div className="flex flex-col items-center justify-center py-20 text-stone-500">
                            <Loader2 className="animate-spin mb-4 text-indigo-600" size={32} />
                            <span className="font-medium">{t.analyzing}</span>
                        </div>
                     )}

                     {schemeData && !isCheckingSchemes && (
                        <div>
                             {schemeData.status === 'missing_info' ? (
                                <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                                    <h3 className="font-bold text-amber-800 mb-2">{t.missingInfo}</h3>
                                    <p className="text-sm text-amber-700 mb-4">{schemeData.missingFieldQuestion}</p>
                                    <div className="flex gap-2">
                                        <input type="text" autoFocus className="flex-1 border border-amber-200 p-2 rounded-lg" value={missingFieldInput} onChange={e => setMissingFieldInput(e.target.value)} />
                                        <button onClick={submitMissingSchemeInfo} className="bg-amber-600 text-white p-2 rounded-lg"><Send size={18}/></button>
                                    </div>
                                </div>
                            ) : schemeData.schemes ? (
                                <div className="space-y-8">
                                    {Array.from(new Set(schemeData.schemes.map(s => s.beneficiary))).map(beneficiary => (
                                        <div key={beneficiary} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                                            {/* Person Header */}
                                            <div className="flex items-center gap-3 mb-4 border-b border-stone-100 pb-3">
                                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                                    <UserIcon size={20} />
                                                </div>
                                                <h3 className="font-bold text-stone-800 text-lg">{beneficiary}</h3>
                                            </div>

                                            {/* Schemes List for this person */}
                                            <div className="space-y-4">
                                                {schemeData.schemes!.filter(s => s.beneficiary === beneficiary).map((s, idx) => (
                                                    <div key={idx} className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-stone-900 text-base">{s.name}</h4>
                                                            <button onClick={() => speakText(`${s.name}. ${s.description}`)} className="text-stone-400 hover:text-stone-600 p-1"><Volume2 size={16}/></button>
                                                        </div>
                                                        
                                                        <p className="text-sm text-stone-600 mb-3 leading-relaxed">
                                                            {s.description}
                                                        </p>

                                                        <div className="bg-white p-3 rounded-lg border border-stone-100 mb-3">
                                                            <span className="block text-[10px] uppercase font-bold text-teal-600 mb-1">Why Eligible</span>
                                                            <p className="text-xs text-stone-700">{s.eligibilityReason}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="text-center pt-4">
                                         <button onClick={handleCheckSchemes} className="text-indigo-600 text-sm font-bold hover:underline">
                                             Check Again
                                         </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-stone-500">
                                    No specific schemes found right now.
                                </div>
                            )}
                        </div>
                     )}
                </div>
            </div>
        )}

        {/* VIEW: CHAT */}
        {currentView === 'CHAT' && (
             <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-right-4">
                 <div className="p-4 border-b border-stone-200 bg-white flex justify-between items-center sticky top-0 z-10">
                     <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center"><MessageCircle size={18} /></div>
                         <h1 className="font-bold text-stone-800">{t.friendlyGuide}</h1>
                     </div>
                     <button onClick={createNewChat} className="text-xs bg-stone-100 px-3 py-1.5 rounded-full font-bold text-stone-600 hover:bg-stone-200">{t.newChat}</button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
                    {activeChat?.messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-8">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><Sparkles size={24} className="text-teal-400"/></div>
                            <p className="font-medium text-stone-600 mb-1">How can I help you today?</p>
                        </div>
                    )}
                    {activeChat?.messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-stone-800 rounded-bl-none border border-stone-100'}`}>
                                {msg.content}
                                {msg.role === 'model' && (
                                    <div className="mt-2 pt-2 border-t border-stone-100 flex justify-end">
                                        <button onClick={() => speakText(msg.content)} className="opacity-40 hover:opacity-100 transition"><Volume2 size={14}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && <div className="flex justify-start"><div className="bg-stone-200 px-4 py-2 rounded-full text-xs text-stone-500 animate-pulse">Thinking...</div></div>}
                    <div ref={messagesEndRef}/>
                </div>

                <div className="p-4 bg-white border-t border-stone-200">
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <button type="button" onClick={() => startListening(setChatInput)} className="p-3 bg-stone-100 rounded-xl text-stone-500 hover:bg-stone-200 transition"><Mic size={20}/></button>
                        <input type="text" className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-teal-400 outline-none transition" placeholder={t.typeQuestion} value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatLoading}/>
                        <button type="submit" disabled={!chatInput} className="p-3 bg-teal-600 rounded-xl text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition"><Send size={20}/></button>
                    </form>
                </div>
             </div>
        )}

        {/* VIEW: PROFILE */}
        {currentView === 'PROFILE' && (
            <div className="max-w-xl mx-auto p-5 animate-in fade-in slide-in-from-right-4">
                 <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800">{t.familyProfile}</h1>
                        <p className="text-stone-500 text-sm">{t.profileSubtitle}</p>
                    </div>
                    <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="bg-white p-2 rounded-full shadow-sm border border-stone-100 text-stone-500 relative">
                        <Globe size={20} />
                        {showLanguageMenu && (
                            <div className="absolute top-10 right-0 z-50 bg-white rounded-xl shadow-xl border border-stone-100 p-2 min-w-[140px]">
                                {LANGUAGES.map(lang => (
                                    <button key={lang} onClick={() => { updateSettings({ language: lang }); setShowLanguageMenu(false); }} className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${settings.language === lang ? 'bg-teal-50 text-teal-700 font-bold' : 'hover:bg-stone-50'}`}>
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        )}
                    </button>
                </header>

                <div className="space-y-6">
                    {/* User Account Section */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><UserIcon size={120} /></div>
                        <h3 className="font-bold text-stone-800 mb-4 border-b border-stone-100 pb-2 flex items-center gap-2 relative z-10">
                            {t.accountSettings}
                        </h3>
                        
                        <div className="space-y-4 relative z-10">
                            {/* Username with Edit */}
                            <div>
                                <span className="block text-stone-400 text-xs uppercase tracking-wider mb-1">Username</span>
                                {isEditingUsername ? (
                                    <div className="flex gap-2">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            className="flex-1 border border-teal-300 rounded-lg px-2 py-1 text-sm outline-none bg-teal-50"
                                            value={tempUsername}
                                            onChange={e => setTempUsername(e.target.value)}
                                        />
                                        <button onClick={handleSaveUsername} className="bg-teal-600 text-white px-3 py-1 rounded-lg text-xs font-bold">{t.save}</button>
                                        <button onClick={() => setIsEditingUsername(false)} className="bg-stone-200 text-stone-600 px-3 py-1 rounded-lg text-xs">{t.cancel}</button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center group">
                                        <span className="font-medium text-stone-800 text-lg">{profile.username}</span>
                                        <button onClick={() => { setTempUsername(profile.username || ''); setIsEditingUsername(true); }} className="text-teal-600 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-teal-50 rounded">
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Email & Method */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-stone-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Mail size={10} /> {t.email}</span>
                                    <span className="text-sm font-medium text-stone-600">{user.email}</span>
                                </div>
                                <div>
                                    <span className="block text-stone-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Key size={10} /> {t.method}</span>
                                    <span className="text-sm font-medium text-stone-600 capitalize">{getProviderName()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col gap-3 relative z-10">
                            <button onClick={onSignOut} className="w-full py-3 rounded-xl bg-stone-100 text-stone-600 font-bold text-sm hover:bg-stone-200 transition flex items-center justify-center gap-2">
                                <LogOut size={16} /> {t.signOut}
                            </button>
                            
                            {!showDeleteConfirm ? (
                                <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-400 hover:text-red-600 font-medium text-center mt-1">
                                    {t.deleteAccount}
                                </button>
                            ) : (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-2 items-start mb-2">
                                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-700 font-medium">{t.deleteWarning}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleDeleteAccount} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-red-700">{t.confirmDelete}</button>
                                        <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 bg-white border border-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50">{t.cancel}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Family Data Summary (ReadOnly) */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm opacity-80">
                        <h3 className="font-bold text-stone-800 mb-4 border-b border-stone-100 pb-2">{t.familyStructure}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-600">Total Members</span>
                                <span className="font-bold text-stone-800">{profile.memberCount}</span>
                            </div>
                             {profile.primaryUser?.state && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-stone-600">Location</span>
                                    <span className="font-bold text-stone-800">{profile.primaryUser.state}</span>
                                </div>
                            )}
                            <button onClick={() => { setWizardStep(1); setCurrentView('HOME'); }} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 font-bold text-xs hover:bg-stone-50 hover:border-stone-300 transition">
                                {t.edit}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* BOTTOM NAVIGATION */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-2 pb-5 flex justify-between items-center z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
            <button 
                onClick={() => setCurrentView('HOME')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'HOME' ? 'text-teal-600 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
            >
                <Home size={24} strokeWidth={currentView === 'HOME' ? 2.5 : 2} />
                <span className="text-[10px]">{t.navHome}</span>
            </button>

            <button 
                onClick={() => setCurrentView('SCHEMES')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'SCHEMES' ? 'text-teal-600 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
            >
                <FileText size={24} strokeWidth={currentView === 'SCHEMES' ? 2.5 : 2} />
                <span className="text-[10px]">{t.navSchemes}</span>
            </button>

            <button 
                onClick={() => setCurrentView('CHAT')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'CHAT' ? 'text-teal-600 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
            >
                <MessageCircle size={24} strokeWidth={currentView === 'CHAT' ? 2.5 : 2} />
                <span className="text-[10px]">{t.navChat}</span>
            </button>

            <button 
                onClick={() => setCurrentView('PROFILE')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'PROFILE' ? 'text-teal-600 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
            >
                <User size={24} strokeWidth={currentView === 'PROFILE' ? 2.5 : 2} />
                <span className="text-[10px]">{t.navProfile}</span>
            </button>
        </div>
    </div>
  );
};

// Simple Icon Placeholders for specific sections to avoid huge import list
const BookOpenIcon = ({className, size}: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
const BriefcaseIcon = ({className, size}: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
);
