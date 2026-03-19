import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Award, Target, ArrowRight, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { sessionConfig, interviewState, setScores } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateFeedback() {
      if (interviewState.scores) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/interview/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: interviewState.messages,
            role: sessionConfig.role,
            company: sessionConfig.company,
            type: sessionConfig.mode
          })
        });
        const data = await res.json();
        setScores(data);
      } catch (err) {
        console.error("Failed to generate feedback:", err);
      } finally {
        setLoading(false);
      }
    }
    generateFeedback();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-2xl font-bold">Analyzing your performance...</h2>
        <p className="text-slate-500 mt-2">Our AI is generating your interview report.</p>
      </div>
    );
  }

  const scores = interviewState.scores || { overall: 0, communication: 0, technical: 0 };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-4">Interview Results</h1>
          <p className="text-slate-400">
            {sessionConfig.role} at {sessionConfig.company} • {sessionConfig.mode}
          </p>
        </header>

        {/* Scores Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
             <p className="text-slate-400 font-bold tracking-wider text-sm mb-4 uppercase">Overall Score</p>
             <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-2">
               {scores.overall}
             </div>
             <p className="text-sm text-slate-500">Based on professional benchmarks</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center">
             <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <Award size={24} />
             </div>
             <p className="text-slate-400 font-bold tracking-wider text-sm mb-2 uppercase">Communication</p>
             <div className="text-4xl font-black text-white">{scores.communication}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center">
             <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <Target size={24} />
             </div>
             <p className="text-slate-400 font-bold tracking-wider text-sm mb-2 uppercase">Technical</p>
             <div className="text-4xl font-black text-white">{scores.technical}</div>
          </div>
        </div>

        <div className="text-center">
           <button 
             onClick={() => navigate('/setup')}
             className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full inline-flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25"
           >
             Return to Home <ArrowRight size={20} />
           </button>
        </div>

      </div>
    </div>
  );
}
