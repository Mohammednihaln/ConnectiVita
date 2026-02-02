
import React, { useState } from 'react';
import { MOCK_HOUSEHOLDS } from '../constants';
import { Household, RiskLevel } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, MapPin, ChevronRight, Activity, Users, LogOut, Sparkles, LayoutDashboard, List } from 'lucide-react';
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
        case RiskLevel.HIGH: return "bg-rose-500 text-white shadow-rose-200";
        case RiskLevel.MEDIUM: return "bg-amber-500 text-white shadow-amber-200";
        case RiskLevel.LOW: return "bg-emerald-500 text-white shadow-emerald-200";
        default: return "bg-slate-400 text-white";
    }
  };

  const mockStats = [
      { name: 'Pregnancy', value: 12 },
      { name: 'Infancy', value: 8 },
      { name: 'School', value: 25 },
      { name: 'Elderly', value: 15 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
       {/* Worker Header */}
      <header className="bg-white/80 backdrop-blur-xl px-8 py-6 flex justify-between items-center sticky top-0 z-50 border-b border-white shadow-sm">
        <div>
            <h1 className="font-extrabold text-2xl flex items-center gap-3 tracking-tight text-slate-900">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <Activity className="text-white" size={20} />
                </div>
                ConnectiVita <span className="text-slate-400 font-medium text-lg">Pro</span>
            </h1>
        </div>
        <div className="flex gap-4 items-center">
             <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
                 <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                     <List size={16} /> Priority
                 </button>
                 <button 
                    onClick={() => setActiveTab('insights')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                     <LayoutDashboard size={16} /> Analytics
                 </button>
             </div>
             <button 
                onClick={onSignOut}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all"
                title="Sign Out"
             >
                <LogOut size={20} />
             </button>
        </div>
      </header>

      <div className="flex-1 max-w-screen-2xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {activeTab === 'insights' ? (
            <div className="col-span-12 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-20 -mt-20 z-0"></div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-8 relative z-10">Population Demographics</h2>
                    <div className="h-96 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockStats}>
                                <XAxis dataKey="name" tick={{fontSize: 14, fill: '#94a3b8', fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', padding: '12px 20px'}} />
                                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={60}>
                                    {mockStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#f43f5e', '#f59e0b', '#10b981', '#3b82f6'][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        ) : (
            <>
                {/* Left Column: Priority List */}
                <div className="lg:col-span-4 space-y-4 animate-in fade-in slide-in-from-left-4">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Priority Queue</h2>
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold">{MOCK_HOUSEHOLDS.length}</span>
                </div>
                <div className="space-y-4">
                    {MOCK_HOUSEHOLDS.sort((a,b) => (a.riskLevel === RiskLevel.HIGH ? -1 : 1)).map((hh) => (
                        <div 
                            key={hh.id}
                            onClick={() => handleSelectHousehold(hh)}
                            className={`bg-white/80 backdrop-blur p-6 rounded-[2rem] cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-200/50 group relative overflow-hidden border
                                ${selectedHousehold?.id === hh.id ? 'border-indigo-500 shadow-indigo-100' : 'border-white hover:border-indigo-100'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="font-mono text-xs text-slate-400 font-bold tracking-widest">{hh.id}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-md ${getRiskColor(hh.riskLevel)}`}>
                                    {hh.riskLevel}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-2 relative z-10 group-hover:text-indigo-600 transition-colors">{hh.composition}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold relative z-10">
                                <MapPin size={14} />
                                {hh.location}
                            </div>
                        </div>
                    ))}
                </div>
                </div>

                {/* Middle/Right Column: Detail View */}
                <div className="lg:col-span-8 animate-in fade-in zoom-in-95 duration-500 h-[80vh] sticky top-28">
                {selectedHousehold ? (
                    <div className="bg-white/90 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden h-full flex flex-col relative">
                        {/* Detail Header */}
                         <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none"></div>
                        
                        <div className="p-10 border-b border-slate-100 relative z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{selectedHousehold.composition}</h2>
                                    <div className="flex flex-wrap items-center gap-3 mt-4">
                                        <div className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-2 shadow-sm">
                                            <Clock size={14} className="text-indigo-500"/> Visited: {selectedHousehold.lastVisit}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedHousehold(null)} className="lg:hidden p-3 bg-slate-100 rounded-full text-slate-500">
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-10 space-y-10 overflow-y-auto flex-1 relative z-10">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm mb-4">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <h4 className="font-bold text-rose-950 text-lg mb-2">Flagged Issue</h4>
                                    <p className="text-rose-900/70 leading-relaxed font-medium">{selectedHousehold.flagReason}</p>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm mb-4">
                                        <Sparkles size={24} />
                                    </div>
                                    <h4 className="font-bold text-indigo-950 text-lg mb-2">AI Suggestion</h4>
                                    <p className="text-indigo-900/70 leading-relaxed font-medium">{aiInsight || "Analyzing..."}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-slate-400 font-bold mb-6 text-xs uppercase tracking-widest pl-2">Quick Actions</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4">
                                    <button className="flex-1 bg-slate-900 text-white p-6 rounded-[2rem] hover:scale-105 transition-transform shadow-lg shadow-slate-900/20 font-bold flex flex-col items-center gap-3 min-w-[140px]">
                                        <CheckCircle size={28}/> Visited
                                    </button>
                                    <button className="flex-1 bg-white border border-slate-200 text-slate-600 p-6 rounded-[2rem] hover:bg-slate-50 transition-colors font-bold flex flex-col items-center gap-3 min-w-[140px]">
                                        <Clock size={28}/> Reschedule
                                    </button>
                                    <button className="flex-1 bg-white border border-slate-200 text-slate-600 p-6 rounded-[2rem] hover:bg-slate-50 transition-colors font-bold flex flex-col items-center gap-3 min-w-[140px]">
                                        <Users size={28}/> Refer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[3rem] p-12 bg-white/40">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 text-slate-300">
                             <Users size={40} />
                        </div>
                        <p className="font-extrabold text-2xl text-slate-400 mb-1">No Selection</p>
                        <p className="text-slate-400 font-medium">Select a household to view details</p>
                    </div>
                )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
