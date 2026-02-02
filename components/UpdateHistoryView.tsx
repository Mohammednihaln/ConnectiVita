
import React, { useState } from 'react';
import { SnapshotUpdateEntry } from '../types';
import { ArrowLeft, Trash2, Calendar, RefreshCcw, AlertTriangle, MessageSquareQuote } from 'lucide-react';

interface Props {
    entries: SnapshotUpdateEntry[];
    onBack: () => void;
    onDelete: (id: string) => void;
}

export const UpdateHistoryView: React.FC<Props> = ({ entries, onBack, onDelete }) => {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Sort entries descending by timestamp
    const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="min-h-screen bg-stone-50 pb-20 animate-in fade-in slide-in-from-right">
            <header className="bg-white sticky top-0 z-20 border-b border-stone-200 px-4 py-4 flex items-center gap-4 shadow-sm">
                <button 
                    onClick={onBack}
                    className="p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-full transition"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="font-bold text-stone-800 text-lg leading-none">Update History</h1>
                    <p className="text-stone-400 text-xs mt-1">A record of what you told us.</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-5 space-y-4">
                {sortedEntries.length === 0 ? (
                    <div className="text-center py-20 text-stone-400">
                        <RefreshCcw size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No updates recorded yet.</p>
                    </div>
                ) : (
                    sortedEntries.map((entry) => (
                        <div key={entry.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                                    <Calendar size={14} />
                                    {entry.date}
                                </div>
                                <button 
                                    onClick={() => setConfirmDeleteId(entry.id)}
                                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete update"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="mt-1 text-teal-500 opacity-60 shrink-0">
                                    <MessageSquareQuote size={24} />
                                </div>
                                <p className="text-stone-800 font-medium text-xl leading-relaxed italic">
                                    "{entry.user_input}"
                                </p>
                            </div>

                            {/* Delete Confirmation Overlay */}
                            {confirmDeleteId === entry.id && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-3">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <h4 className="font-bold text-stone-800 mb-2">Remove this update?</h4>
                                    <p className="text-xs text-stone-500 mb-6 max-w-[220px] leading-relaxed">
                                        This update affects your family snapshot. Are you sure you want to remove it?
                                    </p>
                                    <div className="flex gap-3 w-full max-w-xs">
                                        <button 
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
                                        >
                                            Keep It
                                        </button>
                                        <button 
                                            onClick={() => onDelete(entry.id)}
                                            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs shadow-md hover:bg-red-600"
                                        >
                                            Yes, Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};
