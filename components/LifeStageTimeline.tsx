
import React from 'react';
import { ArrowRight, CheckCircle2, CircleDashed, PlayCircle } from 'lucide-react';

interface Props {
  current: string;
  next: string;
}

export const LifeStageTimeline: React.FC<Props> = ({ current, next }) => {
  return (
    <div className="w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm my-6 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-6">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Status</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 relative z-10">
            {/* Current */}
            <div className="flex-1 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                    <PlayCircle size={24} />
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-orange-400">Current Phase</div>
                    <div className="font-extrabold text-slate-900 text-lg leading-tight">{current}</div>
                </div>
            </div>

            {/* Next */}
            <div className="flex-1 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 opacity-70">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 shrink-0">
                    <CircleDashed size={24} />
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Up Next</div>
                    <div className="font-bold text-slate-500 text-lg">{next}</div>
                </div>
            </div>
        </div>
    </div>
  );
};
