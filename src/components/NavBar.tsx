import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  ListTodo, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Calendar,
  WifiOff
} from "lucide-react";
import { Logo } from "./Logo";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, user } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close dropdown when path changes or on click outside
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      color: "text-amber-500"
    },
    {
      label: "My Tasks",
      path: "/tasks",
      icon: ListTodo,
      color: "text-emerald-600"
    },
    {
      label: "Focus Plan",
      path: "/plan",
      icon: Calendar,
      color: "text-indigo-600"
    },
    {
      label: "Profile",
      path: "/profile",
      icon: UserIcon,
      color: "text-pink-400"
    }
  ];

  const handleLogout = async () => {
    try {
      const { logOut } = await import('@/lib/firebase');
      await logOut();
    } catch (e) {
      console.error('Logout error', e);
    }
    setUser(null);
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center flex-1">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg p-1 w-fit"
          >
            <div className="h-8 w-8 flex items-center justify-center transition-transform group-hover:scale-105">
              <Logo className="h-full w-full" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                NEXUS
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center justify-center gap-2 shrink-0" id="desktop-navigation-links">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono transition-all duration-200 outline-none focus:ring-2 focus:ring-slate-700 ${
                  isActive 
                    ? "text-slate-900 bg-slate-100 border border-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/5 to-teal-500/5 -z-10 pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center justify-end gap-4 flex-1" id="desktop-actions">
          {isOffline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-mono text-xs uppercase tracking-wider" title="You are currently offline. Changes will sync when reconnected.">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline Mode</span>
            </div>
          )}
          <button
            onClick={() => {
              useAppStore.getState().setEmergencyMode(true);
              navigate('/dashboard');
            }}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-widest transition-all animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]"
            title="Activate Emergency Protocol for imminent deadlines"
          >
            <Sparkles className="h-4 w-4" />
            Emergency Protocol
          </button>

          <div className="h-4 w-px bg-slate-200/80 mx-1" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-red-400 hover:bg-red-50/50 transition-colors px-3 py-1.5 rounded-full outline-none focus:ring-2 focus:ring-red-500/50"
            id="desktop-logout"
          >
            <LogOut className="h-4 w-4 text-red-400/80" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile/Tablet Trigger Button */}
        <div className="md:hidden flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100/50 hover:bg-slate-100 rounded-xl border border-slate-200/60 transition-all outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {isOpen ? <X className="h-5 w-5 text-emerald-600" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Mobile Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                id="mobile-navigation"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-6 top-16 w-56 bg-white/95 backdrop-blur-lg border border-slate-200/90 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-1.5"
              >
                <div className="px-2 py-1.5 mb-1 border-b border-slate-200/80">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block">
                    Navigation Menu
                  </span>
                </div>

                {isOffline && (
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono text-amber-600 bg-amber-500/10 border border-amber-500/20 mb-1">
                    <WifiOff className="h-4 w-4" />
                    <span>Offline Mode</span>
                  </div>
                )}

                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                        isActive
                          ? "bg-slate-100/80 text-slate-900 border border-slate-200"
                          : "text-slate-500 hover:bg-slate-100/40 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${item.color}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </Link>
                  );
                })}

                <div className="h-px bg-slate-100/80 my-1" />

                <button
                  onClick={() => {
                    useAppStore.getState().setEmergencyMode(true);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all text-left w-full outline-none"
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Emergency Protocol</span>
                </button>

                <div className="h-px bg-slate-100/80 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all text-left w-full outline-none"
                >
                  <LogOut className="h-4.5 w-4.5 text-red-500/80" />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </nav>
  );
}
