import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import MyTasks from './pages/MyTasks';
import Profile from './pages/Profile';
import TaskPlanPage from './pages/TaskPlanPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NavBar from './components/NavBar';
import { Toaster } from '@/components/ui/sonner';
import { initAuth } from './lib/firebase';
import { FocusPlanPopup } from './components/FocusPlanPopup';
import { DistractionBlocker } from './components/DistractionBlocker';

export default function App() {
  const { user, tasks, autoEvaluatePrioritiesAndFocus, setUser } = useAppStore();
  const navigate = useNavigate();
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setUser({ uid: user.uid, displayName: user.displayName, email: user.email });
        setAuthInitialized(true);
        // Auto-ingest calendar events in the background
        useAppStore.getState().ingestCalendarEvents().then((result) => {
          if (result.imported > 0) {
            import('sonner').then(({ toast }) => {
              toast.success(`NEXUS Auto-Sync: Imported ${result.imported} tasks from Calendar.`);
              if (result.emergencies > 0) {
                toast.warning(`WARNING: ${result.emergencies} upcoming emergency deadline(s) detected!`);
                useAppStore.getState().setEmergencyMode(true);
              }
            });
          }
        });
      },
      () => {
        setUser(null);
        setAuthInitialized(true);
      }
    );
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    autoEvaluatePrioritiesAndFocus();
  }, [tasks.length, autoEvaluatePrioritiesAndFocus]);

  if (!authInitialized) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500/30 flex flex-col">
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/tasks" element={user ? <MyTasks /> : <Navigate to="/" />} />
        <Route path="/plan" element={user ? <TaskPlanPage /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
      </Routes>
      <FocusPlanPopup />
      <DistractionBlocker />
      <Toaster theme="light" />
    </div>
  );
}
