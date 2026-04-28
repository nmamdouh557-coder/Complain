import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Loader2, ClipboardCheck, Eye, EyeOff, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUsername = username.trim();
    const cleanPassword = password; // Don't trim password to allow intentional spaces

    if (!cleanUsername || !cleanPassword) {
      toast.error("Please enter both username and password");
      return;
    }
    setLoading(true);
    try {
      const userProfile = await api.login(cleanUsername, cleanPassword);
      login(userProfile);
      toast.success("Welcome to Swish Complaint Portal!");
    } catch (error: any) {
      const message = "Invalid username or password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-slate-950 transition-colors">
      {/* Left Panel - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-[#008f5d] items-center justify-center p-16 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white blur-3xl" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-lg space-y-8 relative z-10"
        >
          <div className="inline-block p-1 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl">
            <div className="relative h-32 w-64 flex items-center justify-center overflow-hidden rounded-xl bg-emerald-900/20">
              <img 
                src="/api/attachments/70d6a048-c89b-437b-9c60-72153579e09d" 
                alt="Swish Logo" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'text-4xl font-black tracking-tighter text-white';
                    fallback.innerText = 'SWISH';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Customer Complaint <br />
              <span className="text-emerald-300">Management System</span>
            </h1>
            <p className="text-lg text-emerald-50/80 leading-relaxed font-medium">
              A professional platform designed for efficient handling and tracking of customer feedback across all branches and brands.
            </p>
          </div>
          
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-[#008f5d] bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-emerald-100/60 uppercase tracking-widest">Trusted by 50+ Branches</p>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/30 md:bg-white dark:md:bg-slate-950 transition-colors">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] space-y-10"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Complaint System</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 transition-colors">Username</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#008f5d] transition-colors" />
                  <Input 
                    id="username" 
                    placeholder="Enter your username" 
                    className="pl-12 h-14 bg-blue-50/50 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-[#008f5d] focus:ring-4 focus:ring-emerald-500/5 transition-all rounded-2xl text-slate-700 dark:text-slate-200 font-medium"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" title="Password" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 transition-colors">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#008f5d] transition-colors" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password" 
                    className="pl-12 pr-12 h-14 bg-blue-50/50 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-[#008f5d] focus:ring-4 focus:ring-emerald-500/5 transition-all rounded-2xl text-slate-700 dark:text-slate-200 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#008f5d] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#008f5d] hover:bg-[#007a4f] text-white font-bold text-base rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                </>
              )}
            </Button>
          </form>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
                © 2026 Swish Complaint Management System.
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">All rights reserved.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
