import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Mic, MicOff, PhoneOff, Code, Clock, Send, Volume2, VolumeX } from 'lucide-react';
import CameraPreview from '../components/CameraPreview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

export default function TechnicalInterview() {
  const navigate = useNavigate();
  const { sessionConfig, addMessage, setInterviewStatus } = useStore();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [code, setCode] = useState('def solve():\n    # Write your solution here\n    pass\n');
  const [feedback, setFeedback] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('Loading your question...');
  const [elapsed, setElapsed] = useState(0);

  // Coding Challenge State
  const [codingChallengeMode, setCodingChallengeMode] = useState(false); // 'off', 'selecting', 'active', 'finished'
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [codingTimer, setCodingTimer] = useState(600); // 10 minutes
  const [attempts, setAttempts] = useState(0);
  const [codingFeedback, setCodingFeedback] = useState(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [activeCodingQuestion, setActiveCodingQuestion] = useState(null);
  const [originalTemplate, setOriginalTemplate] = useState('');

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef('');
  const messagesEndRef = useRef(null);
  const hasStarted = useRef(false);
  const timerRef = useRef(null);

  // Main Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Coding Challenge Timer
  useEffect(() => {
    let interval;
    if (codingChallengeMode === 'active' && codingTimer > 0) {
      interval = setInterval(() => {
        setCodingTimer(prev => prev - 1);
      }, 1000);
    } else if (codingTimer === 0 && codingChallengeMode === 'active') {
      submitCodingChallenge(); // Auto-submit or handle timeout
    }
    return () => clearInterval(interval);
  }, [codingChallengeMode, codingTimer]);

  // Global cleanup & Mute handler
  useEffect(() => {
    if (isMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.stop(); } catch (e) {}
    };
  }, []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onstart = () => console.log('🎙️ Tech: STT Started');
    r.onresult = (event) => {
      let final = '', interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      console.log('📝 Tech STT:', final || interim);
      setTranscript(final + interim);
      transcriptRef.current = final + interim;
    };
    r.onend = () => {
      console.log('🔇 Tech: STT Ended. isRecording:', isRecordingRef.current);
      if (isRecordingRef.current) {
        setTimeout(() => { 
          try { if(isRecordingRef.current) r.start(); } catch (e) { console.warn('Tech STT restart err:', e.message); } 
        }, 300);
      }
    };
    r.onerror = (e) => {
      console.error('❌ Tech STT Error:', e.error);
      if (e.error === 'not-allowed') {
        alert('Microphone access denied. Please allow mic in browser settings.');
        setIsRecording(false); isRecordingRef.current = false;
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('STT Error detail:', e.error);
      }
    };
    recognitionRef.current = r;
    return () => r.stop();
  }, []);

  // Start interview
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/interview/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: sessionConfig.role,
            company: sessionConfig.company,
            type: 'Technical',
            resumeText: sessionConfig.resumeText,
          }),
        });
        const data = await res.json();
        const q = data.text || 'Explain your approach to solving complex algorithmic problems.';
        setCurrentQuestion(q);
        setMessages([{ role: 'assistant', content: q }]);
        if (!isMuted) { setIsSpeaking(true); speak(q, () => setIsSpeaking(false)); }
      } catch (e) {
        const q = 'Given a sorted array of integers, write a function to find the two numbers that add up to a target sum.';
        setCurrentQuestion(q);
        setMessages([{ role: 'assistant', content: q }]);
        if (!isMuted) speak(q, () => setIsSpeaking(false));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const toggleRecording = () => {
    console.log('Toggle recording. Tech Current:', isRecordingRef.current);
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      try { recognitionRef.current?.stop(); } catch(e){}
      setIsRecording(false);
    } else {
      isRecordingRef.current = true;
      setTranscript('');
      transcriptRef.current = '';
      try { 
        recognitionRef.current?.start(); 
        setIsRecording(true);
      } catch (e) {
        if (e.message?.includes('already started')) {
          setIsRecording(true);
        } else {
          console.error('STT Tech Start Error:', e);
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      }
    }
  };

  // Submit verbal answer → get follow-up question
  const submitVerbalAnswer = useCallback(async () => {
    const answer = (transcriptRef.current || transcript).trim();
    if (!answer || isLoading) return;
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
    window.speechSynthesis.cancel();
    const userMsg = { role: 'user', content: answer };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setTranscript('');
    transcriptRef.current = '';
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/interview/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          role: sessionConfig.role,
          company: sessionConfig.company,
          type: 'Technical',
          resumeText: sessionConfig.resumeText,
        }),
      });
      const data = await res.json();
      const aiText = data.text || 'Good. Now let\'s discuss the time complexity.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
      setCurrentQuestion(aiText);
      if (!isMuted) { setIsSpeaking(true); speak(aiText, () => setIsSpeaking(false)); }
    } catch (e) { console.error('Chat error:', e); }
    finally { setIsLoading(false); }
  }, [transcript, messages, isLoading, isMuted, sessionConfig]);

  const submitCode = async () => {
    if (isSubmitting) return;
    window.speechSynthesis.cancel();
    setIsSubmitting(true);
    setFeedback('Analyzing your code...');
    try {
      const res = await fetch(`${API_URL}/api/interview/code-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          spokenAnswer: transcript || '',
          question: currentQuestion,
          role: sessionConfig.role,
          resumeText: sessionConfig.resumeText,
        }),
      });
      const data = await res.json();
      const fb = data.feedback || 'Your solution looks reasonable. Consider edge cases.';
      setFeedback(fb);
      if (!isMuted) speak(fb);
    } catch (e) {
      setFeedback('Could not evaluate code. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startCodingChallengeSelection = () => {
    setCodingChallengeMode('selecting');
  };

  const generateChallenge = async () => {
    if (selectedSkills.length === 0) return;
    setIsGeneratingChallenge(true);
    try {
      const res = await fetch(`${API_URL}/api/interview/generate-coding-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: sessionConfig.role,
          skills: selectedSkills.join(', '),
          resumeText: sessionConfig.resumeText,
        }),
      });
      const data = await res.json();
      setActiveCodingQuestion(data.question);
      setCode(data.template || '');
      setOriginalTemplate(data.template || '');
      setCodingChallengeMode('active');
      setCodingTimer(600); // Reset to 10 mins
      setAttempts(0);
      setCodingFeedback(null);
      
      // Speak the question
      if (!isMuted) speak(`Here is your coding challenge: ${data.question}`);
    } catch (e) {
      console.error('Failed to generate challenge:', e);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const getHint = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCodingFeedback({ type: 'info', text: 'Thinking of a hint...' });
    try {
      const res = await fetch(`${API_URL}/api/interview/evaluate-coding-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          question: activeCodingQuestion,
          type: 'hint',
          role: sessionConfig.role,
        }),
      });
      const data = await res.json();
      console.log("Hint data from API:", data);
      setCodingFeedback({ type: 'warning', text: data.hint || "No hint available." });
      if (!isMuted) speak(`Here is a hint: ${data.hint || "Try to rethink your approach."}`);
    } catch (e) {
      console.error('Hint error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCodingChallenge = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCodingFeedback({ type: 'info', text: 'Evaluating your solution...' });
    
    try {
      const res = await fetch(`${API_URL}/api/interview/evaluate-coding-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          question: activeCodingQuestion,
          template: originalTemplate,
          attempts: attempts + 1,
          role: sessionConfig.role,
        }),
      });
      const data = await res.json();
      console.log("Evaluation data from API:", data);
      setAttempts(prev => prev + 1);

      setCodingFeedback({ 
        type: data.isSolved ? 'success' : 'error', 
        text: data.status || "Evaluation complete",
        details: {
          logic: data.logicFeedback || "No logic feedback provided.",
          optimization: data.optimizationSuggestions || "No optimization suggestions provided."
        }
      });
      
      // If solved or 2nd attempt, finish the challenge
      if (data.isSolved || attempts + 1 >= 2) {
        setCodingChallengeMode('finished');
      }
      
      if (!isMuted) speak(`${data.status}. ${data.logicFeedback}`);
      
    } catch (e) {
      console.error('Evaluation error:', e);
      setCodingFeedback({ type: 'error', text: 'Failed to evaluate. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const endInterview = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    clearInterval(timerRef.current);
    messages.forEach(m => addMessage(m));
    setInterviewStatus('finished');
    navigate('/feedback');
  };

  const timePercent = Math.min((elapsed / (45 * 60)) * 100, 100);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col p-4 md:p-6 gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Technical Round
          </h1>
          <p className="text-blue-400 text-sm font-semibold">{sessionConfig.role || 'Software Engineer'} @ {sessionConfig.company || 'Company'}</p>
        </div>
        <div className="flex items-center gap-3">
          {codingChallengeMode === 'active' && (
            <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-full text-sm font-bold border border-red-500/30 text-red-400 animate-pulse">
              <Clock size={16} />
              Challenge: {formatTime(codingTimer)}
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full text-sm font-mono border border-slate-700">
            <Clock size={16} className="text-blue-400" />
            {formatTime(elapsed)}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-4">

        {/* Left: Interviewer + Q&A */}
        <div className="w-full md:w-5/12 flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-800">
            <div className="absolute inset-0 bg-cover bg-center opacity-80 transition-all duration-700"
              style={{ backgroundImage: 'url("/assets/interviewer/tech_man.png")' }} />
            {isSpeaking && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3,4].map(i => <div key={i} className="w-1 bg-blue-400 rounded-full animate-pulse" style={{ height: `${8+i*4}px`, animationDelay: `${i*0.1}s` }} />)}
                </div>
                <span className="text-xs text-blue-300">Speaking</span>
              </div>
            )}
            {isLoading && (
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-blue-300">Thinking...</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur rounded-xl p-3 border border-white/10">
              <p className="text-sm leading-relaxed">
                <span className="text-emerald-400 font-bold">AI: </span>
                {isLoading ? '...' : currentQuestion}
              </p>
            </div>
            {/* Self PIP */}
            <div className="absolute top-3 right-3 w-72 aspect-video rounded-xl border border-white/20 overflow-hidden shadow-2xl transition-all hover:scale-105 duration-300">
              <CameraPreview className="w-full h-full" />
              <div className="absolute bottom-1 left-2 text-[9px] font-bold text-white/70 bg-black/40 px-1 rounded">You</div>
            </div>
          </div>

          {/* Message history */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 overflow-y-auto max-h-52 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {m.role === 'assistant' && <span className="text-blue-400 font-bold block text-[10px] mb-0.5">Interviewer</span>}
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice transcript */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 min-h-[60px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Speech</span>
              {isRecording && <span className="text-[10px] text-red-400 animate-pulse font-semibold">● REC</span>}
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {transcript || <span className="text-slate-600 italic">Use mic to speak your explanation...</span>}
            </p>
          </div>

          {/* Mic Controls */}
          <div className="flex gap-2">
            <button onClick={toggleRecording} className={`flex-1 h-10 rounded-full flex items-center justify-center gap-2 font-semibold text-sm transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
              {isRecording ? <><MicOff size={16} /> Stop</> : <><Mic size={16} /> Speak</>}
            </button>
            <button onClick={submitVerbalAnswer} disabled={!transcript.trim() || isLoading} className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white flex items-center justify-center transition-all">
              <Send size={16} />
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          {!codingChallengeMode && (
            <button 
              onClick={startCodingChallengeSelection}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Code size={20} /> Start Coding Challenge
            </button>
          )}
        </div>

        {/* Right: Code Editor */}
        <div className="w-full md:w-7/12 flex flex-col gap-4">
          {/* Code Editor */}
          <div className="flex-1 bg-[#1e1e1e] rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border-b border-[#404040]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs text-slate-400 font-mono">solution.py</span>
              <div />
            </div>

            {/* Coding Challenge Question Display */}
            {codingChallengeMode === 'active' && activeCodingQuestion && (
              <div className="bg-blue-500/10 border-b border-blue-500/20 p-4">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Coding Question</p>
                <p className="text-slate-300 text-sm leading-relaxed">{activeCodingQuestion}</p>
              </div>
            )}

            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full flex-1 bg-transparent text-slate-300 font-mono text-sm p-4 focus:outline-none resize-none min-h-[280px]"
              spellCheck="false"
              placeholder="Write your solution here..."
            />
          </div>


          {/* Time bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Elapsed: {formatTime(elapsed)}</span>
              <span>Limit: 45:00</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${timePercent}%` }} />
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex gap-3">
            <button onClick={endInterview} className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
              <PhoneOff size={20} />
            </button>
            {codingChallengeMode === 'active' ? (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={getHint}
                  disabled={isSubmitting || attempts >= 2}
                  className="px-6 h-12 bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 font-bold rounded-full border border-amber-500/30 transition-all disabled:opacity-30"
                >
                  Get Hint
                </button>
                <button
                  onClick={submitCodingChallenge}
                  disabled={isSubmitting || attempts >= 2}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Evaluating...</>
                    : <><Code size={20} /> {attempts === 1 ? 'Final Submit' : 'Submit Logic & Code'} ({2 - attempts}/2)</>
                  }
                </button>
              </div>
            ) : codingChallengeMode === 'finished' ? (
              <button
                onClick={submitCode}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
              >
                {isSubmitting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Evaluating...</>
                  : <><Code size={20} /> Submit Code for Final Review</>
                }
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Skill Selection Overlay */}
      {codingChallengeMode === 'selecting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Select Your Expertise</h2>
            <p className="text-slate-400 text-sm mb-6">Choose the skills you'd like to be tested on for this coding challenge.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {['DSA', 'React', 'Javascript', 'Python', 'SQL', 'Node.js', 'System Design', 'Database'].map(skill => (
                <button
                  key={skill}
                  onClick={() => {
                    // Update to single-skill selection
                    setSelectedSkills([skill]);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    selectedSkills.includes(skill)
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setCodingChallengeMode(null)}
                className="flex-1 h-11 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button 
                disabled={selectedSkills.length === 0 || isGeneratingChallenge}
                onClick={generateChallenge}
                className="flex-2 h-11 px-6 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingChallenge ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Start Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coding Feedback Overlay / Hint */}
      {codingFeedback && (
        <div className={`fixed bottom-6 right-6 z-40 max-w-sm w-full p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
          codingFeedback.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' :
          codingFeedback.type === 'warning' ? 'bg-amber-900/90 border-amber-500/50 text-amber-100' :
          codingFeedback.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-red-100' :
          'bg-slate-900/90 border-slate-500/50 text-slate-100'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {codingFeedback.type === 'warning' ? 'Helpful Hint' : 'AI Feedback'}
            </span>
            <button onClick={() => setCodingFeedback(null)} className="opacity-50 hover:opacity-100">×</button>
          </div>
          <p className="text-sm leading-relaxed">{codingFeedback.text}</p>
          
          {codingFeedback.details && (
            <div className="mt-4 space-y-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Logic Evaluation</p>
                <p className="text-xs text-slate-200 bg-black/30 p-2 rounded-lg">{codingFeedback.details.logic}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Optimization Suggestion</p>
                <p className="text-xs text-slate-200 bg-black/30 p-2 rounded-lg">{codingFeedback.details.optimization}</p>
              </div>
            </div>
          )}

          {(codingFeedback.type === 'success' || codingFeedback.type === 'error') && codingChallengeMode === 'finished' && (
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => { setCodingFeedback(null); setCodingChallengeMode(null); }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold transition-all border border-white/10"
              >
                Back to Interview
              </button>
              <button 
                onClick={() => { setCodingFeedback(null); setCodingChallengeMode('selecting'); }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold transition-all border border-blue-400/30"
              >
                New Challenge
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
