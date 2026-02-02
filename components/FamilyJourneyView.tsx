
import React from 'react';
import { ArrowLeft, Calendar, Info, MapPin } from 'lucide-react';
import { LifeJourneyEntry } from '../types';

interface Props {
  entries: LifeJourneyEntry[];
  onBack: () => void;
  t: any;
}

export const FamilyJourneyView: React.FC<Props> = ({ entries, onBack, t }) => {
  // Sort oldest to newest to calculate ranges
  const chronologicalEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  // Helper to format date ranges
  const getRange = (index: number) => {
    const current = chronologicalEntries[index];
    const next = chronologicalEntries[index + 1];
    
    // Fallback if date string is weird, though usually standardized
    const start = current.date; 
    const end = next ? next.date : t.home.now;
    
    return `${start} — ${end}`;
  };

  // Reverse for display (Newest at top)
  const displayEntries = chronologicalEntries.map((entry, idx) => ({
      ...entry,
      dateRange: getRange(idx)
  })).reverse();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60 px-6 py-5 flex items-center gap-4 shadow-sm">
        <button 
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors border border-transparent hover:border-slate-200"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
           <h1 className="font-extrabold text-slate-900 text-xl leading-tight">{t.home.viewJourney}</h1>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">A story of your family so far</p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-8 relative">
         {/* Vertical Timeline Line */}
         <div className="absolute left-8 top-10 bottom-0 w-0.5 bg-indigo-100"></div>

         <div className="space-y-16 pl-8">
            {displayEntries.length === 0 ? (
                <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 text-slate-400 text-base font-medium text-center shadow-lg shadow-slate-100">
                    No journey history recorded yet. Life updates will appear here.
                </div>
            ) : (
                displayEntries.map((entry, idx) => (
                    <div key={entry.id} className="relative animate-in slide-in-from-bottom-8 duration-700" style={{animationDelay: `${idx * 100}ms`}}>
                        
                        {/* Timeline Node */}
                        <div className="absolute -left-[41px] top-0 w-5 h-5 bg-white border-4 border-indigo-600 rounded-full z-10"></div>

                        {/* Date Range Label */}
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">
                            <Calendar size={14} />
                            {entry.dateRange}
                        </div>

                        {/* Content Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                             {/* Decorative Background Blob */}
                             <div className="absolute -right-10 -top-10 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                            {/* Life Stage Title */}
                            <h2 className="text-2xl font-extrabold text-slate-900 mb-4 relative z-10 leading-tight">
                                {entry.lifeStagesAfter && entry.lifeStagesAfter.length > 0 
                                    ? entry.lifeStagesAfter[0] 
                                    : "Life Update"}
                            </h2>

                            {/* System Interpretation (Summary) */}
                            <p className="text-slate-600 font-medium text-lg leading-relaxed relative z-10">
                                {entry.summary}
                            </p>
                        </div>
                    </div>
                ))
            )}
         </div>

         <div className="mt-24 text-center pb-10">
             <div className="inline-flex items-center gap-2 text-slate-400 text-xs font-bold bg-white px-5 py-3 rounded-full border border-slate-100 shadow-sm">
                 <Info size={14} className="text-indigo-400" />
                 Generated securely by ConnectiVita
             </div>
         </div>
      </main>
    </div>
  );
};
