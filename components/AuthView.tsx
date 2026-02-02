
import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Activity, Loader2, ShieldCheck } from 'lucide-react';

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

    // Client-side validation
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
             // Initialize defaults so the Welcome Wizard can pick up later
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
      const errorCode = err.code;
      
      // Handle known operational errors gracefully without console noise
      if (
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/invalid-login-credentials'
      ) {
        setError("Invalid email or password. Please check your details.");
      } else if (errorCode === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (errorCode === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        // Log unexpected errors
        console.error("Auth Error:", err);
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
      
      // Ensure profile document exists for new Google users
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
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign in cancelled.");
      } else {
        setError("Unable to connect with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-100 p-8">
        
        <div className="text-center mb-8">
          <div className="bg-teal-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-200">
            <Activity size={24} />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">ConnectiVita</h1>
          <p className="text-stone-500 mt-2 text-sm leading-relaxed">
             A calm guide to understand life stages and government support.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 text-center font-medium border border-red-100 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 ml-1">Username</label>
              <input 
                type="text" 
                required={!isLogin}
                className="w-full p-4 rounded-xl bg-stone-50 border border-stone-200 focus:border-teal-500 outline-none transition-all"
                placeholder="Your Name"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 ml-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-4 rounded-xl bg-stone-50 border border-stone-200 focus:border-teal-500 outline-none transition-all"
              placeholder="name@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 ml-1">Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              className="w-full p-4 rounded-xl bg-stone-50 border border-stone-200 focus:border-teal-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {!isLogin && <p className="text-xs text-stone-400 mt-1 ml-1">Must be at least 6 characters.</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold hover:bg-stone-800 transition shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-stone-400 font-medium">Or</span></div>
        </div>

        <button onClick={handleGoogleAuth} type="button" disabled={loading} className="w-full bg-white border-2 border-stone-100 text-stone-700 py-3 rounded-xl font-semibold hover:bg-stone-50 transition flex items-center justify-center gap-2">
            Continue with Google
        </button>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setUsername(''); setError(''); }}
            className="font-bold text-teal-600 hover:text-teal-800 text-sm"
          >
            {isLogin ? "Create new account" : "I already have an account"}
          </button>
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-stone-400 text-xs">
            <ShieldCheck size={14} />
            <span>Private & Secure</span>
        </div>

      </div>
    </div>
  );
};
