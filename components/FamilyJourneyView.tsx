
import React from 'react';
import { ArrowLeft, GitCommit, Info } from 'lucide-react';
import { LifeJourneyEntry } from '../types';

interface Props {
  entries: LifeJourneyEntry[];
  onBack: () => void;
}

export const FamilyJourneyView: React.FC<Props> = ({ entries, onBack }) => {
  // Sort descending by time
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white sticky top-0 z-20 border-b border-stone-200 px-4 py-4 flex items-center gap-4 shadow-sm">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-full transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
           <h1 className="font-bold text-stone-800 text-lg leading-none">Your Family’s Life Journey</h1>
           <p className="text-stone-400 text-xs mt-1">A reflective record of how far you’ve come.</p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 relative">
         {/* Vertical Timeline Line */}
         <div className="absolute left-9 top-6 bottom-0 w-0.5 bg-stone-200"></div>

         <div className="space-y-12">
            {sortedEntries.length === 0 ? (
                <div className="ml-12 p-6 bg-white rounded-2xl border border-stone-100 text-stone-500 text-sm">
                    Your journey history will appear here as you update your snapshot.
                </div>
            ) : (
                sortedEntries.map((entry, idx) => (
                    <div key={entry.id} className="relative flex gap-6 animate-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${idx * 100}ms`}}>
                        
                        {/* Dot */}
                        <div className="relative z-10 shrink-0 mt-1">
                             <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                <GitCommit size={14} className="text-teal-600" />
                             </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                                {entry.date}
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-stone-800 font-medium text-lg leading-relaxed mb-3">
                                    "{entry.summary}"
                                </p>
                                {entry.lifeStagesAfter && entry.lifeStagesAfter.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {entry.lifeStagesAfter.map(stage => (
                                            <span key={stage} className="bg-stone-100 text-stone-600 px-2 py-1 rounded-md text-xs font-semibold">
                                                {stage}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
         </div>

         {/* Optional Info */}
         <div className="mt-16 text-center">
             <button onClick={() => alert("This timeline helps you see the bigger picture of your family's growth over months and years. It is private to you.")} className="inline-flex items-center gap-2 text-stone-400 text-xs hover:text-teal-600 transition">
                 <Info size={14} />
                 Why is this shown?
             </button>
         </div>
      </main>
    </div>
  );
};
