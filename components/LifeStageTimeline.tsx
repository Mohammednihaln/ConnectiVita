import React from 'react';
import { ArrowRight } from 'lucide-react';

interface Props {
  current: string;
  next: string;
}

export const LifeStageTimeline: React.FC<Props> = ({ current, next }) => {
  return (
    <div className="w-full bg-orange-50/50 p-6 rounded-2xl border border-orange-100 my-6">
        <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wide mb-4">Your Life Journey</h3>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Past (Implicit/Generic) */}
            <div className="flex-1 opacity-50">
                <div className="text-xs text-gray-500 mb-1">Previously</div>
                <div className="font-medium text-gray-700">Previous Stage</div>
            </div>

            <ArrowRight className="hidden md:block text-orange-300 w-5 h-5" />
            <div className="md:hidden text-orange-300 transform rotate-90">↓</div>

            {/* Current */}
            <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500 w-full md:w-auto">
                <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    <div className="text-xs font-bold text-orange-600 uppercase">Now</div>
                </div>
                <div className="font-bold text-gray-900 text-lg">{current}</div>
            </div>

            <ArrowRight className="hidden md:block text-orange-300 w-5 h-5" />
            <div className="md:hidden text-orange-300 transform rotate-90">↓</div>

            {/* Next */}
            <div className="flex-1 border border-dashed border-gray-300 p-4 rounded-xl w-full md:w-auto bg-gray-50/50">
                <div className="text-xs font-semibold text-gray-500 mb-1">Coming Up (6-12 mo)</div>
                <div className="font-medium text-gray-700">{next}</div>
            </div>
        </div>
        <p className="mt-4 text-xs text-gray-500 italic">
            * Timelines change as life happens. This is just a guide.
        </p>
    </div>
  );
};
