import { useStore } from '../store';
import { User, Mail, Briefcase, History, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, sessionConfig, scoreHistory } = useStore();

  const last5Scores = scoreHistory.slice(0, 5);

  const getRoundColor = (round) => {
    const r = round?.toLowerCase() || '';
    if (r.includes('tech')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (r.includes('behavioral') || r.includes('hr')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (r.includes('gd') || r.includes('group')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black tracking-tight">User Profile</h1>
          <button 
            onClick={() => navigate('/setup')}
            className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* User Details Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 mx-auto">
                <User size={40} className="text-white" />
              </div>
              <div className="text-center space-y-1 mb-8">
                <h2 className="text-xl font-bold">{user?.email?.split('@')[0] || 'Candidate'}</h2>
                <p className="text-slate-400 text-sm">Active Job Seeker</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail size={16} className="text-slate-500" />
                  <span className="text-sm truncate">{user?.email || 'candidate@example.com'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Briefcase size={16} className="text-slate-500" />
                  <span className="text-sm">{sessionConfig.role || 'Not Specifed'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* History Section */}
          <div className="md:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 h-full shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <History className="text-blue-400" /> Recent Rounds
                </h3>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last 5 Sessions</span>
              </div>

              {last5Scores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Calendar size={40} className="mb-4 opacity-20" />
                  <p>No interview history yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {last5Scores.map((entry, idx) => (
                    <div 
                      key={idx} 
                      className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${getRoundColor(entry.round)}`}>
                          {entry.round?.split(' ')[0] || 'ROUND'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">Overall Score: {entry.overall}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(entry.date).toLocaleDateString()} at {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Comm / Tech</p>
                          <p className="text-xs font-mono text-slate-300">{entry.communication} / {entry.technical}</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
