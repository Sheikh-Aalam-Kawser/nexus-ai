import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/firebase";
import { useAppStore } from "@/store";
import { useNavigate, Link } from "react-router-dom";
import { Brain, Clock, ShieldAlert, Cpu, ArrowRight, Activity, Zap, AlertTriangle, Wifi, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { motion } from "motion/react";

export default function Landing() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      const result = await signIn();
      if (result) {
        setUser({ uid: result.user.uid, displayName: result.user.displayName, email: result.user.email });
        
        // Trigger calendar sync immediately after sign in
        useAppStore.getState().ingestCalendarEvents().then((syncResult) => {
          if (syncResult.imported > 0) {
            import('sonner').then(({ toast }) => {
              toast.success(`NEXUS Auto-Sync: Imported ${syncResult.imported} tasks from Calendar.`);
              if (syncResult.emergencies > 0) {
                toast.warning(`WARNING: ${syncResult.emergencies} upcoming emergency deadline(s) detected!`);
                useAppStore.getState().setEmergencyMode(true);
              }
            });
          }
        });
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error?.message || "Sign in failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500/30 font-sans relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wNCkiLz48L3N2Zz4=')] opacity-50 pointer-events-none mix-blend-multiply" />
      
      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex items-center justify-center">
            <Logo className="h-full w-full" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xl font-black tracking-tighter text-slate-900">
              Nexus-ai
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://nexus-518778203489.us-west1.run.app/privacy" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
            Privacy Policy
          </a>
          <Button 
            variant="ghost" 
            className="hidden sm:flex text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() => window.location.href = "mailto:team@nexus.com"}
          >
            Contact
          </Button>
          {user ? (
            <Button 
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 font-medium transition-all shadow-sm"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>
          ) : (
            <Button 
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 font-medium transition-all shadow-sm"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-24 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-mono font-semibold uppercase tracking-widest mb-8"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>System Online • v1.0.0</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6"
        >
          Stop reacting to deadlines. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Start owning them.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10 font-medium"
        >
          NEXUS is an autonomous productivity engine. It decomposes complex tasks, carves out your calendar strategically, and protects your focus with proactive AI assistance and context-aware precision.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          {user ? (
            <Button 
              size="lg"
              className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 h-14 px-8 text-base shadow-lg shadow-emerald-600/20 rounded-full font-medium transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/30 group"
              onClick={() => navigate('/dashboard')}
            >
              Enter Dashboard
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button 
              size="lg"
              className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 h-14 px-8 text-base shadow-xl shadow-slate-900/10 rounded-full font-medium transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/20 group"
              onClick={handleSignIn}
            >
              Initialize Engine
              <Zap className="ml-2 h-4 w-4 transition-transform group-hover:scale-110" />
            </Button>
          )}
        </motion.div>
      </main>

      {/* Bento Grid Features */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 flex flex-col items-start hover:shadow-md transition-shadow group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Brain className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">Task Decomposition</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Complex projects are automatically broken down into atomic, actionable steps using advanced AI analysis.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 flex flex-col items-start hover:shadow-md transition-shadow group">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">Autonomous Scheduling</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              NEXUS intelligently carves out time blocks in your calendar based on priority, deadline, and energy levels.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 flex flex-col items-start hover:shadow-md transition-shadow group">
            <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">Proactive AI Assistance</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Receive precise, context-aware nudges and proactive support exactly when you need it, protecting your deep work states.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 flex flex-col items-start hover:shadow-md transition-shadow group">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">Emergency Protocol</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              When deadlines loom, activate a system-wide reset that aggressively re-prioritizes your focus to mission-critical tasks.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 flex flex-col items-start hover:shadow-md transition-shadow group lg:col-span-2">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Wifi className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">Offline Resilience</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Your productivity doesn't stop when the internet drops. Full local caching via Service Workers ensures your critical tasks and schedule are always accessible, syncing seamlessly when you reconnect.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/60 py-8 text-center text-slate-400 text-sm font-medium">
        <p>Engineered for maximum cognitive output.</p>
        <p className="mt-2 text-xs font-mono uppercase tracking-widest text-slate-300">© {new Date().getFullYear()} Nexus-ai Systems</p>
        <div className="mt-4">
          <a href="https://nexus-518778203489.us-west1.run.app/privacy" className="text-emerald-600 hover:text-emerald-700 underline transition-colors">
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}

