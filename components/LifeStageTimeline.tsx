
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

export const LifeStageTimeline: React.FC<Props & { onViewJourney: () => void }> = ({ current, previous, next, confidence, language, onViewJourney }) => {
    // @ts-ignore
    const t = TRANSLATIONS[language]?.home || TRANSLATIONS['English'].home;

    const getConfidenceColor = () => {
        if (confidence === 'High') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (confidence === 'Medium') return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-red-700 bg-red-50 border-red-200';
    };

    return (
        <div className="w-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-6 font-sans">
            {/* Top Bar */}
            <div className="bg-stone-50 px-4 py-3 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                    <ShieldCheck size={14} className="text-teal-600" />
                    {t.dataSecure || "Your family information is securely stored"}
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getConfidenceColor()}`}>
                    {t.guidanceConfidence || "Guidance Confidence"}: {confidence}
                    <div className="group relative">
                        <HelpCircle size={12} className="cursor-help opacity-60 hover:opacity-100" />
                        <div className="absolute right-0 top-6 w-56 bg-stone-800 text-white text-[11px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none normal-case font-normal leading-relaxed shadow-xl">
                            {t.tooltipConfidence || "This reflects how complete your shared information is. You can update details anytime."}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 relative">
                {/* Visual Line - Vertical on Mobile, Horizontal on Desktop */}
                <div className="absolute left-6 top-6 bottom-20 w-1 bg-stone-100 md:left-10 md:right-10 md:top-[3.25rem] md:h-1 md:w-auto md:bottom-auto hidden md:block z-0 rounded-full"></div>
                <div className="absolute left-9 top-6 bottom-20 w-1 bg-stone-100 md:hidden z-0 rounded-full"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-8 relative z-10">

                    {/* A) PREVIOUSLY */}
                    <div className={`flex-1 flex md:flex-col items-center gap-4 ${!previous ? 'invisible md:hidden' : 'opacity-60 grayscale'}`}>
                        <div className="w-8 h-8 rounded-full bg-stone-200 border-4 border-white flex shrink-0 ring-4 ring-stone-50"></div>
                        <div className="md:text-center text-left pt-1">
                            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">{t.previously || "Previously"}</div>
                            <div className="text-sm font-medium text-stone-600 leading-snug">{previous || "..."}</div>
                        </div>
                    </div>

                    {/* B) NOW (Highlighted) */}
                    <div className="flex-1 flex md:flex-col items-center gap-4 w-full">
                        <div className="w-8 h-8 rounded-full bg-teal-500 border-4 border-white shadow-xl shadow-teal-200 flex shrink-0 ring-4 ring-teal-50 relative">
                            <div className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-20"></div>
                        </div>
                        <div className="md:text-center text-left bg-gradient-to-b from-teal-50 to-white p-5 rounded-2xl border border-teal-100 w-full md:w-auto shadow-sm">
                            <div className="flex items-center md:justify-center gap-2 mb-2">
                                <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{t.now || "Now"}</div>
                            </div>
                            <div className="text-xl font-bold text-stone-800 leading-tight">{current}</div>
                        </div>
                    </div>

                    {/* C) COMING UP */}
                    <div className="flex-1 flex md:flex-col items-center gap-4 opacity-75">
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-indigo-300 flex shrink-0 ring-4 ring-stone-50"></div>
                        <div className="md:text-center text-left pt-1">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">{t.comingUp || "Coming Up (6-12 months)"}</div>
                            <div className="text-sm font-medium text-stone-600 leading-snug">{next}</div>
                        </div>
                    </div>

                </div>

                {/* Safety Note */}
                <div className="mt-8 mb-4 text-center">
                    <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5 italic">
                        {t.timelineNote || "Timelines change as life happens. This is a guide, not a prediction."}
                    </p>
                </div>

                {/* View Complete Journey */}
                <div className="border-t border-stone-100 pt-4 text-center">
                    <button onClick={onViewJourney} className="text-sm font-bold text-teal-700 hover:text-teal-900 hover:underline transition-all">
                        {t.viewJourney || "View Complete Journey"}
                    </button>
                </div>
            </div>
        </div>
    );
};
