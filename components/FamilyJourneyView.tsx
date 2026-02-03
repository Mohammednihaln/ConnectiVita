
import React from 'react';
import { ArrowLeft, GitCommit, Info, Calendar, Map, Flag } from 'lucide-react';
import { SnapshotUpdateEntry } from '../types';

interface Props {
    entries: SnapshotUpdateEntry[];
    onBack: () => void;
}

export const FamilyJourneyView: React.FC<Props> = ({ entries, onBack }) => {
    // Sort descending by time (Newest on top)
    const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

    const getRange = (index: number) => {
        const current = sortedEntries[index];
        const prev = index > 0 ? sortedEntries[index - 1] : null;

        const startDate = current.date;
        const endDate = prev ? prev.date : "Present";

        if (startDate === endDate) return startDate;
        return `${startDate} – ${endDate}`;
    };

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col animate-in fade-in slide-in-from-right font-sans">
            <header className="bg-white sticky top-0 z-20 border-b border-stone-200 px-4 py-4 flex items-center gap-4 shadow-sm">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-full transition"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="font-bold text-stone-800 text-lg leading-none">Your Family’s Life Journey</h1>
                    <p className="text-stone-400 text-xs mt-1">A story of how your family has grown.</p>
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full p-6 relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-gradient-to-b from-teal-200 via-stone-200 to-stone-100"></div>

                <div className="space-y-12 pb-12">
                    {sortedEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-20 text-center space-y-4 text-stone-400">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center">
                                <Map size={32} className="opacity-50" />
                            </div>
                            <p className="max-w-xs text-sm">
                                As you share updates about your life, your family's journey map will be built here.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Journey Entries */}
                            {sortedEntries.map((entry, idx) => (
                                <div key={entry.id} className="relative flex gap-6 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>

                                    {/* Dot / Marker */}
                                    <div className="relative z-10 shrink-0 mt-1">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 border-stone-50 shadow-sm ${idx === 0 ? 'bg-teal-500 text-white shadow-teal-200' : 'bg-stone-200 text-stone-500'}`}>
                                            {idx === 0 ? <Flag size={12} fill="currentColor" /> : <div className="w-2 h-2 bg-stone-400 rounded-full" />}
                                        </div>
                                    </div>

                                    {/* Content Card */}
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {getRange(idx)}
                                        </div>
                                        <div className={`p-6 rounded-3xl border transition-all duration-300 ${idx === 0 ? 'bg-gradient-to-b from-teal-50 to-white border-teal-100 shadow-md' : 'bg-white border-stone-100 shadow-sm opacity-90'}`}>
                                            <div className="mb-2">
                                                <h3 className={`text-base font-bold ${idx === 0 ? 'text-teal-800' : 'text-stone-700'}`}>
                                                    {entry.life_stage || "Life Transition"}
                                                </h3>
                                            </div>
                                            <p className={`text-sm leading-relaxed ${idx === 0 ? 'text-stone-700' : 'text-stone-500'}`}>
                                                {entry.change_summary}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Start Node */}
                            <div className="relative flex gap-6 opacity-40 grayscale">
                                <div className="relative z-10 shrink-0 mt-1">
                                    <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center border-4 border-stone-50">
                                        <div className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
                                    </div>
                                </div>
                                <div className="flex-1 pt-1.5">
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Start of Journey</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};
