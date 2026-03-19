import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Mic, MicOff, PhoneOff, User, Send, Volume2, VolumeX } from 'lucide-react';
import CameraPreview from '../components/CameraPreview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Browser Text-to-Speech helper
function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.05;
  // Prefer a female voice if available
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira'));
  if (femaleVoice) utter.voice = femaleVoice;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

export default function BehavioralInterview() {
  const navigate = useNavigate();
  const { sessionConfig, addMessage, interviewState, setInterviewStatus } = useStore();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('Starting the interview...');
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef(''); // always current, avoids stale closure in submitAnswer
  const messagesEndRef = useRef(null);
  const hasStarted = useRef(false);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Init speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser. Use Chrome.');
      alert('Speech Recognition is not supported by your browser. Please try using Google Chrome or Microsoft Edge.');
      return;
    }
    
    // Check microphone permissions
    navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
      console.log('🎤 Microphone permission state:', permissionStatus.state);
      permissionStatus.onchange = () => {
        console.log('🎤 Microphone permission state changed to:', permissionStatus.state);
      };
    }).catch(err => {
      console.warn('Could not query microphone permission:', err);
    });

    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onstart = () => {
      console.log('🎙️ Speech recognition started');
    };

    r.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      console.log('📝 STT Result:', final || interim);
      setTranscript(final + interim);
      transcriptRef.current = final + interim;
    };

    r.onend = () => {
      console.log('🔇 Speech recognition ended. isRecordingRef:', isRecordingRef.current);
      // Auto-restart if we're still supposed to be recording (browser stops after silence)
      if (isRecordingRef.current) {
        console.log('♻️ Attempting STT restart...');
        setTimeout(() => {
          try { 
            if (isRecordingRef.current) r.start(); 
          } catch (e) {
            console.warn('STT restart failed:', e.message);
          }
        }, 300);
      }
    };

    r.onerror = (e) => {
      console.error('❌ STT Error:', e.error);
      if (e.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings (click the lock icon in the address bar).');
        setIsRecording(false);
        isRecordingRef.current = false;
      } else if (e.error === 'network') {
        console.warn('Network error in STT. This often happens if the connection is unstable.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('Unexpected STT error:', e.error);
      }
    };

    recognitionRef.current = r;
    return () => r.stop();
  }, []);

  // Start interview on mount — fetch first question
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startInterview();
  }, []);

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: sessionConfig.role,
          company: sessionConfig.company,
          type: 'Behavioral',
          resumeText: sessionConfig.resumeText,
        }),
      });
      const data = await res.json();
      const aiText = data.text || 'Tell me about yourself.';
      setCurrentQuestion(aiText);
      setMessages([{ role: 'assistant', content: aiText }]);
      if (!isMuted) {
        setIsSpeaking(true);
        speak(aiText, () => setIsSpeaking(false));
      }
    } catch (err) {
      console.error('Start error:', err);
      const fallback = 'Tell me about yourself and your background.';
      setCurrentQuestion(fallback);
      setMessages([{ role: 'assistant', content: fallback }]);
      if (!isMuted) speak(fallback, () => setIsSpeaking(false));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    console.log('Toggle recording. Current state:', isRecordingRef.current);
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error('Stop error:', e);
      }
      setIsRecording(false);
    } else {
      isRecordingRef.current = true;
      setTranscript('');
      transcriptRef.current = '';
      try { 
        recognitionRef.current?.start(); 
        setIsRecording(true);
      } catch (e) {
        console.error('Start error:', e);
        // If it's already started, just sync the UI
        if (e.message?.includes('already started')) {
          setIsRecording(true);
        } else {
          isRecordingRef.current = false;
          setIsRecording(false);
          alert('Could not start microphone. Please refresh and try again.');
        }
      }
    }
  };

  const submitAnswer = useCallback(async () => {
    const answer = (transcriptRef.current || transcript).trim();
    if (!answer || isLoading) return;

    // Stop recording
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
    window.speechSynthesis.cancel();

    const userMsg = { role: 'user', content: answer };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setTranscript('');
    transcriptRef.current = '';
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/interview/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          role: sessionConfig.role,
          company: sessionConfig.company,
          type: 'Behavioral',
          resumeText: sessionConfig.resumeText,
        }),
      });
      const data = await res.json();
      const aiText = data.text || 'Could you elaborate on that?';
      const aiMsg = { role: 'assistant', content: aiText };
      setMessages(prev => [...prev, aiMsg]);
      setCurrentQuestion(aiText);

      if (!isMuted) {
        setIsSpeaking(true);
        speak(aiText, () => setIsSpeaking(false));
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transcript, messages, isLoading, isMuted, sessionConfig]);

  const endInterview = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    // Save messages to store for feedback
    messages.forEach(m => addMessage(m));
    setInterviewStatus('finished');
    navigate('/feedback');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col md:flex-row gap-4 p-4 md:p-6">

      {/* Left Panel — Video & Current Question */}
      <div className="w-full md:w-5/12 flex flex-col gap-4">
        {/* HR Avatar */}
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-800 shadow-xl">
          <div className="absolute inset-0 bg-cover bg-center opacity-90 transition-all duration-700"
            style={{ backgroundImage: 'url("/assets/interviewer/hr_woman.png")' }} />
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
              <div className="flex gap-0.5 items-end h-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-1 bg-blue-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span className="text-xs text-blue-300 font-medium">AI Speaking</span>
            </div>
          )}
          {isLoading && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-blue-300 font-medium">Thinking...</span>
            </div>
          )}
          {/* Self PIP */}
          <div className="absolute bottom-4 right-4 w-72 aspect-video rounded-xl border-2 border-slate-600 overflow-hidden shadow-2xl transition-all hover:scale-105 duration-300">
            <CameraPreview className="w-full h-full" />
            <div className="absolute bottom-1 left-2 text-[10px] text-white/70 font-bold bg-black/40 px-1 rounded backdrop-blur-sm">You</div>
          </div>
          {/* Mode Badge */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-emerald-400 border border-emerald-500/30">
            HR ROUND
          </div>
        </div>

        {/* Current Question Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Current Question</p>
          <p className="text-slate-200 leading-relaxed text-sm font-light">{isLoading ? '...' : currentQuestion}</p>
        </div>
      </div>

      {/* Right Panel — Conversation + Mic */}
      <div className="w-full md:w-7/12 flex flex-col gap-4">
        {/* Message History */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-y-auto max-h-[420px] space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
              }`}>
                {m.role === 'assistant' && <span className="text-xs font-bold text-blue-400 block mb-1">HR Interviewer</span>}
                {m.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Transcript */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 min-h-[80px]">
          <div className="flex items-center gap-2 mb-2">
            <Mic size={14} className={isRecording ? 'text-red-400 animate-pulse' : 'text-slate-500'} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {isRecording ? 'Recording...' : 'Your Answer'}
            </span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            {transcript || <span className="text-slate-600 italic">Click mic to start speaking...</span>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <button
            onClick={endInterview}
            className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all flex-shrink-0"
            title="End Interview"
          >
            <PhoneOff size={20} />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isMuted ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button
            onClick={toggleRecording}
            className={`flex-1 h-12 rounded-full flex items-center justify-center gap-2 font-bold transition-all ${
              isRecording ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            {isRecording ? <><MicOff size={20} /> Stop Recording</> : <><Mic size={20} /> Start Speaking</>}
          </button>

          <button
            onClick={submitAnswer}
            disabled={!transcript.trim() || isLoading}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all flex-shrink-0"
            title="Submit Answer"
          >
            <Send size={20} />
          </button>
        </div>

        <p className="text-center text-xs text-slate-600">
          Press <span className="text-slate-400 font-semibold">Start Speaking</span> → talk → press <span className="text-slate-400 font-semibold">Stop</span> → press <span className="text-slate-400 font-semibold">Send ✈</span>
        </p>
      </div>
    </div>
  );
}
