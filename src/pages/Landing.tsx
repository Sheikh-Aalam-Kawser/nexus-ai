import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/firebase";
import { useAppStore } from "@/store";
import { useNavigate } from "react-router-dom";
import { Brain, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function Landing() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      const result = await signIn();
      if (result) {
        setUser({ uid: result.user.uid, displayName: result.user.displayName, email: result.user.email });
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error("Sign in failed. Using preview mode.");
      setUser({ uid: 'mock-' + Date.now(), displayName: 'Demo User', email: 'demo@example.com' });
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-slate-50 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.05)_0%,_transparent_50%)]">
      <div className="mx-auto flex max-w-[600px] flex-col items-center gap-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-500/20 shadow-sm">
          <Brain className="h-10 w-10" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-light text-slate-900 sm:text-5xl tracking-tight" style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
            NEXUS
          </h1>
          <p className="text-xl text-slate-600 font-medium">
            AI Deadline Guardian
          </p>
          <p className="max-w-[500px] text-slate-500 text-lg leading-relaxed">
            Stop reacting to deadlines. Start owning them. NEXUS breaks your tasks down, carves out your calendar, and nudges you with precision.
          </p>
        </div>

        {user ? (
          <Button 
            size="lg" 
            className="bg-emerald-600 text-white hover:bg-emerald-700 h-14 px-10 text-lg shadow-md rounded-full font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        ) : (
          <Button 
            size="lg" 
            className="bg-slate-900 text-white hover:bg-slate-800 h-14 px-10 text-lg shadow-md rounded-full font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
            onClick={handleSignIn}
          >
            Sign in with Google
          </Button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 text-sm text-slate-600 font-medium">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-slate-100">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <span>Autonomous Scheduling</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-slate-100">
              <Brain className="h-5 w-5 text-emerald-600" />
            </div>
            <span>Task Decomposition</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-slate-100">
              <ShieldAlert className="h-5 w-5 text-emerald-600" />
            </div>
            <span>Context-Aware Nudges</span>
          </div>
        </div>
      </div>
    </div>
  );
}
