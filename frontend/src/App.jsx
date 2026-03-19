import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useStore } from './store';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import SetupPage from './pages/SetupPage';
import TechnicalInterview from './pages/TechnicalInterview';
import BehavioralInterview from './pages/BehavioralInterview';
import GroupDiscussion from './pages/GroupDiscussion';
import FeedbackPage from './pages/FeedbackPage';
import ProfilePage from './pages/ProfilePage';


function App() {
  const { user, setUser } = useStore();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return (
    <Router>
      <div className="min-h-screen bg-[#0b1120] text-slate-200 selection:bg-blue-500/30">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/setup" element={user ? <SetupPage /> : <Navigate to="/auth" />} />
          <Route path="/interview/technical" element={user ? <TechnicalInterview /> : <Navigate to="/auth" />} />
          <Route path="/interview/behavioral" element={user ? <BehavioralInterview /> : <Navigate to="/auth" />} />
          <Route path="/interview/gd" element={user ? <GroupDiscussion /> : <Navigate to="/auth" />} />
          <Route path="/feedback" element={user ? <FeedbackPage /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/auth" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
