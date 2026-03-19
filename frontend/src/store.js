import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  sessionConfig: {
    resumeText: '',
    role: '',
    company: '',
    mode: 'Technical Round'
  },
  setSessionConfig: (config) => set((state) => ({ sessionConfig: { ...state.sessionConfig, ...config } })),
  
  scoreHistory: JSON.parse(localStorage.getItem('interview_scores') || '[]'),

  interviewState: {
    messages: [],
    status: 'idle', // idle, active, finished
    scores: null 
  },

  addMessage: (msg) => set((state) => ({ 
    interviewState: { 
      ...state.interviewState, 
      messages: [...state.interviewState.messages, msg] 
    } 
  })),

  setInterviewStatus: (status) => set((state) => ({ 
    interviewState: { ...state.interviewState, status } 
  })),

  setScores: (scores) => {
    set((state) => {
      const newHistory = [
        { 
          ...scores, 
          round: state.sessionConfig.mode, 
          date: new Date().toISOString() 
        }, 
        ...state.scoreHistory
      ].slice(0, 10); // Keep last 10
      
      localStorage.setItem('interview_scores', JSON.stringify(newHistory));
      
      return { 
        interviewState: { ...state.interviewState, scores },
        scoreHistory: newHistory
      };
    });
  },

  resetInterview: () => set((state) => ({
    interviewState: { messages: [], status: 'idle', scores: null }
  })),

  logout: () => {
    localStorage.removeItem('interview_scores');
    set({
      user: null,
      sessionConfig: {
        resumeText: '',
        role: '',
        company: '',
        mode: 'Technical Round'
      },
      scoreHistory: [],
      interviewState: {
        messages: [],
        status: 'idle',
        scores: null
      }
    });
  }
}));
