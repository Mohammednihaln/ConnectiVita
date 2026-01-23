
import React from 'react';
import { Users, Activity } from 'lucide-react';
import { UserRole } from '../types';

interface Props {
  onSelect: (role: UserRole) => void;
  isSaving: boolean;
}

export const RoleSelection: React.FC<Props> = ({ onSelect, isSaving }) => {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-stone-800 mb-3">Which best describes you right now?</h1>
          <p className="text-stone-500">This sets up your personalized experience.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
                onClick={() => onSelect('citizen')}
                disabled={isSaving}
                className="group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-stone-100 text-left"
            >
                <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mb-6">
                    <Users size={28} />
                </div>
                <h2 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-teal-700 transition-colors">
                    I’m here for my family
                </h2>
                <p className="text-stone-500 text-sm leading-relaxed">
                    Track your family’s stages, get personalized guidance, and build your household snapshot.
                </p>
            </button>

            <button 
                onClick={() => onSelect('worker')}
                disabled={isSaving}
                className="group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-stone-100 text-left"
            >
                <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mb-6">
                    <Activity size={28} />
                </div>
                <h2 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-indigo-700 transition-colors">
                    I support the community
                </h2>
                <p className="text-stone-500 text-sm leading-relaxed">
                    For frontline workers and volunteers. View anonymized data and coordinate support efforts.
                </p>
            </button>
        </div>

        {isSaving && (
             <div className="mt-8 text-center text-stone-400 text-sm animate-pulse">
                Setting up your space...
             </div>
        )}

      </div>
    </div>
  );
};
