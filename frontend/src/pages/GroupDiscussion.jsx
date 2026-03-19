import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Send, Users, Mic, MicOff, User, LogOut, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import CameraPreview from '../components/CameraPreview';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GD_TOPIC = "The Impact of AI on the Job Market";
const TURN_TIMEOUT = 5000; // 5 seconds for user to speak

function speak(text, speaker, onEnd) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = speaker.includes('Alex') ? 0.9 : 1.1; // Alex deeper, Sam higher
  
  const voices = window.speechSynthesis.getVoices();
  if (speaker.includes('Alex')) {
    const male = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google US English'));
    if (male) utter.voice = male;
  } else if (speaker.includes('Sam') || speaker.includes('Moderator')) {
    const female = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google UK English Female'));
    if (female) utter.voice = female;
  }

  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

export default function GroupDiscussion() {
  const navigate = useNavigate();
  const { sessionConfig } = useStore();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState({ alex: false, sam: false });
  const [activeSpeaker, setActiveSpeaker] = useState(null); // 'Alex', 'Sam', 'Moderator', or 'User'
  const [userTurnTimeLeft, setUserTurnTimeLeft] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState(''); // Use transcript instead of input for voice-only
  
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const userTurnTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Global cleanup & Mute handler
  useEffect(() => {
    if (isMuted) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
      setActiveSpeaker(null);
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.stop(); } catch (e) {}
    };
  }, []);

  // Socket setup
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);
    newSocket.emit('join_gd', { roomId: 'GD_123', user: 'Candidate', topic: GD_TOPIC });

    newSocket.on('gd_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      
      // Stop user turn timer if active
      if (userTurnTimerRef.current) {
        clearInterval(userTurnTimerRef.current);
        userTurnTimerRef.current = null;
        setUserTurnTimeLeft(0);
      }

      if (msg.role === 'student' || msg.role === 'moderator') {
        // Clear typing indicator
        if (msg.speaker.includes('Alex')) setIsTyping(prev => ({ ...prev, alex: false }));
        if (msg.speaker.includes('Sam')) setIsTyping(prev => ({ ...prev, sam: false }));
        
        // Add to speech queue
        speechQueueRef.current.push(msg);
        if (!isSpeakingRef.current) {
          processSpeechQueue();
        }
      }
    });

    return () => newSocket.close();
  }, []);

  const processSpeechQueue = () => {
    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      setActiveSpeaker(null);
      return;
    }

    isSpeakingRef.current = true;
    const msg = speechQueueRef.current.shift();
    setActiveSpeaker(msg.speaker);

    // If it's AI speaking, we might want to pause user recording to avoid self-feedback
    const wasRecording = isRecordingRef.current;
    if (wasRecording) {
      recognitionRef.current?.stop();
    }

    if (isMuted) {
      // If muted, skip speaking but still handle turn logic
      setTimeout(() => {
        if (msg.speaker.includes('Sam') || msg.role === 'moderator') {
          startUserTurn();
        }
        processSpeechQueue();
      }, 500);
      return;
    }

    speak(msg.text, msg.speaker, () => {
      // If it was Sam (last AI student) or Moderator (intro), start user's turn
      if (msg.speaker.includes('Sam') || msg.role === 'moderator') {
        startUserTurn();
      }
      
      // Resume recording if it was on
      if (wasRecording && !isSpeakingRef.current) {
        try { recognitionRef.current?.start(); } catch(e){}
      }
      
      processSpeechQueue();
    });
  };

  const startUserTurn = () => {
    if (userTurnTimerRef.current) clearInterval(userTurnTimerRef.current);
    
    let timeLeft = 5;
    setUserTurnTimeLeft(timeLeft);
    setActiveSpeaker('You');
    
    userTurnTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      setUserTurnTimeLeft(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(userTurnTimerRef.current);
        userTurnTimerRef.current = null;
        setUserTurnTimeLeft(0);
        handleSilence();
      }
    }, 1000);
  };

  const handleSilence = () => {
    // If user is silent, Alex should follow up
    if (socket) {
      setIsTyping({ alex: true, sam: false });
      socket.emit('send_gd_message', {
        roomId: 'GD_123',
        text: "[User is listening, please continue with a follow-up question/thought]",
        speaker: 'System (User Silent)',
        topic: GD_TOPIC,
      });
    }
  };

  // Speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onstart = () => console.log('🎙️ GD: STT Started');
    r.onresult = (event) => {
      let final = '', interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      console.log('📝 GD STT:', final || interim);
      setTranscript(final + interim);
    };
    r.onend = () => {
      console.log('🔇 GD: STT Ended. isRecording:', isRecordingRef.current);
      if (isRecordingRef.current) {
        setTimeout(() => { 
          try { if(isRecordingRef.current) r.start(); } catch (e) { console.warn('GD STT restart err:', e.message); } 
        }, 300);
      }
    };
    r.onerror = (e) => {
      console.error('❌ GD STT Error:', e.error);
      if (e.error === 'not-allowed') {
        alert('Microphone access denied. Please allow mic in browser settings.');
        setIsRecording(false); isRecordingRef.current = false;
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('STT Error:', e.error);
      }
    };
    recognitionRef.current = r;
    return () => r.stop();
  }, []);

  const toggleRecording = () => {
    console.log('Toggle recording. GD Current:', isRecordingRef.current);
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      try { recognitionRef.current?.stop(); } catch(e){}
      setIsRecording(false);
    } else {
      // Stop user turn timer if active when user starts recording
      if (userTurnTimerRef.current) {
        clearInterval(userTurnTimerRef.current);
        userTurnTimerRef.current = null;
        setUserTurnTimeLeft(0);
      }
      setActiveSpeaker('You');

      isRecordingRef.current = true;
      setTranscript('');
      try { 
        recognitionRef.current?.start(); 
        setIsRecording(true);
      } catch (e) {
        if (e.message?.includes('already started')) {
          setIsRecording(true);
        } else {
          console.error('STT GD Start Error:', e);
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      }
    }
  };

  const sendMessage = (e) => {
    if (e) e.preventDefault();
    const text = transcript.trim();
    if (!text || !socket) return;

    // Stop user turn timer if active
    if (userTurnTimerRef.current) {
      clearInterval(userTurnTimerRef.current);
      userTurnTimerRef.current = null;
      setUserTurnTimeLeft(0);
    }

    // Stop recording when sending
    if (isRecording) { 
      isRecordingRef.current = false;
      recognitionRef.current?.stop(); 
      setIsRecording(false); 
    }

    // Show typing indicators for both AI students
    setIsTyping({ alex: true, sam: true });
    
    socket.emit('send_gd_message', {
      roomId: 'GD_123',
      text,
      speaker: 'You (Candidate)',
      topic: GD_TOPIC,
    });
    setTranscript('');
  };

  const getBubbleStyle = (msg) => {
    if (msg.role === 'user') return 'bg-blue-600 text-white rounded-tr-sm ml-auto';
    if (msg.role === 'moderator') return 'bg-indigo-900/40 border border-indigo-500/20 text-indigo-100 rounded-tl-sm';
    if (msg.speaker?.includes('Alex')) return 'bg-slate-800 text-slate-200 rounded-tl-sm border-l-2 border-emerald-500/60';
    return 'bg-slate-800 text-slate-200 rounded-tl-sm border-l-2 border-purple-500/60';
  };

  const getSpeakerColor = (msg) => {
    if (msg.role === 'moderator') return 'text-indigo-400';
    if (msg.role === 'user') return 'text-blue-300';
    if (msg.speaker?.includes('Alex')) return 'text-emerald-400';
    return 'text-purple-400';
  };

  const isUserTurn = userTurnTimeLeft > 0;

  return (
    <div className="h-screen bg-[#0b1120] text-slate-200 flex flex-col font-sans overflow-hidden">
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.5); }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>

      {/* Header */}
      <header className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Group Discussion</h1>
            <p className="text-xs text-blue-400 font-medium">Topic: {GD_TOPIC}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/feedback')}
          className="px-3 py-1.5 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-800 transition flex items-center gap-1.5"
        >
          <LogOut size={14} /> Leave
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden p-4 md:p-6 gap-6">

        {/* Left Panel: Videos/Participants */}
        <div className="w-full md:w-5/12 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <Users size={12} /> Live Discussion (4 Participants)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Moderator AI', color: 'text-indigo-400', border: 'border-indigo-500/30', image: '/assets/interviewer/gd_mod.png', role: 'moderator' },
                { name: 'AI Candidate 1 (Alex)', color: 'text-emerald-400', border: 'border-emerald-500/30', image: '/assets/interviewer/gd_alex.png', role: 'student' },
                { name: 'AI Candidate 2 (Sam)', color: 'text-purple-400', border: 'border-purple-500/30', image: '/assets/interviewer/gd_sam.png', role: 'student' },
                { name: 'You', color: 'text-blue-400', border: 'border-blue-500/30', image: null, role: 'user' },
              ].map(p => {
                const isActive = activeSpeaker?.includes(p.role === 'user' ? 'You' : p.name) || (p.role === 'user' && activeSpeaker === 'You');
                return (
                  <div key={p.name} className={`aspect-video bg-slate-800 rounded-xl relative overflow-hidden border ${isActive ? 'border-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)] scale-[1.02]' : p.border} flex items-center justify-center flex-col gap-1 transition-all duration-300`}>
                    {isActive && (
                      <div className="absolute inset-0 bg-blue-500/5 pointer-events-none ring-2 ring-blue-500 ring-inset animate-pulse" />
                    )}
                    
                    {p.name === 'You' ? (
                      <CameraPreview className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full relative">
                        <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-1000 ${isActive ? 'scale-110 opacity-100' : 'opacity-70'}`} 
                          style={{ backgroundImage: `url("${p.image}")` }} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                        
                        {/* Typing indicator for AI students */}
                        {((p.name.includes('Alex') && isTyping.alex) || (p.name.includes('Sam') && isTyping.sam)) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                            <div className="flex gap-1.5 px-3 py-2 bg-black/40 rounded-full border border-white/10">
                              {[0,1,2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute top-2 right-2 flex gap-1 items-end h-4 px-1.5 py-1 bg-black/40 backdrop-blur-md rounded-lg">
                        {[1,2,3,4].map(i => (
                          <div 
                            key={i} 
                            className="w-0.5 bg-blue-400 rounded-full animate-wave" 
                            style={{ height: '100%', animationDelay: `${i*0.15}s` }} 
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className={`absolute bottom-1 left-2 text-[9px] font-bold ${isActive ? 'text-blue-400' : p.color} bg-black/40 px-1 rounded`}>
                      {p.name}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* User Turn Indicator moved here */}
            {isUserTurn && (
              <div className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {userTurnTimeLeft}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-400 uppercase tracking-tight">Your Turn to Speak!</p>
                    <p className="text-[10px] text-blue-300/70">Share your thoughts on the topic...</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Messages & Voice Controls */}
        <div className="w-full md:w-7/12 flex flex-col gap-4">
          <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                  Waiting for the moderator to open the discussion...
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'items-start'}`}>
                  <span className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${getSpeakerColor(msg)} uppercase tracking-widest`}>
                    {msg.speaker}
                    {msg.role === 'moderator' && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] rounded uppercase">MOD</span>}
                  </span>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-full ${getBubbleStyle(msg)}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Transcript Display (Similar to HR) */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800">
               <div className="flex items-center gap-2 mb-2">
                <Mic size={14} className={isRecording ? 'text-red-400 animate-pulse' : 'text-slate-500'} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isRecording ? 'Transcription Active' : 'Your Answer'}
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed min-h-[40px]">
                {transcript || <span className="text-slate-600 italic">Voice interaction enabled...</span>}
              </p>
            </div>

            {/* Controls Dashboard (Voice-Only) */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3 items-center">
              <button
                onClick={() => navigate('/feedback')}
                className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all flex-shrink-0 border border-red-500/20"
                title="End Discussion"
              >
                <PhoneOff size={20} />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 border ${isMuted ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'}`}
                title={isMuted ? 'Unmute Discussion' : 'Mute Discussion'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <button
                onClick={toggleRecording}
                className={`flex-1 h-12 rounded-full flex items-center justify-center gap-3 font-bold transition-all shadow-lg ${
                  isRecording ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
                }`}
              >
                {isRecording ? <><MicOff size={20} /> Stop Speaking</> : <><Mic size={20} /> Start Speaking</>}
              </button>

              <button
                onClick={sendMessage}
                disabled={!transcript.trim() || isSpeakingRef.current}
                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 disabled:grayscale text-white flex items-center justify-center transition-all flex-shrink-0 shadow-lg shadow-emerald-500/20"
                title="Send Contribution"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
