
import React from 'react';
import { ShieldCheck, Info, HelpCircle } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { AppLanguage } from '../types';

interface Props {
  current: string;
  previous?: string;
  next: string;
  confidence: 'High' | 'Medium' | 'Low';
  language: AppLanguage;
}

export const LifeStageTimeline: React.FC<Props> = ({ current, previous, next, confidence, language }) => {
  // @ts-ignore
  const t = TRANSLATIONS[language]?.home || TRANSLATIONS['English'].home;

  const getConfidenceColor = () => {
      if (confidence === 'High') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      if (confidence === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-100';
      return 'text-red-600 bg-red-50 border-red-100';
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-6">
        {/* Top Bar */}
        <div className="bg-stone-50 px-4 py-3 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                <ShieldCheck size={14} className="text-teal-600" />
                {t.dataSecure}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getConfidenceColor()}`}>
                {t.guidanceConfidence}: {confidence}
                <div className="group relative">
                    <HelpCircle size={12} className="cursor-help opacity-50 hover:opacity-100" />
                    <div className="absolute right-0 top-6 w-48 bg-stone-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none normal-case font-normal leading-relaxed">
                        {t.tooltipConfidence}
                    </div>
                </div>
            </div>
        </div>

        <div className="p-6 relative">
            {/* Visual Line */}
             <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-stone-100 md:left-0 md:right-0 md:top-1/2 md:h-0.5 md:w-full hidden md:block z-0"></div>
             <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-stone-100 md:hidden z-0"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                
                {/* PREVIOUS */}
                {previous && (
                     <div className="flex-1 flex md:flex-col items-center gap-4 opacity-60">
                         <div className="w-8 h-8 rounded-full bg-stone-100 border-2 border-stone-200 flex shrink-0"></div>
                         <div className="md:text-center text-left">
                             <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">{t.previously}</div>
                             <div className="text-sm font-medium text-stone-600 leading-tight">{previous}</div>
                         </div>
                     </div>
                )}

                {/* CURRENT */}
                <div className="flex-1 flex md:flex-col items-center gap-4 w-full">
                     <div className="w-8 h-8 rounded-full bg-teal-500 border-4 border-teal-100 shadow-lg shadow-teal-200 flex shrink-0 animate-pulse"></div>
                     <div className="md:text-center text-left bg-teal-50/50 p-4 rounded-2xl border border-teal-100 w-full md:w-auto">
                         <div className="flex items-center md:justify-center gap-2 mb-1">
                             <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{t.now}</div>
                         </div>
                         <div className="text-lg font-bold text-stone-800 leading-tight">{current}</div>
                     </div>
                </div>

                {/* NEXT */}
                <div className="flex-1 flex md:flex-col items-center gap-4 opacity-80">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-stone-300 flex shrink-0"></div>
                     <div className="md:text-center text-left">
                         <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">{t.comingUp}</div>
                         <div className="text-sm font-medium text-stone-600 leading-tight">{next}</div>
                     </div>
                </div>

            </div>

             <div className="mt-8 text-center">
                <p className="text-[10px] text-stone-400 flex items-center justify-center gap-1.5 bg-stone-50 inline-block px-3 py-1 rounded-full">
                    <Info size={12} />
                    {t.timelineNote}
                </p>
             </div>
        </div>
    </div>
  );
};
