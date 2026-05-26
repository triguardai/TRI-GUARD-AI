import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  ArrowRightLeft,
  Wallet,
  CheckCircle2,
  Bot,
  Lock,
  Search,
  MessageSquare,
  ChevronRight,
  User,
  Brain,
  X,
  Send,
  Package,
  Truck,
  MapPin,
  Check,
  Signal,
  Wifi,
  Battery,
  Menu,
} from 'lucide-react';
import { sendMessage } from './services/aiService';
import { classifyIntent } from './utils/intentRouter';
import { buildFallbackReply } from './utils/fallback';
import AdminOsintCandidates from './components/AdminOsintCandidates';
import AdminLogin from './components/AdminLogin';
import ReportCenter from './components/ReportCenter';

const steps = [
  {
    title: 'Pembeli Membayar',
    desc: 'Dana + Admin ditransfer ke Brankas AI Escrow.',
  },
  {
    title: 'Penjual Mengirim',
    desc: 'Penjual memasukkan resi, AI memverifikasi ke JNE/J&T.',
  },
  {
    title: 'AI Melacak Resi',
    desc: 'Sistem memantau pergerakan kurir secara otomatis.',
  },
  {
    title: 'Dana Cair',
    desc: 'Barang diterima, AI melepas dana ke penjual.',
  },
];

const SocialIcon = ({ children, className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    {children}
  </svg>
);

const FacebookIcon = ({ className }) => (
  <SocialIcon className={className}>
    <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.3V11H8v3h2.3v8h3.2Z" />
  </SocialIcon>
);

const XIcon = ({ className }) => (
  <SocialIcon className={className}>
    <path d="M18.9 3H21l-4.6 5.3L22 21h-4.6l-3.7-4.8L9.5 21H7.4l5-5.8L2 3h4.7l3.3 4.4L13.8 3h2.1l-5 5.8L18.9 3Zm-1.6 15.3h1.3L6.2 5.6H4.8l12.5 12.7Z" />
  </SocialIcon>
);

const InstagramIcon = ({ className }) => (
  <SocialIcon className={className}>
    <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.8 1.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
  </SocialIcon>
);

const BoxIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const viewportLoop = { once: false, amount: 0.2 };

const revealUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const revealSoft = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const OrbitLogo = ({ sizeClass = 'h-8 w-8', iconClass = 'h-4 w-4', duration = 10 }) => (
  <div className={`relative ${sizeClass} flex-shrink-0 [perspective:1000px]`}>
    <motion.div
      animate={{ rotateY: 360, rotateX: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      className="relative h-full w-full [transform-style:preserve-3d]"
    >
      <div className="absolute inset-0 rounded-full border-[2px] border-blue-500/80 [transform:rotateX(0deg)]" />
      <div className="absolute inset-0 rounded-full border-[2px] border-purple-500/80 [transform:rotateX(60deg)]" />
      <div className="absolute inset-0 rounded-full border-[2px] border-cyan-500/80 [transform:rotateX(120deg)]" />
    </motion.div>
    <div className="absolute inset-0 flex items-center justify-center">
      <ShieldCheck className={`${iconClass} text-white drop-shadow-[0_0_5px_rgba(59,130,246,1)]`} />
    </div>
  </div>
);

const TrackingView = () => (
  <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#0B1120] p-5 pb-24">
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">Informasi Pengiriman</span>
        <span className="flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-500">
          <Truck className="h-3 w-3" /> J&T EXPRESS
        </span>
      </div>
      <div className="text-2xl font-bold tracking-wider text-white">JNT001122334455</div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
        <div>
          <p className="mb-0.5 text-xs text-slate-500">Pengirim</p>
          <p className="text-sm font-semibold text-white">Dimas (Jakarta)</p>
        </div>
        <div className="text-slate-600">
          <ChevronRight className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="mb-0.5 text-xs text-slate-500">Penerima</p>
          <p className="text-sm font-semibold text-white">Budi (Bandung)</p>
        </div>
      </div>
    </div>

    <h4 className="mb-4 px-1 text-lg font-bold text-white">Riwayat Perjalanan (Demo)</h4>

    <div className="relative ml-4 space-y-8 border-l-2 border-slate-700 pb-4">
      <div className="relative pl-6">
        <div className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-[#0B1120]">
          <Check className="h-3 w-3 text-white" />
        </div>
        <p className="text-sm font-bold text-emerald-400">Paket Diterima</p>
        <p className="mt-1 text-xs text-slate-400">
          Paket telah diterima oleh BUDI (Yang Bersangkutan).
        </p>
        <p className="mt-1 text-xs text-slate-500">17 Mei 2026, 14:00 WIB</p>
      </div>

      <div className="relative pl-6">
        <div className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 ring-4 ring-[#0B1120]">
          <MapPin className="h-3 w-3 text-white" />
        </div>
        <p className="text-sm font-bold text-white">Sedang Diantar</p>
        <p className="mt-1 text-xs text-slate-400">
          Paket dibawa oleh kurir (Ujang) menuju alamat tujuan.
        </p>
        <p className="mt-1 text-xs text-slate-500">17 Mei 2026, 09:30 WIB</p>
      </div>

      <div className="relative pl-6">
        <div className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 ring-4 ring-[#0B1120]">
          <Package className="h-3 w-3 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-white">Tiba di Hub Transit</p>
        <p className="mt-1 text-xs text-slate-400">
          Paket telah tiba di fasilitas transit [BANDUNG_GATEWAY].
        </p>
        <p className="mt-1 text-xs text-slate-500">16 Mei 2026, 23:45 WIB</p>
      </div>

      <div className="relative pl-6">
        <div className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 ring-4 ring-[#0B1120]">
          <BoxIcon className="h-3 w-3 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-white">Diserahkan ke Kurir</p>
        <p className="mt-1 text-xs text-slate-400">
          Penjual telah menyerahkan paket ke counter J&T Jakarta Selatan.
        </p>
        <p className="mt-1 text-xs text-slate-500">15 Mei 2026, 16:30 WIB</p>
      </div>
    </div>
  </div>
);

// `buildFallbackReply` moved to `src/utils/fallback.js`.
const BankReceipt = ({ type, title, amount, date, bank, account, name }) => (
  <div
    className={`relative my-2 w-full max-w-[240px] overflow-hidden rounded-xl border bg-white p-4 text-slate-800 shadow-md ${
      type === 'in'
        ? 'border-gray-200 border-l-4 border-l-blue-500'
        : 'border-gray-200 border-l-4 border-l-emerald-500'
    }`}
  >
    <div
      className={`absolute top-0 left-0 h-1 w-full ${type === 'in' ? 'bg-blue-500' : 'bg-emerald-500'}`}
    ></div>
    <div className="mt-1 mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
      <div className={`${type === 'in' ? 'bg-blue-100' : 'bg-emerald-100'} rounded-full p-1.5`}>
        {type === 'in' ? (
          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        )}
      </div>
      <span className="text-sm font-bold">{title}</span>
    </div>
    <div className="space-y-1.5 text-xs">
      <p className="text-gray-500">{date}</p>
      <p className="mt-1 mb-3 text-xl font-bold text-black">Rp {amount}</p>
      <div className="mt-3 border-t border-dashed border-gray-300 pt-3">
        <p className="mb-0.5 text-gray-500">
          {type === 'in' ? 'Dana Masuk Dari:' : 'Ditransfer Ke:'}
        </p>
        <p className="font-bold text-black">{bank}</p>
        <p className="font-mono text-sm text-gray-700">{account}</p>
        <p className="mt-0.5 font-semibold text-black uppercase">{name}</p>
      </div>
    </div>
  </div>
);

const AccountChecker = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);

  const scrapedScammers = [
    {
      id: 1,
      acc: '1234567890',
      bank: 'BCA',
      name: 'PENIPU GADUNGAN',
      platform: 'Twitter / X',
      post: '"Tolong bantu report rek BCA 1234567890 atas nama Penipu, dia bawa lari duit beli iPhone..."',
      date: '2 Hari Lalu',
      icon: <XIcon className="h-4 w-4 text-sky-400" />,
    },
    {
      id: 2,
      acc: '0987654321',
      bank: 'DANA',
      name: 'SANG MALING',
      platform: 'Facebook Group',
      post: '"Hati-hati nomor DANA 0987654321, nipu jual beli HP. Udah ditransfer malah di block."',
      date: '5 Hari Lalu',
      icon: <FacebookIcon className="h-4 w-4 text-blue-500" />,
    },
    {
      id: 3,
      acc: '1122334455',
      bank: 'SEABANK',
      name: 'TUKANG TIPU',
      platform: 'Instagram',
      post: '"Awas akun IG @hp_murah_nipu, pake rek Seabank 1122334455. Jangan sampai ada korban lagi!"',
      date: '1 Minggu Lalu',
      icon: <InstagramIcon className="h-4 w-4 text-pink-500" />,
    },
  ];

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!accountNumber) return;

    setIsSearching(true);
    setResult(null);

    try {
      const response = await fetch(`/api/check-account?accountNumber=${accountNumber}`);
      if (!response.ok) {
        throw new Error('Gagal cek rekening');
      }

      const data = await response.json();

      if (data.status === 'verified_risky' || data.status === 'rejected') {
        setResult({
          status: 'danger',
          name: 'TERINDIKASI PENIPUAN',
          bank: 'BANK',
          reports: data.source_count || 1,
          trustScore: data.risk_score || 10,
          message: 'HATI-HATI! AI menemukan laporan penipuan terkait rekening ini di database.',
        });
      } else if (data.status === 'candidate' || data.status === 'pending_review') {
        setResult({
          status: 'warning',
          name: 'DALAM REVIEW',
          bank: 'BANK',
          reports: data.source_count || 0,
          trustScore: data.risk_score || 40,
          message:
            'Rekening ini sedang dalam proses review oleh analis karena adanya laporan mencurigakan.',
        });
      } else if (data.status === 'safe' || data.status === 'duplicate') {
        setResult({
          status: 'safe',
          name: 'HASIL REVIEW: AMAN/DUPLIKAT',
          bank: 'BANK',
          reports: 0,
          trustScore: 90,
          message: 'Rekening ini telah direview dan dianggap aman (atau duplikat).',
        });
      } else {
        setResult({
          status: 'unknown',
          name: 'TIDAK DIKETAHUI',
          bank: 'UNKNOWN',
          reports: 0,
          trustScore: 50,
          message: 'Rekening ini belum ada dalam database OSINT AI kami. Tetap waspada.',
        });
      }
    } catch (error) {
      console.error('Account check error:', error);
      setResult({
        status: 'unknown',
        name: 'GAGAL',
        bank: 'UNKNOWN',
        reports: 0,
        trustScore: 0,
        message: 'Gagal terhubung ke server untuk mengecek rekening.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section
      id="cek-rekening"
      className="relative overflow-hidden border-y border-white/5 bg-slate-900 py-24"
    >
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="container relative z-10 mx-auto px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportLoop}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400">
            <Search className="h-4 w-4" /> Demo Pendukung: Cek Blacklist Rekening
          </div>
          <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
            Cek Rekening Sebelum Transaksi
          </h2>
        </motion.div>

        <motion.div
          variants={revealSoft}
          initial="hidden"
          whileInView="visible"
          viewport={viewportLoop}
          className="mx-auto max-w-4xl"
        >
          <form
            onSubmit={handleSearch}
            className="relative mx-auto mb-8 flex max-w-2xl items-center"
          >
            <div className="absolute left-4 text-slate-500">
              <Wallet className="h-6 w-6" />
            </div>
            <input
              type="text"
              placeholder="Cek rekening (Coba: 9988776655 atau 1234567890)..."
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
              className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800 px-12 py-4 text-lg text-white transition-colors focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching || !accountNumber}
              className="absolute right-2 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-500 disabled:bg-slate-700"
            >
              {isSearching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Cek AI
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Cek AI
                </>
              )}
            </button>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mx-auto mb-12 max-w-2xl rounded-2xl border-2 p-6 ${
                result.status === 'safe'
                  ? 'border-emerald-500/30 bg-emerald-900/20'
                  : result.status === 'danger'
                    ? 'border-red-500/30 bg-red-900/20'
                    : 'border-slate-700 bg-slate-800'
              }`}
            >
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <h3 className="mb-1 text-2xl font-bold text-white uppercase">{result.name}</h3>
                  <p className="font-mono text-slate-400">
                    {result.bank} - {accountNumber}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${
                    result.status === 'safe'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : result.status === 'danger'
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-slate-600 bg-slate-700 text-slate-300'
                  }`}
                >
                  {result.status === 'safe' && <ShieldCheck className="h-5 w-5" />}
                  {result.status === 'danger' && <AlertTriangle className="h-5 w-5" />}
                  {result.status === 'unknown' && <Search className="h-5 w-5" />}
                  <span className="text-lg font-bold">Trust Score: {result.trustScore}%</span>
                </div>
              </div>
              <div className="mt-6 flex items-start gap-4 border-t border-white/10 pt-6">
                <div
                  className={`flex-shrink-0 rounded-full p-3 ${
                    result.status === 'safe'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : result.status === 'danger'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {result.reports > 0 ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p
                    className={`mb-1 font-semibold ${
                      result.status === 'safe'
                        ? 'text-emerald-400'
                        : result.status === 'danger'
                          ? 'text-red-400'
                          : 'text-slate-300'
                    }`}
                  >
                    {result.reports > 0
                      ? `${result.reports} Laporan Penipuan Terdeteksi AI!`
                      : 'Status: Aman & Terverifikasi'}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-400">{result.message}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-3 border-b border-white/5 bg-slate-800/80 px-6 py-4">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <h3 className="flex items-center gap-2 font-semibold text-white">
                Demo OSINT Feed
                <span className="text-sm font-normal text-slate-500">
                  (Data simulasi untuk prototype)
                </span>
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {scrapedScammers.map((scammer) => (
                <div
                  key={scammer.id}
                  className="flex flex-col items-start gap-6 p-6 transition-colors hover:bg-slate-800/50 md:flex-row"
                >
                  <div className="flex min-w-[200px] flex-col gap-1">
                    <span className="font-mono text-lg font-bold text-red-400">{scammer.acc}</span>
                    <span className="text-sm text-slate-400">
                      {scammer.bank} • {scammer.name}
                    </span>
                  </div>
                  <div className="relative flex-1 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="absolute top-4 right-4">{scammer.icon}</div>
                    <p className="mb-3 text-sm italic text-slate-300">{scammer.post}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Sumber: {scammer.platform}</span>
                      <span>•</span>
                      <span>{scammer.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const RekberSimulation = () => {
  const [activeTab, setActiveTab] = useState('group');

  const groupChatMessages = [
    { type: 'system', text: 'Budi dan Dimas mulai grup REKBER iPhone 13 Pro' },
    {
      type: 'system',
      text: 'Pesan diamankan dengan enkripsi end-to-end oleh AI.',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: '/rekber',
    },
    {
      sender: 'TriGuard Bot',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TriGuard&backgroundColor=10b981',
      text: 'Halo, siap bantu. Isi detail transaksi berikut dulu ya:\n\nBarang:\nHarga Sepakat:\nPembeli:\nPenjual:',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Barang: iPhone 13 Pro 256GB Second\nHarga Sepakat: 2.000.000\nPembeli: Budi\nPenjual: Dimas',
    },
    {
      sender: 'System AI',
      role: 'ai_action',
      text: 'Menghitung Biaya Layanan & Menyiapkan Virtual Account...',
    },
    {
      sender: 'TriGuard Bot',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TriGuard&backgroundColor=10b981',
      text: 'Rincian transaksi\n\nHarga Barang: Rp 2.000.000\nBiaya Admin AI (Flat): Rp 100.000\nTotal ditransfer: Rp 2.100.000\n\nBudi bisa transfer Rp 2.100.000 ke rekening escrow kami:\nBCA: 1122334455 (TriGuard AI)',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      attachment: (
        <BankReceipt
          type="in"
          title="TriGuard Mendeteksi Dana Masuk"
          amount="2.100.000"
          date="15 Mei 2026, 14:15 WIB"
          bank="BCA Budi Santoso"
          account="8877665544"
          name="TRIGUARD AI ESCROW"
        />
      ),
      text: 'Udah ya min, ke BCA.',
    },
    {
      sender: 'System AI',
      role: 'ai_action',
      text: 'Verifikasi bank selesai. Dana Rp 2.100.000 aman di escrow.',
    },
    {
      sender: 'TriGuard Bot',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TriGuard&backgroundColor=10b981',
      text: 'Dana sudah diamankan. Dimas, silakan kirim barang lewat kurir dan kirim nomor resi di grup supaya aku bisa lacak.',
    },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'Oke siap, aku antar ke J&T sekarang.',
    },
    { type: 'system', text: '... 2 Jam Kemudian ...' },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'JNT001122334455\nItu resinya ya mas',
    },
    {
      sender: 'System AI',
      role: 'ai_action',
      text: 'J&T terhubung. Lagi lacak JNT001122334455...',
    },
    { type: 'system', text: '... 2 Hari Kemudian ...' },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Barang udah sampai mas. Imei aman, fisik mulus sesuai.\n/done',
    },
    {
      sender: 'TriGuard Bot',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TriGuard&backgroundColor=10b981',
      text: 'Konfirmasi sudah masuk. Resi terdeteksi delivered dan pembeli setuju. Silakan Dimas kirim detail rekening pencairan:\n\nBank:\nNo Rekening:\nAtas Nama:',
    },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'Seabank\n9988776655\nDimas Pratama',
    },
    {
      sender: 'System AI',
      role: 'ai_action',
      text: 'Lagi cek rekening 9988776655 lewat OSINT scraper... hasilnya bersih, trust score 98%.',
    },
    {
      sender: 'TriGuard Bot',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TriGuard&backgroundColor=10b981',
      attachment: (
        <BankReceipt
          type="out"
          title="Pencairan AI ke Penjual"
          amount="2.000.000"
          date="17 Mei 2026, 10:20 WIB"
          bank="Seabank"
          account="9988776655"
          name="DIMAS PRATAMA"
        />
      ),
      text: 'Pencairan berhasil. Dana bersih Rp 2.000.000 sudah dikirim ke penjual. Terima kasih sudah pakai TriGuard.',
    },
  ];

  const privateChatMessages = [
    { type: 'system', text: 'Pesan diamankan dengan enkripsi end-to-end.' },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Mas, jual iPhone 13 Pro? Ini masih?',
    },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'Halo mas, iya masih ready. Kelengkapan fullset ori, minus pemakaian aja dikit di bezel ya.',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Imei aman kan ya ngga keblokir? Boleh liat videonya mas?',
    },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'Imei aman sentosa mas, ex inter tapi udah terdaftar bea cukai. (Mengirim Video 0:45)',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Harga netnya berapa nih mas?',
    },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'Ada yang nawar 1.8 kemaren ngga aku lepas. Udah pas aja 2 juta mas, murah meriah.',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Oke 2jt aku gas. Tapi pakai rekber TriGuard AI ya mas biar sama-sama aman dan ngga ada transaksi segitiga.',
    },
    {
      sender: 'Dimas (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf',
      text: 'Boleh mas, bebas. Biar enak juga. Ongkir sama admin rekbernya mas yang tanggung ya?',
    },
    {
      sender: 'Budi (Pembeli)',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=b6e3f4',
      text: 'Sip aman mas. Aku buatin grup bot rekbernya ya sekarang.',
    },
  ];

  const currentMessages = activeTab === 'group' ? groupChatMessages : privateChatMessages;

  return (
    <section id="demo" className="relative bg-slate-950 py-24">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <motion.div
            variants={revealSoft}
            initial="hidden"
            whileInView="visible"
            viewport={viewportLoop}
            className="order-2 w-full lg:order-1 lg:w-1/2"
          >
            <div className="relative z-10 mx-auto mb-6 flex w-fit flex-wrap justify-center gap-2 rounded-xl border border-white/5 bg-slate-800/80 p-1.5 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('private')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'private'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <User className="h-4 w-4" /> 1. Negosiasi Awal
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'group'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Bot className="h-4 w-4" /> 2. Demo Utama /rekber
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'tracking'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Truck className="h-4 w-4" /> 3. Demo Pendukung: Cek Resi
              </button>
            </div>

            <div className="relative mx-auto max-w-md rounded-[3rem] border-4 border-slate-700 bg-slate-800 p-3 shadow-2xl">
              <div className="absolute top-3 left-1/2 z-20 h-7 w-32 -translate-x-1/2 rounded-b-3xl bg-slate-950" />

              <div className="relative flex h-[750px] flex-col overflow-hidden rounded-[2.5rem] bg-[#0f172a] transition-colors">
                {activeTab === 'tracking' ? (
                  <>
                    <div className="z-10 flex items-center gap-3 border-b border-white/10 bg-slate-900 px-6 pt-12 pb-4 shadow-sm">
                      <button
                        onClick={() => setActiveTab('group')}
                        className="text-slate-400 hover:text-white"
                      >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </button>
                      <h3 className="text-sm font-bold text-white">
                        Demo Pendukung: Pelacakan Resi
                      </h3>
                    </div>
                    <TrackingView />
                  </>
                ) : (
                  <>
                    <div className="z-10 flex items-center gap-4 border-b border-white/10 bg-slate-900 px-6 pt-12 pb-4 shadow-sm">
                      {activeTab === 'group' ? (
                        <>
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-400 bg-emerald-500">
                            <img
                              src="https://api.dicebear.com/7.x/bottts/svg?seed=TriGuard&backgroundColor=10b981"
                              alt="Bot"
                              className="h-full w-full"
                            />
                          </div>
                          <div>
                            <h3 className="w-48 truncate text-sm font-bold text-white">
                              Demo Utama /rekber
                            </h3>
                            <p className="flex items-center gap-1 text-xs text-emerald-400">
                              <Bot className="h-3 w-3" /> TriGuard Bot (AI) Aktif
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-500 bg-slate-700">
                            <img
                              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dimas&backgroundColor=ffdfbf"
                              alt="Dimas"
                              className="h-full w-full"
                            />
                          </div>
                          <div>
                            <h3 className="w-48 truncate text-sm font-bold text-white">
                              Dimas (Penjual)
                            </h3>
                            <p className="flex items-center gap-1 text-xs text-slate-400">Online</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto bg-[#0B1120] p-4 pb-20">
                      {currentMessages.map((msg, idx) => {
                        if (msg.type === 'system') {
                          return (
                            <div key={idx} className="my-2 flex justify-center">
                              <span className="max-w-[85%] rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-center text-[10px] leading-relaxed text-slate-400">
                                {msg.text}
                              </span>
                            </div>
                          );
                        }

                        if (msg.role === 'ai_action') {
                          return (
                            <motion.div
                              variants={revealSoft}
                              initial="hidden"
                              whileInView="visible"
                              viewport={viewportLoop}
                              key={idx}
                              className="my-4 flex justify-center"
                            >
                              <div className="flex max-w-[90%] items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-900/30 px-4 py-2.5 text-[11px] leading-tight text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                                <Brain className="h-4 w-4 flex-shrink-0 animate-pulse text-blue-400" />
                                <span className="font-medium">{msg.text}</span>
                              </div>
                            </motion.div>
                          );
                        }

                        const isAdmin = msg.role === 'admin';
                        const isBuyer = msg.role === 'buyer';

                        return (
                          <motion.div
                            variants={revealSoft}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ ...viewportLoop, margin: '-50px' }}
                            key={idx}
                            className={`flex w-full gap-3 ${
                              isBuyer ? 'flex-row-reverse' : 'flex-row'
                            }`}
                          >
                            {msg.avatar && (
                              <div className="mt-auto mb-1 flex-shrink-0">
                                <img
                                  src={msg.avatar}
                                  alt={msg.sender}
                                  className={`h-8 w-8 rounded-full border ${
                                    isAdmin
                                      ? 'border-emerald-500 bg-emerald-900/50'
                                      : 'border-slate-600 bg-slate-800'
                                  }`}
                                />
                              </div>
                            )}
                            <div
                              className={`flex max-w-[80%] flex-col ${
                                isBuyer ? 'items-end' : 'items-start'
                              }`}
                            >
                              <span
                                className={`mb-1 px-1 text-[10px] ${
                                  isAdmin ? 'font-bold text-emerald-400' : 'text-slate-500'
                                }`}
                              >
                                {msg.sender}
                              </span>
                              <div
                                className={`rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                  isBuyer
                                    ? 'rounded-br-sm bg-blue-600 text-white'
                                    : isAdmin
                                      ? 'rounded-bl-sm border border-emerald-500/30 bg-emerald-900/40 text-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                      : 'rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200'
                                }`}
                              >
                                {msg.attachment && (
                                  <div className="group relative mb-2">{msg.attachment}</div>
                                )}
                                {msg.text}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="absolute bottom-0 w-full border-t border-white/10 bg-slate-900 p-4">
                      <div className="flex items-center gap-3 rounded-full bg-slate-800 px-4 py-3">
                        <MessageSquare className="h-5 w-5 text-slate-500" />
                        <span className="text-sm text-slate-500">
                          {activeTab === 'group'
                            ? 'Ketik perintah seperti /rekber...'
                            : 'Ketik pesan balasan...'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={revealUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportLoop}
            className="order-1 lg:order-2 lg:w-1/2"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
              <MessageSquare className="h-4 w-4" /> Demo Utama: /rekber
            </div>
            <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
              Alur Utama Transaksi: Dari /rekber Sampai Dana Cair
            </h2>
            <p className="mb-8 leading-relaxed text-slate-400">
              Demo ini memperlihatkan alur utama TriGuard AI: mulai dari perintah
              <strong> /rekber</strong>, lanjut ke pembayaran escrow, lalu diteruskan ke demo
              pendukung untuk cek resi dan blacklist rekening.
            </p>

            <div className="space-y-6">
              <div
                className="cursor-pointer rounded-xl border border-white/5 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                onClick={() => setActiveTab('private')}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-500/20 p-3 text-blue-400">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">1. Negosiasi Alami</h4>
                    <p className="text-sm text-slate-400">
                      Demo pendukung untuk lihat obrolan awal sebelum rekber dimulai.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="cursor-pointer rounded-xl border border-white/5 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                onClick={() => setActiveTab('group')}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-emerald-500/20 p-3 text-emerald-400">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">2. Demo Utama: /rekber</h4>
                    <p className="text-sm text-slate-400">
                      AI Escrow merespons command, menjumlahkan harga + admin, lalu menampilkan
                      rincian transaksi secara rapi.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="cursor-pointer rounded-xl border border-white/5 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                onClick={() => setActiveTab('tracking')}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-orange-500/20 p-3 text-orange-400">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">3. Demo Pendukung: Cek Resi</h4>
                    <p className="text-sm text-slate-400">
                      AI membaca API kurir untuk memastikan resi valid dan paket benar-benar
                      bergerak.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const [isProtected, setIsProtected] = useState(true);

  return (
    <section id="cara-kerja" className="relative bg-slate-900 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-20 h-72 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_65%)]" />
      <div className="container mx-auto px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportLoop}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300">
            <ShieldCheck className="h-4 w-4" /> Alur Proteksi TriGuard AI
          </div>
          <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
            Mencegah Transaksi Segitiga dari Akar
          </h2>
          <p className="leading-relaxed text-slate-400 md:text-lg">
            Dana, identitas, dan pengiriman divalidasi dalam satu alur yang rapi. TriGuard AI
            bertindak sebagai penengah digital agar pembeli dan penjual sama-sama aman dari awal
            transaksi sampai dana cair.
          </p>
        </motion.div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="absolute left-1/2 top-12 hidden h-[calc(100%-6rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-blue-400/80 via-50% to-transparent md:block" />
          <div className="absolute left-1/2 top-12 hidden h-[calc(100%-6rem)] w-24 -translate-x-1/2 bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)] blur-2xl md:block" />

          <div className="space-y-8 md:space-y-10">
            {steps.map((step, idx) => (
              <motion.div
                key={step.title}
                variants={revealSoft}
                initial="hidden"
                whileInView="visible"
                viewport={viewportLoop}
                transition={{ delay: idx * 0.08 }}
                className="relative"
              >
                {idx < steps.length - 1 && (
                  <div className="absolute left-1/2 top-full hidden h-10 w-px -translate-x-1/2 bg-gradient-to-b from-cyan-300/70 to-transparent md:block" />
                )}

                <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-10">
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_45%)]" />
                  <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-blue-400/40 bg-gradient-to-br from-blue-500/20 via-slate-900 to-cyan-400/15 text-lg font-bold text-white shadow-[0_0_30px_rgba(56,189,248,0.22)]">
                    0{idx + 1}
                  </div>
                  <h3 className="relative mb-3 text-2xl font-bold text-white">{step.title}</h3>
                  <p className="relative mx-auto max-w-xl text-base leading-relaxed text-slate-300">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <motion.div
            variants={revealUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportLoop}
            className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 backdrop-blur-sm"
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-blue-300">
              Simulasi Proteksi
            </p>
            <h3 className="mb-4 text-3xl font-bold text-white">
              Semua lapisan keamanan tampil langsung di aplikasi
            </h3>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                  <Brain className="h-5 w-5" />
                </div>
                <h4 className="mb-2 font-semibold text-white">Escrow Aktif</h4>
                <p className="text-sm leading-relaxed text-slate-300">
                  Dana dibekukan sampai sistem mendeteksi syarat transaksi terpenuhi.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                  <Search className="h-5 w-5" />
                </div>
                <h4 className="mb-2 font-semibold text-white">OSINT Check</h4>
                <p className="text-sm leading-relaxed text-slate-300">
                  Rekening dan identitas penerima dicek dulu sebelum pencairan terjadi.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300">
                  <Truck className="h-5 w-5" />
                </div>
                <h4 className="mb-2 font-semibold text-white">Tracking Live</h4>
                <p className="text-sm leading-relaxed text-slate-300">
                  Resi kurir dipantau terus sampai paket benar-benar diterima pembeli.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={revealSoft}
            initial="hidden"
            whileInView="visible"
            viewport={viewportLoop}
            className="flex justify-center w-full"
          >
            <div className="group relative flex h-[600px] w-[300px] sm:h-[660px] sm:w-[320px] flex-col overflow-hidden rounded-[3rem] border-[6px] border-slate-800 bg-slate-950 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
              <div className="pointer-events-none absolute inset-0 z-30 rounded-[2.5rem] border border-white/10" />
              <div className="absolute top-0 left-1/2 z-40 h-7 w-32 -translate-x-1/2 rounded-b-3xl border-x border-b border-white/5 bg-slate-950" />

              <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0B1120] font-sans">
                <div className="pointer-events-none absolute top-[-10%] left-[-20%] h-64 w-64 bg-blue-600/30 blur-[80px]" />
                <div className="pointer-events-none absolute right-[-20%] bottom-[-10%] h-64 w-64 bg-purple-600/30 blur-[80px]" />

                <div className="z-10 flex h-12 w-full items-end justify-between px-6 pb-2 text-[11px] font-medium text-slate-300">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5">
                    <Signal className="h-3 w-3" />
                    <Wifi className="h-3 w-3" />
                    <Battery className="h-4 w-4 text-white" />
                  </div>
                </div>

                <div className="z-10 flex items-center gap-4 px-5 py-3">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold tracking-wide text-white">TriGuard Security</h3>
                </div>

                <div className="custom-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto p-5 pb-6">
                  <div className="relative flex flex-col items-center justify-center py-2">
                    <div className="relative mb-2 h-24 w-24 [perspective:1000px]">
                      <motion.div
                        animate={
                          isProtected ? { rotateY: 360, rotateX: 360 } : { rotateY: 0, rotateX: 0 }
                        }
                        transition={
                          isProtected
                            ? { duration: 15, repeat: Infinity, ease: 'linear' }
                            : { duration: 0.5 }
                        }
                        className="relative h-full w-full [transform-style:preserve-3d]"
                      >
                        <div
                          className={`absolute inset-0 rounded-full border-[3px] [transform:rotateX(0deg)] transition-colors duration-500 ${
                            isProtected ? 'border-blue-500/60' : 'border-slate-700'
                          }`}
                        />
                        <div
                          className={`absolute inset-0 rounded-full border-[3px] [transform:rotateX(60deg)] transition-colors duration-500 ${
                            isProtected ? 'border-purple-500/60' : 'border-slate-700'
                          }`}
                        />
                        <div
                          className={`absolute inset-0 rounded-full border-[3px] [transform:rotateX(120deg)] transition-colors duration-500 ${
                            isProtected ? 'border-cyan-500/60' : 'border-slate-700'
                          }`}
                        />
                        <div className="absolute inset-0 m-3 flex items-center justify-center rounded-full border border-white/10 bg-slate-900/50 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                          {isProtected ? (
                            <ShieldCheck className="h-6 w-6 text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                          ) : (
                            <Lock className="h-6 w-6 text-slate-500" />
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-500 ${
                      isProtected
                        ? 'border-blue-500/50 bg-blue-900/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <AnimatePresence>
                      {isProtected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"
                        />
                      )}
                    </AnimatePresence>

                    <div className="relative z-10">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-xl border p-2 transition-colors ${
                              isProtected
                                ? 'border-blue-400 bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                : 'border-slate-700 bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Brain className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm leading-tight font-bold text-white">
                              AI Escrow Vault
                            </p>
                            <div className="mt-0.5 flex items-center gap-1">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isProtected ? 'animate-pulse bg-blue-400' : 'bg-slate-600'
                                }`}
                              />
                              <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">
                                1. Core System
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setIsProtected(!isProtected)}
                          className={`flex h-6 w-11 cursor-pointer items-center rounded-full border p-1 shadow-inner transition-all duration-300 ${
                            isProtected
                              ? 'justify-end border-blue-500 bg-blue-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                              : 'justify-start border-slate-700 bg-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
                          }`}
                        >
                          <motion.div
                            layout
                            className={`h-4 w-4 rounded-full shadow-md ${
                              isProtected
                                ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                                : 'bg-slate-400'
                            }`}
                          />
                        </button>
                      </div>
                      <p
                        className={`text-[10px] leading-relaxed transition-colors duration-300 ${
                          isProtected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        Sistem Rekening Bersama berbasis AI menahan dana sampai status transaksi dan
                        logistik benar-benar valid.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
                      isProtected
                        ? 'border-emerald-500/50 bg-emerald-900/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                        : 'border-white/10 bg-white/5 opacity-50 grayscale'
                    }`}
                  >
                    <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400 bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <Search className="h-4 w-4" />
                    </div>
                    <div className="z-10">
                      <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                        Verifikasi Identitas AI
                      </p>
                      <p className="text-sm font-bold text-white">2. Cek Real-Time</p>
                      <p className="mt-0.5 text-xs text-emerald-100">
                        Sistem mencocokkan identitas pengirim dan memindai riwayat penipuan sebelum
                        dana diteruskan.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
                      isProtected
                        ? 'border-purple-500/50 bg-purple-900/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                        : 'border-white/10 bg-white/5 opacity-50 grayscale'
                    }`}
                  >
                    <div className="relative z-10 mb-2 flex items-center gap-3">
                      <div
                        className={`rounded-lg border p-1.5 ${
                          isProtected
                            ? 'border-purple-400 bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            : 'border-slate-700 bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight text-white">
                          Lacak Resi Otomatis
                        </p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-widest text-slate-400">
                          3. Pantau Ekspedisi
                        </p>
                      </div>
                    </div>
                    <p
                      className={`relative z-10 text-[10px] leading-relaxed ${
                        isProtected ? 'text-purple-100' : 'text-slate-500'
                      }`}
                    >
                      AI memantau pergerakan fisik barang sampai status delivered terkonfirmasi oleh
                      sistem dan pembeli.
                    </p>
                    {isProtected && (
                      <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                        <Truck className="h-16 w-16 text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10 bg-gradient-to-t from-[#0B1120] via-[#0B1120] to-transparent p-5 pb-8">
                  <button
                    onClick={() => setIsProtected(!isProtected)}
                    className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border py-4 text-sm font-bold transition-all duration-300 ${
                      isProtected
                        ? 'border-blue-400/50 bg-blue-600/80 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {isProtected && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
                    )}

                    {isProtected ? (
                      <ShieldCheck className="relative z-10 h-4 w-4" />
                    ) : (
                      <Lock className="relative z-10 h-4 w-4" />
                    )}
                    <span className="relative z-10 tracking-wide">
                      {isProtected ? 'Sistem Proteksi Aktif' : 'Aktifkan Proteksi AI'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <OrbitLogo />
          <span className="text-xl font-bold tracking-tight text-white">
            TriGuard<span className="text-blue-500">AI</span>
          </span>
        </div>

        <button
          className="text-slate-300 hover:text-white md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#solusi" className="transition-colors hover:text-white">
            Solusi AI
          </a>
          <a href="#cara-kerja" className="transition-colors hover:text-white">
            Cara Kerja
          </a>
          <a href="#cek-rekening" className="transition-colors hover:text-white">
            Cek Blacklist
          </a>
          <a href="#lapor" className="transition-colors hover:text-white">
            Lapor Penipu
          </a>
          <a href="#demo" className="transition-colors hover:text-white">
            Simulasi Chat
          </a>
          <a href="/admin/login" className="flex items-center gap-1.5 transition-colors text-blue-400 hover:text-blue-300 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Admin
          </a>
        </nav>
      </div>

      {isMenuOpen && (
        <nav className="border-t border-white/10 bg-slate-900/95 p-4 text-sm font-medium text-slate-300 md:hidden">
          <ul className="flex flex-col gap-4">
            <li>
              <a
                href="#solusi"
                onClick={() => setIsMenuOpen(false)}
                className="block transition-colors hover:text-white"
              >
                Solusi AI
              </a>
            </li>
            <li>
              <a
                href="#cara-kerja"
                onClick={() => setIsMenuOpen(false)}
                className="block transition-colors hover:text-white"
              >
                Cara Kerja
              </a>
            </li>
            <li>
              <a
                href="#cek-rekening"
                onClick={() => setIsMenuOpen(false)}
                className="block transition-colors hover:text-white"
              >
                Cek Blacklist
              </a>
            </li>
            <li>
              <a
                href="#lapor"
                onClick={() => setIsMenuOpen(false)}
                className="block transition-colors hover:text-white"
              >
                Lapor Penipu
              </a>
            </li>
            <li>
              <a
                href="#demo"
                onClick={() => setIsMenuOpen(false)}
                className="block transition-colors hover:text-white"
              >
                Simulasi Chat
              </a>
            </li>
            <li>
              <a
                href="/admin/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 transition-colors text-blue-400 hover:text-blue-300 font-semibold"
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[100px]" />

      <div className="container relative z-10 mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-300"
          >
            <Bot className="h-4 w-4 text-blue-400" /> API Rekber Otomatis Pertama di Indonesia
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 max-w-4xl text-5xl font-bold tracking-tight text-white md:text-7xl"
          >
            Akhiri Penipuan Online dengan{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AI Escrow
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl"
          >
            Sistem Rekening Bersama (Rekber) berbasis AI yang menahan dana transaksi di brankas
            digital secara otomatis sampai barang (HP, dsb) tiba dengan selamat di tangan pembeli
            via Lacak Resi.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <a
              href="#demo"
              className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 font-semibold text-white transition-all hover:bg-blue-500"
            >
              Lihat Simulasi Transaksi <ChevronRight className="h-5 w-5" />
            </a>
            <a
              href="#cara-kerja"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-8 py-4 font-semibold text-white transition-all hover:bg-slate-700"
            >
              Pelajari Cara Kerja <ChevronRight className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="relative mt-20 flex aspect-video w-full max-w-3xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-[0_0_50px_rgba(37,99,235,0.2)]"
          >
            <div className="relative h-48 w-48 [perspective:1000px]">
              <motion.div
                animate={{ rotateY: 360, rotateX: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="relative h-full w-full [transform-style:preserve-3d]"
              >
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/50 [transform:rotateX(0deg)]" />
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/50 [transform:rotateX(60deg)]" />
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/50 [transform:rotateX(120deg)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="h-16 w-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                </div>
              </motion.div>
            </div>

            <div className="absolute bottom-6 left-6 rounded-2xl border border-white/5 bg-slate-950/80 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-300">
                  AI Mutasi & Lacak Resi Active
                </span>
              </div>
            </div>
            <div className="absolute top-6 right-6 rounded-2xl border border-white/5 bg-slate-950/80 p-4 backdrop-blur-sm">
              <span className="mb-1 block text-xs text-slate-400">Dana Ditahan Aman</span>
              <span className="text-xl font-bold text-white">Rp 2.4M+</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Solutions = () => {
  const features = [
    {
      icon: <Lock className="h-6 w-6 text-blue-400" />,
      title: 'Smart Escrow',
      desc: 'Dana ditahan secara aman di brankas digital sampai pembeli menerima dan mengonfirmasi barang pesanannya.',
    },
    {
      icon: <Fingerprint className="h-6 w-6 text-emerald-400" />,
      title: 'Verifikasi Identitas AI',
      desc: 'Sistem mencocokkan identitas pengirim dan memindai riwayat penipuan (OSINT) untuk memastikan keamanan total.',
    },
    {
      icon: <Package className="h-6 w-6 text-purple-400" />,
      title: 'Lacak Resi Otomatis',
      desc: 'AI terkoneksi dengan API Kurir (J&T, JNE, dll) untuk mendeteksi nomor resi dan memantau pergerakan fisik barang.',
    },
  ];

  return (
    <section id="solusi" className="bg-slate-950 py-24">
      <div className="container mx-auto px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportLoop}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Solusi Menyeluruh TriGuard AI
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Kami menggabungkan perlindungan perbankan dengan kecepatan bot otomasi untuk
            memfasilitasi transaksi C2C (Konsumen ke Konsumen).
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feat, idx) => (
            <motion.div
              key={feat.title}
              variants={revealSoft}
              initial="hidden"
              whileInView="visible"
              viewport={viewportLoop}
              transition={{ delay: idx * 0.1 }}
              className="rounded-3xl border border-white/5 bg-slate-900 p-8 transition-colors hover:bg-slate-800"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                {feat.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{feat.title}</h3>
              <p className="leading-relaxed text-slate-400">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-slate-950 py-12">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <OrbitLogo />
          <span className="text-xl font-bold tracking-tight text-white">
            TriGuard<span className="text-blue-500">AI</span>
          </span>
        </div>
        <p className="text-sm text-slate-500">© 2026 TriGuard AI. Prototype for Hackathon.</p>
        <div className="flex gap-4 text-sm text-slate-400">
          <a href="#cara-kerja" className="hover:text-white">
            Cara Kerja
          </a>
          <a href="#demo" className="hover:text-white">
            Simulasi
          </a>
        </div>
      </div>
    </footer>
  );
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Halo, aku asisten TriGuard. Kalau kamu mau, aku bisa jelasin cara bot Rekber membaca resi, cek mutasi, atau mulai lewat /rekber.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    // Auto-grow input until max height, then keep internal scroll.
    el.style.height = 'auto';
    const maxHeight = 128;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input, isOpen]);

  const handleSend = async (event) => {
    event?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const intent = classifyIntent(userText);

      if (intent !== 'unknown') {
        // Known intents are handled locally via fallback logic for now
        await new Promise((r) => setTimeout(r, 300));
        setMessages((prev) => [...prev, { role: 'model', text: buildFallbackReply(userText) }]);
        return;
      }

      const modelReply = await sendMessage(userText, messages);
      setMessages((prev) => [...prev, { role: 'model', text: modelReply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: buildFallbackReply(userText) }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-opacity ${
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Bot className="h-6 w-6" />
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed right-4 bottom-4 z-50 flex h-[500px] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:right-6 sm:bottom-6 sm:max-w-[350px]"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Tanya Cepat TriGuard</h3>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] text-blue-100">Quick Support</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-950 p-4">
              {messages.map((msg, idx) => {
                return (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl whitespace-pre-wrap break-words p-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-br-sm bg-blue-600 text-white'
                          : 'rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSend}
              className="flex gap-2 border-t border-slate-800 bg-slate-900 p-3"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tanya cepat /rekber, resi, mutasi."
                rows={1}
                className="custom-scrollbar max-h-32 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function App() {
  const isAdminOsintPage =
    typeof window !== 'undefined' && window.location.pathname === '/admin/osint-candidates';
  const isAdminLoginPage =
    typeof window !== 'undefined' && window.location.pathname === '/admin/login';

  if (isAdminLoginPage) {
    return <AdminLogin />;
  }

  if (isAdminOsintPage) {
    return <AdminOsintCandidates />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      <Header />
      <main>
        <Hero />
        <Solutions />
        <HowItWorks />
        <AccountChecker />
        <ReportCenter />
        <RekberSimulation />
      </main>
      <Footer />
      <AIChatbot />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.8); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 1); }
        html { scroll-behavior: smooth; }
      `,
        }}
      />
    </div>
  );
}
