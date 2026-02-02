
import React, { useState } from 'react';
import { ArrowLeft, Trash2, Calendar, AlertTriangle, Loader2, MessageSquare } from 'lucide-react';
import { SnapshotUpdateEntry } from '../types';

interface Props {
  entries: SnapshotUpdateEntry[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  t: any;
}

export const UpdateHistoryView: React.FC<Props> = ({ entries, onBack, onDelete, t }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sort: Newest first
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsProcessing(true);
    await onDelete(deletingId);
    setIsProcessing(false);
    setDeletingId(null);
  };

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
           <h1 className="font-extrabold text-slate-900 text-xl leading-tight">{t.chat.history}</h1>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Your inputs & corrections</p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 relative">
        <div className="space-y-4">
            {sortedEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare size={32} />
                    </div>
                    <p className="font-medium">No manual updates recorded yet.</p>
                </div>
            ) : (
                sortedEntries.map((entry) => (
                    <div key={entry.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                                <Calendar size={12} />
                                {entry.date}
                            </div>
                            <button 
                                onClick={() => handleDeleteClick(entry.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Update"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="pl-2 border-l-2 border-indigo-100">
                             <p className="text-slate-800 text-lg font-medium leading-relaxed font-serif italic">
                                "{entry.user_input}"
                             </p>
                        </div>
                    </div>
                ))
            )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-white animate-in zoom-in-95">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                    {isProcessing ? <Loader2 className="animate-spin" size={32}/> : <AlertTriangle size={32} />}
                </div>
                
                <h3 className="text-2xl font-extrabold text-slate-900 mb-3 text-center">Remove this update?</h3>
                <p className="text-slate-500 mb-8 font-medium text-center leading-relaxed">
                    This update affects your family snapshot. Removing it will trigger a recalculation of your life stage and focus areas.
                </p>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeletingId(null)} 
                        disabled={isProcessing}
                        className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        {t.common.cancel}
                    </button>
                    <button 
                        onClick={confirmDelete}
                        disabled={isProcessing}
                        className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-500/30 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing ? t.common.processing : t.settings.yesClear}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
