import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronLeft, Rocket, Info, Users, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

import axios from 'axios';
import { useStore } from '../store';

export default function SetupPage() {
  const navigate = useNavigate();
  const { user, sessionConfig, setSessionConfig, setUser, logout } = useStore();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedText, setParsedText] = useState(sessionConfig.resumeText || '');
  
  const [role, setRole] = useState(sessionConfig.role || 'Frontend Developer');
  const [company, setCompany] = useState(sessionConfig.company || '');
  const [mode, setMode] = useState(sessionConfig.mode || 'technical'); 

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setUploading(true);
    
    const formData = new FormData();
    formData.append('resume', selectedFile);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${apiUrl}/api/upload-resume`, formData);
      setParsedText(res.data.text);
      setSessionConfig({ resumeText: res.data.text });
    } catch (error) {
      console.error("Resume upload failed", error);
      alert("Failed to parse resume.");
    } finally {
      setUploading(false);
    }
  };

  const handleLaunch = () => {
    // If no resume uploaded, default to a generic text or empty
    setSessionConfig({
      resumeText: parsedText || 'No resume provided.',
      role,
      company: company || 'a Top Tech Company',
      mode
    });

    if (mode === 'technical') navigate('/interview/technical');
    else if (mode === 'behavioral') navigate('/interview/behavioral');
    else if (mode === 'gd') navigate('/interview/gd');
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 pb-20">
      {/* Header */}
      <div className="flex items-center p-6 border-b border-slate-800">
        <button onClick={() => navigate('/')} className="hover:bg-slate-800 p-2 rounded-full transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-4">Setup Your Session</h1>
        
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-all text-sm font-medium"
          >
            <User size={18} /> Profile
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-red-500/10"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-8 px-4">
        
        {/* Resume Analysis */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-slate-400 tracking-wider mb-4 uppercase">Resume Analysis</h2>
          <div className="bg-[#131b2f] border border-slate-800 rounded-2xl p-10 text-center border-dashed">
            <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Upload Resume</h3>
            <p className="text-slate-400 text-sm mb-6">Drag and drop your PDF here or browse files</p>
            
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition inline-flex items-center gap-2">
              {uploading ? 'Processing...' : file ? file.name : 'Select PDF'}
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </label>
            
            {parsedText && (
              <div className="mt-4 text-green-400 text-sm">✓ Resume parsed successfully!</div>
            )}
          </div>
        </div>

        {/* Interview Parameters */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-slate-400 tracking-wider mb-4 uppercase">Interview Parameters</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Job Role</label>
              <select 
                value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#131b2f] border border-slate-800 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option>Frontend Developer</option>
                <option>Backend Developer</option>
                <option>Fullstack Developer</option>
                <option>Product Manager</option>
                <option>Data Scientist</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Target Company</label>
              <input 
                type="text" 
                value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, Meta, Startup..."
                className="w-full bg-[#131b2f] border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-4">Select Interview Mode</label>
              <div className="space-y-3">
                
                {/* Mode Option: Technical */}
                <label className={`cursor-pointer flex items-center p-4 rounded-xl border transition-all ${mode === 'technical' ? 'bg-blue-500/10 border-blue-500' : 'bg-[#131b2f] border-slate-800 hover:border-slate-600'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${mode === 'technical' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>
                    <code className="font-bold">&lt;/&gt;</code>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Technical Round</div>
                    <div className="text-sm text-slate-400">DSA, System Design & Coding</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'technical' ? 'border-blue-500' : 'border-slate-600'}`}>
                    {mode === 'technical' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <input type="radio" value="technical" checked={mode === 'technical'} onChange={(e) => setMode(e.target.value)} className="hidden" />
                </label>

                {/* Mode Option: Behavioral */}
                <label className={`cursor-pointer flex items-center p-4 rounded-xl border transition-all ${mode === 'behavioral' ? 'bg-blue-500/10 border-blue-500' : 'bg-[#131b2f] border-slate-800 hover:border-slate-600'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${mode === 'behavioral' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    <div className="w-5 h-5 rounded-full border-2 border-current bg-current mb-0.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Behavioral / HR</div>
                    <div className="text-sm text-slate-400">Culture fit & soft skills</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'behavioral' ? 'border-blue-500' : 'border-slate-600'}`}>
                    {mode === 'behavioral' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <input type="radio" value="behavioral" checked={mode === 'behavioral'} onChange={(e) => setMode(e.target.value)} className="hidden" />
                </label>

                {/* Mode Option: Group Discussion */}
                <label className={`cursor-pointer flex items-center p-4 rounded-xl border transition-all relative ${mode === 'gd' ? 'bg-blue-500/10 border-blue-500' : 'bg-[#131b2f] border-slate-800 hover:border-slate-600'}`}>
                  <div className="absolute -top-3 right-4 bg-blue-600 text-xs font-bold px-2 py-0.5 rounded-md">AI SIMULATION</div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${mode === 'gd' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Users size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Group Discussion</div>
                    <div className="text-sm text-slate-400">Multi-participant AI simulation</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'gd' ? 'border-blue-500' : 'border-slate-600'}`}>
                    {mode === 'gd' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <input type="radio" value="gd" checked={mode === 'gd'} onChange={(e) => setMode(e.target.value)} className="hidden" />
                </label>

              </div>
            </div>

            {mode === 'gd' && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                <Info className="text-blue-500 flex-shrink-0" size={20} />
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-blue-400">Unique Feature:</span> In GD mode, our AI will simulate 3 other candidates with diverse backgrounds to test your leadership and collaborative skills.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Launch Button */}
        <button 
          onClick={handleLaunch}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
          Launch AI Interview <Rocket size={20} />
        </button>
        <p className="text-center text-slate-500 text-xs mt-4">Estimated duration: 30-45 minutes</p>

      </div>
    </div>
  );
}
