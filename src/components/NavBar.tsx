import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  ListTodo, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Calendar
} from "lucide-react";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, user } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      color: "text-emerald-400"
    },
    {
      label: "Focus Plan",
      path: "/plan",
      icon: Calendar,
      color: "text-indigo-400"
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
    <nav className="sticky top-0 z-50 w-full bg-[#111113]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand / Logo */}
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg p-1"
        >
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
            <Sparkles className="h-4.5 w-4.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white font-mono uppercase">
              NEXUS
            </span>
            <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase leading-none">
              Focus Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation (horizontal line, hidden on mobile) */}
        <div className="hidden md:flex items-center gap-6" id="desktop-navigation">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all duration-200 outline-none focus:ring-2 focus:ring-slate-700 ${
                  isActive 
                    ? "text-white bg-slate-900 border border-slate-800" 
                    : "text-slate-400 hover:text-white"
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

          <div className="h-4 w-px bg-slate-800/80 mx-1" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-full outline-none focus:ring-2 focus:ring-red-500/50"
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
            className="p-2 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900 rounded-xl border border-slate-800/60 transition-all outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {isOpen ? <X className="h-5 w-5 text-emerald-400" /> : <Menu className="h-5 w-5" />}
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
                className="absolute right-6 top-16 w-56 bg-[#111113]/95 backdrop-blur-lg border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-1.5"
              >
                <div className="px-2 py-1.5 mb-1 border-b border-slate-900/80">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block">
                    Navigation Menu
                  </span>
                </div>

                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                        isActive
                          ? "bg-slate-900/80 text-white border border-slate-800"
                          : "text-slate-400 hover:bg-slate-900/40 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${item.color}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </Link>
                  );
                })}

                <div className="h-px bg-slate-900/80 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-left w-full outline-none"
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
