
import React, { useState } from 'react';
import { MOCK_HOUSEHOLDS } from '../constants';
import { Household, RiskLevel } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, MapPin, ChevronRight, Activity, Users, LogOut } from 'lucide-react';
import { generateWorkerInsight } from '../services/geminiService';
import { User } from 'firebase/auth';

interface Props {
  user: User;
  onSignOut: () => void;
}

export const WorkerView: React.FC<Props> = ({ user, onSignOut }) => {
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'list' | 'insights'>('list');

  const handleSelectHousehold = async (hh: Household) => {
    setSelectedHousehold(hh);
    setAiInsight("Analyzing...");
    const insight = await generateWorkerInsight(`${hh.currentLifeStage}, ${hh.riskLevel}, ${hh.notes}`);
    setAiInsight(insight);
  };

  const getRiskColor = (level: RiskLevel) => {
    switch(level) {
        case RiskLevel.HIGH: return "bg-red-100 text-red-700 border-red-200";
        case RiskLevel.MEDIUM: return "bg-amber-100 text-amber-700 border-amber-200";
        case RiskLevel.LOW: return "bg-emerald-100 text-emerald-700 border-emerald-200";
        default: return "bg-gray-100";
    }
  };

  const mockStats = [
      { name: 'Pregnancy', value: 12 },
      { name: 'Infancy', value: 8 },
      { name: 'School', value: 25 },
      { name: 'Elderly', value: 15 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Worker Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-lg flex justify-between items-center sticky top-0 z-20">
        <div>
            <h1 className="font-bold text-xl flex items-center gap-2">
                <Activity className="text-teal-400" />
                ConnectiVita <span className="text-slate-500 font-normal">| Worker View</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">Zone: Sector 4 • 280 Households Active</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'list' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
             >
                 Priority List
             </button>
             <button 
                onClick={() => setActiveTab('insights')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'insights' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
             >
                 Community Insights
             </button>
             <button 
                onClick={onSignOut}
                className="ml-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
                title="Sign Out"
             >
                <LogOut size={20} />
             </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {activeTab === 'insights' ? (
            <div className="col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Life Stage Distribution</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockStats}>
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {mockStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#f87171', '#fbbf24', '#34d399', '#60a5fa'][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-semibold text-slate-700 mb-2">Emerging Pattern</h3>
                        <p className="text-slate-600">
                            Higher than average reports of "Economic Transition" in Block B. 
                            Consider organizing a vocational training linkage camp next month.
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                         <h3 className="font-semibold text-slate-700 mb-2">Resource Alert</h3>
                         <p className="text-slate-600">
                             Prenatal supplement stock is running low based on the 12 active pregnancies tracked.
                         </p>
                    </div>
                </div>
            </div>
        ) : (
            <>
                {/* Left Column: Priority List */}
                <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-slate-700">Who needs me this week?</h2>
                </div>
                {MOCK_HOUSEHOLDS.sort((a,b) => (a.riskLevel === RiskLevel.HIGH ? -1 : 1)).map((hh) => (
                    <div 
                        key={hh.id}
                        onClick={() => handleSelectHousehold(hh)}
                        className={`bg-white p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md
                            ${selectedHousehold?.id === hh.id ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-xs text-slate-400">{hh.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getRiskColor(hh.riskLevel)}`}>
                                {hh.riskLevel} Priority
                            </span>
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm mb-1">{hh.composition}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} />
                            {hh.location}
                        </div>
                    </div>
                ))}
                </div>

                {/* Middle/Right Column: Detail View */}
                <div className="lg:col-span-2">
                {selectedHousehold ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
                        <div className="bg-slate-50 p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{selectedHousehold.composition}</h2>
                                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                                        <Clock size={14} /> Last visited: {selectedHousehold.lastVisit}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedHousehold(null)} className="text-slate-400 hover:text-slate-600 lg:hidden">
                                    Close
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Flag Reason */}
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-red-800 text-sm mb-1">Why is this flagged?</h4>
                                    <p className="text-red-700 text-sm">{selectedHousehold.flagReason}</p>
                                </div>
                            </div>

                            {/* AI Analysis */}
                            <div>
                                <h3 className="text-slate-800 font-bold mb-3 flex items-center gap-2">
                                    <span className="bg-indigo-100 text-indigo-600 p-1 rounded">AI</span> 
                                    Smart Insight
                                </h3>
                                <div className="bg-indigo-50 p-4 rounded-xl text-indigo-900 text-sm leading-relaxed border border-indigo-100">
                                    {aiInsight}
                                </div>
                            </div>

                            {/* Actions */}
                            <div>
                                <h3 className="text-slate-800 font-bold mb-3">Your Actions</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition gap-2 text-slate-600">
                                        <CheckCircle size={20} />
                                        <span className="text-xs font-bold">Mark Visited</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition gap-2 text-slate-600">
                                        <Clock size={20} />
                                        <span className="text-xs font-bold">Schedule Follow-up</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition gap-2 text-slate-600">
                                        <Users size={20} />
                                        <span className="text-xs font-bold">Link to Specialist</span>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-3 text-center">
                                    *These actions help the system learn. They never override your judgment.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl p-10">
                        <Users size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Select a household to view details</p>
                    </div>
                )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
