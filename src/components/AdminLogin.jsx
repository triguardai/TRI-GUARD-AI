import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Save the passkey to localStorage so the dashboard can use it for API calls
    localStorage.setItem('triguard.adminOsintToken', password);

    // Simulate network verification delay
    setTimeout(() => {
      window.location.href = '/admin/osint-candidates';
    }, 1200);
  };

  return (
    <div className="relative min-h-screen bg-[#0B1120] flex items-center justify-center overflow-hidden selection:bg-blue-500/30 font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwaGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] pointer-events-none opacity-50" />

      <a href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white transition-colors">
        <ArrowRight className="w-4 h-4 rotate-180" /> Kembali ke Beranda
      </a>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="relative rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-[0_0_80px_rgba(37,99,235,0.2)] backdrop-blur-xl">
          {/* Top highlight border */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
          
          <div className="flex flex-col items-center mb-8">
            {/* 3D Rotating Logo */}
            <div className="relative w-24 h-24 mb-6 [perspective:1000px]">
              <motion.div
                animate={{ rotateY: 360, rotateX: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="relative w-full h-full [transform-style:preserve-3d]"
              >
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/60 [transform:rotateX(0deg)]" />
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/60 [transform:rotateX(60deg)]" />
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/60 [transform:rotateX(120deg)]" />
                <div className="absolute inset-0 flex items-center justify-center m-2 rounded-full border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <ShieldCheck className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                </div>
              </motion.div>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight text-center">
              TriGuard<span className="text-blue-500">AI</span> Admin
            </h1>
            <p className="text-slate-400 text-sm mt-2 text-center">
              Otentikasi akses ke Pusat Verifikasi Laporan & OSINT Candidate.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                Admin ID / Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@triguard.ai"
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-2xl px-12 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                Security Passkey
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-2xl px-12 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-blue-600 py-3.5 font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Verifying Access...</span>
                </>
              ) : (
                <>
                  <span>Login to Secure Panel</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Lock className="w-3 h-3" />
            <span>End-to-End Encrypted Verification</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
