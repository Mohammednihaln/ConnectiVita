
import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Activity, Loader2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const AuthView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        setLoading(false);
        return;
    }
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!username.trim()) {
           setError("Please enter a username.");
           setLoading(false);
           return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'households', userCredential.user.uid), {
           profile: {
             username: username.trim(),
             memberCount: 0,
             isPregnant: false,
             childrenCounts: { age0to1: 0, age1to6: 0, age6to14: 0, age14to18: 0 },
             livelihood: '',
           },
           settings: { language: 'English' },
           updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Unable to complete request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const userRef = doc(db, 'households', result.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
           await setDoc(userRef, {
           profile: {
             username: result.user.displayName || "New User",
             memberCount: 0,
             isPregnant: false,
             childrenCounts: { age0to1: 0, age1to6: 0, age6to14: 0, age14to18: 0 },
             livelihood: '',
           },
           settings: { language: 'English' },
           updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0 bg-white/60 backdrop-blur-2xl rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden">
        
        {/* Left Side - Brand */}
        <div className="bg-indigo-600 p-12 flex flex-col justify-between relative overflow-hidden text-white rounded-[3rem] md:rounded-l-[3rem] md:rounded-r-none m-2 md:m-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[80px] -ml-20 -mb-20"></div>
            
            <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                    <Activity size={28} className="text-white" />
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
                    Connecti<br/>Vita.
                </h1>
                <p className="text-indigo-100 text-lg font-medium max-w-xs leading-relaxed">
                    Your intelligent companion for every life transition.
                </p>
            </div>

            <div className="relative z-10 mt-12 flex items-center gap-3 text-sm font-semibold text-indigo-200">
                <Sparkles size={16} />
                <span>Family First OS</span>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
            
            <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                {isLogin ? "Welcome Back" : "Start Your Journey"}
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
            </h2>

            {error && (
            <div className="bg-rose-50/50 text-rose-600 p-4 rounded-2xl text-sm mb-6 font-semibold border border-rose-100 flex items-center gap-3">
                <ShieldCheck size={18} className="shrink-0" />
                {error}
            </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-5">
            {!isLogin && (
                <div className="group">
                <input 
                    type="text" 
                    required={!isLogin}
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium text-lg"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                </div>
            )}

            <div className="group">
                <input 
                type="email" 
                required
                className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium text-lg"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                />
            </div>
            <div className="group">
                <input 
                type="password" 
                required
                minLength={6}
                className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium text-lg"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 mt-6"
            >
                {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight size={20} />
                    </>
                )}
            </button>
            </form>

            <div className="relative my-8 text-center">
                <span className="bg-transparent px-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Or</span>
            </div>

            <button onClick={handleGoogleAuth} type="button" disabled={loading} className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-4 rounded-2xl font-bold hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all flex items-center justify-center gap-3">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 opacity-70" />
                Google
            </button>

            <div className="mt-8 text-center">
            <button 
                onClick={() => { setIsLogin(!isLogin); setUsername(''); setError(''); }}
                className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors border-b border-transparent hover:border-indigo-600"
            >
                {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};
