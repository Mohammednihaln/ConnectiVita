
import React, { useState, useEffect } from 'react';
import { CitizenView } from './components/CitizenView';
import { AuthView } from './components/AuthView';
import { auth } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  // 1. Not Logged In
  if (!user) {
    return <AuthView />;
  }

  // 2. Logged In (Default to Citizen/Family View)
  return <CitizenView user={user} onSignOut={handleSignOut} />;
};

export default App;
