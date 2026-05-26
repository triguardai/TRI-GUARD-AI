import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  Filter,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldX,
  User,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Link as LinkIcon,
  Bot
} from 'lucide-react';
import {
  fetchOsintCandidates,
  moderateCandidate,
  runOsintHarvest,
} from '../services/adminOsintService';
import { getStoredReports } from '../services/reportService';

const ADMIN_TOKEN_KEY = 'triguard.adminOsintToken';

const statusOptions = [
  { value: 'all', label: 'Semua status' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'verified_risky', label: 'Verified risky' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'disputed', label: 'Disputed' },
];

const statusClass = {
  candidate: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  pending_review: 'border-blue-300/30 bg-blue-300/10 text-blue-100',
  verified_risky: 'border-red-300/30 bg-red-300/10 text-red-100',
  rejected: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
  duplicate: 'border-purple-300/30 bg-purple-300/10 text-purple-100',
  disputed: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const mockUserReports = [
  {
    id: 'rep-001',
    status: 'pending_review',
    reporter_name: 'Budi Santoso',
    reporter_contact: 'budi.santoso@gmail.com',
    bank_name: 'BCA',
    account_number: '1234567890',
    account_holder: 'PENIPU GADUNGAN',
    platform: 'Facebook / X (Twitter)',
    modus: 'Transaksi Segitiga',
    dork_query: 'site:facebook.com OR site:x.com "1234567890" OR "PENIPU GADUNGAN" "penipu" OR "scam"',
    evidence_images: [
      'https://placehold.co/600x400/1e293b/94a3b8?text=Bukti+Transfer',
      'https://placehold.co/600x400/1e293b/94a3b8?text=Screenshot+Chat'
    ],
    public_url: 'https://facebook.com/groups/korbanpenipuan/posts/101010101',
    url_analysis: 'Valid public group. Postingan memiliki 50+ interaksi yang mengonfirmasi bahwa rekening ini terafiliasi dengan jaringan transaksi segitiga.',
    chronology: 'Saya niat beli laptop di FB. Pelaku berpura-pura menjadi penjual dan pembeli sekaligus (transaksi segitiga). Saya ditipu untuk transfer ke BCA 1234567890 atas nama PENIPU GADUNGAN. Setelah transfer, kontak saya langsung diblokir dan penjual asli tidak menerima uangnya.',
    agreed: true,
    created_at: new Date().toISOString()
  }
];

const CandidateEvidence = ({ evidence }) => {
  if (!evidence?.length) {
    return <p className="text-sm text-slate-500">Belum ada evidence tersimpan.</p>;
  }

  return (
    <div className="space-y-3">
      {evidence.map((item) => {
        const detectedContext = item.detected_accounts?.[0]?.context;

        return (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-white">
                  {item.title || 'Tanpa judul'}
                </p>
                <p className="mt-1 text-xs text-cyan-200/70">{item.source_host}</p>
              </div>
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-cyan-300 hover:text-white"
                aria-label="Buka evidence"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            {item.snippet && (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.snippet}</p>
            )}
            {detectedContext && (
              <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-300">
                {detectedContext}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CandidateCard = ({ candidate, onModerate, busyAction }) => {
  const status = candidate.status || 'candidate';
  const isBusy = Boolean(busyAction);

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                statusClass[status] || statusClass.candidate
              }`}
            >
              {status.replaceAll('_', ' ')}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-slate-300">
              Risk {candidate.risk_score || 0}%
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-slate-300">
              {candidate.source_count || 0} sumber
            </span>
          </div>

          <h2 className="font-mono text-2xl font-bold text-white">
            {candidate.bank_name || 'UNKNOWN'} {candidate.account_number}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {candidate.account_holder || 'Nama pemilik belum terdeteksi'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Terakhir terlihat: {formatDate(candidate.last_seen_at)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => onModerate(candidate.id, 'verify')}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busyAction === 'verify' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Verify
          </button>
          <button
            type="button"
            onClick={() => onModerate(candidate.id, 'reject')}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
          >
            {busyAction === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldX className="h-4 w-4" />
            )}
            Reject
          </button>
          <button
            type="button"
            onClick={() => onModerate(candidate.id, 'duplicate')}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-300/30 px-3 py-2 text-xs font-bold text-purple-100 transition hover:border-purple-200 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            {busyAction === 'duplicate' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Duplicate
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-white/5 pt-5">
        <CandidateEvidence evidence={candidate.evidence} />
      </div>
    </article>
  );
};

const UserReportCard = ({ report, onModerate, busyAction }) => {
  const isBusy = Boolean(busyAction);

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-white/5 pb-5 mb-5">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-300">
              User Report
            </span>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100">
              Pending Review
            </span>
          </div>

          <h2 className="font-mono text-2xl font-bold text-white">
            {report.bank_name} {report.account_number}
          </h2>
          <p className="mt-1 text-sm text-slate-300 font-semibold">
            {report.account_holder}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Dilaporkan pada: {formatDate(report.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => onModerate(report.id, 'verify')}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busyAction === 'verify' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve & Blacklist
          </button>
          <button
            type="button"
            onClick={() => onModerate(report.id, 'reject')}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
          >
            {busyAction === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldX className="h-4 w-4" />
            )}
            Reject
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
              <User className="h-4 w-4 text-cyan-400" /> Identitas Pelapor
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm text-white mb-1"><span className="text-slate-500">Nama:</span> {report.reporter_name || 'Anonim'}</p>
              <p className="text-sm text-white"><span className="text-slate-500">Kontak:</span> {report.reporter_contact || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
              <FileText className="h-4 w-4 text-cyan-400" /> Detail Kejadian
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Platform & Modus</p>
                <p className="text-sm text-white">{report.platform} • {report.modus}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Kronologi</p>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900 rounded-lg p-3 border border-slate-800 mt-1">
                  {report.chronology}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
              <Bot className="h-4 w-4 text-cyan-400" /> Scraping Otomatis OSINT
            </h3>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-xs text-blue-300/70 mb-2">Query Dork yang Dihasilkan AI:</p>
              <code className="block text-xs text-blue-200 bg-slate-950 p-2 rounded border border-blue-500/20 mb-3">
                {report.dork_query}
              </code>
              <p className="text-xs text-slate-500 mb-1">Analisis Bukti Publik (URL):</p>
              <a href={report.public_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mb-2">
                <LinkIcon className="h-3 w-3" /> {report.public_url}
              </a>
              <p className="text-sm text-slate-300 leading-relaxed">
                {report.url_analysis}
              </p>
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
              <ImageIcon className="h-4 w-4 text-cyan-400" /> Bukti Foto Terlampir
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {report.evidence_images.map((img, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video">
                  <img src={img} alt={`Bukti ${idx + 1}`} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-5 w-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {report.agreed && (
        <div className="mt-5 border-t border-white/5 pt-4 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Pelapor setuju dengan syarat dan ketentuan review keamanan.
          </p>
        </div>
      )}
    </article>
  );
};

const AdminOsintCandidates = () => {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'osint'
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [seed, setSeed] = useState('');
  const [status, setStatus] = useState('candidate');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [busyModeration, setBusyModeration] = useState({});

  const [userReports, setUserReports] = useState(() => {
    const stored = getStoredReports();
    if (stored && stored.length > 0) {
      return stored.map((r, i) => ({
        id: `rep-local-${i}`,
        status: 'pending_review',
        reporter_name: r.reporterName || 'Anonim',
        reporter_contact: r.reporterContact || '-',
        bank_name: r.bank,
        account_number: r.accountNumber,
        account_holder: r.accountHolder,
        platform: r.platform,
        modus: r.fraudType,
        dork_query: `site:${(r.platform || '').toLowerCase().replace(/\s/g, '')}.com "${r.accountNumber}"`,
        evidence_images: r.base64Images?.length > 0 
          ? r.base64Images 
          : ['https://placehold.co/600x400/1e293b/94a3b8?text=Tidak+Ada+Foto'],
        public_url: r.evidenceUrl || '#',
        url_analysis: r.scrapedEvidence?.description || 'Tidak ada analisis otomatis.',
        chronology: r.description,
        agreed: r.consent,
        created_at: new Date().toISOString()
      }));
    }
    return mockUserReports;
  });

  const totalRisky = useMemo(
    () => items.filter((item) => item.status === 'verified_risky').length,
    [items]
  );

  const saveToken = (value) => {
    setAdminToken(value);
    localStorage.setItem(ADMIN_TOKEN_KEY, value);
  };

  const loadCandidates = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await fetchOsintCandidates({ adminToken, status });
      setItems(result.items || []);
      setMessage(result.message || '');
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'osint') {
      const timeoutId = window.setTimeout(() => {
        loadCandidates();
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeTab]);

  const handleHarvest = async () => {
    setHarvesting(true);
    setError('');
    setMessage('');
    setSummary(null);

    try {
      const result = await runOsintHarvest({ adminToken, seed });
      setSummary(result.summary || null);
      setMessage(result.message || '');
      
      // Prototype Mode: If results were not saved to DB, show them immediately in the UI
      if (result.summary?.records && result.summary.saved === 0) {
        setItems(result.summary.records);
      } else {
        await loadCandidates();
      }
    } catch (harvestError) {
      setError(harvestError.message);
    } finally {
      setHarvesting(false);
    }
  };

  const handleModerateOsint = async (id, action) => {
    setBusyModeration((prev) => ({ ...prev, [id]: action }));
    setError('');

    try {
      await moderateCandidate({ adminToken, id, action });
      await loadCandidates();
    } catch (moderateError) {
      setError(moderateError.message);
    } finally {
      setBusyModeration((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleModerateReport = (id, action) => {
    setBusyModeration((prev) => ({ ...prev, [id]: action }));
    // Simulate API call for report verification
    setTimeout(() => {
      setUserReports((prev) => prev.filter(r => r.id !== id));
      setBusyModeration((prev) => ({ ...prev, [id]: undefined }));
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-950/95 pt-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <a
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
            >
              Kembali ke TriGuard AI
            </a>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
                <Database className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  Admin Verification Center
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Pusat validasi laporan pengguna dan hasil scraping OSINT.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">Laporan Baru</p>
              <p className="mt-1 text-2xl font-bold text-white">{userReports.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">Scraped Risky</p>
              <p className="mt-1 text-2xl font-bold text-red-200">{totalRisky}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">Scraped Total</p>
              <p className="mt-1 text-2xl font-bold text-amber-100">{items.length}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl px-6 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'reports' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> 
              Laporan Pengguna 
              {userReports.length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{userReports.length}</span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('osint')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'osint' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4" /> 
              Hasil Scraping OSINT
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        
        {activeTab === 'osint' && (
          <>
            <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Seed keyword</span>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={seed}
                    onChange={(event) => setSeed(event.target.value)}
                    placeholder='Contoh: "1234567890", nama rekening, atau transaksi segitiga laptop'
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Filter</span>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Admin token</span>
                <input
                  value={adminToken}
                  onChange={(event) => saveToken(event.target.value)}
                  type="password"
                  placeholder="Opsional dev"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
                />
              </label>
            </section>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleHarvest}
                disabled={harvesting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {harvesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Jalankan OSINT Search
              </button>
              <button
                type="button"
                onClick={loadCandidates}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Kandidat
              </button>
            </div>

            {summary && (
              <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span>Query: {summary.queries}</span>
                  <span>URL: {summary.urls}</span>
                  <span>Kandidat: {summary.candidates}</span>
                  <span>Tersimpan: {summary.saved}</span>
                </div>
                {summary.errors && summary.errors.length > 0 && !message.includes('Simulasi') && !message.includes('Prototipe') && (
                  <div className="mt-3 border-t border-cyan-300/10 pt-3 space-y-1">
                    <p className="text-xs font-bold text-red-300">Errors encountered:</p>
                    {summary.errors.slice(0, 3).map((err, idx) => (
                      <p key={idx} className="text-[10px] text-red-200/80 italic">
                        {err.url || err.query}: {err.message}
                      </p>
                    ))}
                  </div>
                )}
                </div>
                )}

                {message && (
                <div className={`mb-6 rounded-2xl border p-4 text-sm ${
                message.includes('Simulasi') || message.includes('Prototipe') 
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' 
                  : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
                }`}>
                {message}
                </div>
                )}

                {error && !message.includes('Simulasi') && !message.includes('Prototipe') && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
                </div>
                )}

            <section className="space-y-4">
              {loading && items.length === 0 ? (
                <div className="flex min-h-60 items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-200" />
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center">
                  <p className="text-lg font-bold text-white">Belum ada kandidat</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Jalankan OSINT Search setelah Supabase dan search provider dikonfigurasi.
                  </p>
                </div>
              ) : (
                items.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    busyAction={busyModeration[candidate.id]}
                    onModerate={handleModerateOsint}
                  />
                ))
              )}
            </section>
          </>
        )}

        {activeTab === 'reports' && (
          <section className="space-y-6">
            {userReports.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-white">Semua Laporan Telah Direview</p>
                <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                  Belum ada laporan baru dari pengguna. Terus pantau OSINT Scraper untuk menemukan potensi penipuan lainnya.
                </p>
              </div>
            ) : (
              userReports.map((report) => (
                <UserReportCard
                  key={report.id}
                  report={report}
                  busyAction={busyModeration[report.id]}
                  onModerate={handleModerateReport}
                />
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminOsintCandidates;
