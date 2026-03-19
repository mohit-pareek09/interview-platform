import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { ArrowRight, Code, MessageSquare, Users, BarChart } from 'lucide-react';

export default function LandingPage() {
  const user = useStore(state => state.user);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 font-sans">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-4 border-b border-slate-800">
        <div className="text-2xl font-bold text-blue-500 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Users size={18} />
          </div>
          IntervAI
        </div>
        <div>
          {user ? (
            <Link to="/setup" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-medium transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/auth" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-block bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-500/20">
            ✦ NEW: CUSTOM GD ROOMS
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Master Your Next <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              Interview with AI
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Experience the future of interview prep with real-time AI feedback, behavioral coaching, and industry-specific mock rounds designed by experts.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link to={user ? "/setup" : "/auth"} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/25">
              Get Started Free <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="mt-32 grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
              <Code size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Technical Round</h3>
            <p className="text-slate-400 leading-relaxed">Solve complex coding challenges in our integrated environment. Get line-by-line hints and performance optimization tips.</p>
          </div>
          
          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">HR/Behavioral</h3>
            <p className="text-slate-400 leading-relaxed">Master the STAR method with our conversational AI. Practice handling difficult questions and improving your confidence.</p>
          </div>

          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-500 text-xs font-bold px-3 py-1 rounded-bl-lg">PRO</div>
            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Group Discussion</h3>
            <p className="text-slate-400 leading-relaxed">Simulate high-pressure group dynamics. Learn how to lead discussions, listen actively, and articulate your views effectively.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
