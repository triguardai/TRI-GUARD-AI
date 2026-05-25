import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileImage,
  Globe2,
  Link,
  Loader2,
  ScanSearch,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import {
  buildClientUrlPreview,
  buildClientOsintPreview,
  fraudTypeOptions,
  getStoredReports,
  platformOptions,
  scrapeEvidenceUrl,
  searchOsintEvidence,
  submitReport,
} from "../services/reportService";

const initialForm = {
  reporterName: "",
  reporterContact: "",
  bank: "BCA",
  accountNumber: "",
  accountHolder: "",
  platform: "Semua platform publik",
  fraudType: "Transaksi segitiga",
  evidenceUrl: "",
  description: "",
  consent: false,
};

const revealUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const formatFileSize = (size) => {
  if (!size) return "0 KB";
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const FieldError = ({ children }) =>
  children ? <p className="mt-1 text-xs text-red-300">{children}</p> : null;

const ScrapePreview = ({ evidence }) => {
  if (!evidence) return null;

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-200">
        <ScanSearch className="h-4 w-4" />
        Hasil Scraping URL
      </div>
      <p className="text-sm font-bold text-white">{evidence.title || "Tanpa judul"}</p>
      <p className="mt-1 break-words text-xs text-cyan-100/80">
        {evidence.sourceHost || evidence.sourceUrl}
      </p>
      {evidence.description && (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{evidence.description}</p>
      )}
      {evidence.evidenceSignals?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {evidence.evidenceSignals.slice(0, 6).map((signal) => (
            <span
              key={signal}
              className="rounded-full border border-cyan-300/20 bg-slate-950/60 px-2.5 py-1 font-mono text-xs text-cyan-200"
            >
              {signal}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Engine: {evidence.scraper || "scrapling"}.
      </p>
    </div>
  );
};

const OsintResults = ({ mode, queries, results, onUseUrl }) => {
  if (!queries.length && !results.length) return null;

  return (
    <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
          <Globe2 className="h-4 w-4" />
          OSINT Dork Search
        </div>
        <span className="rounded-full border border-blue-300/20 bg-slate-950/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-200">
          {mode === "live" ? "Live API" : "Preview"}
        </span>
      </div>

      <div className="mb-4 space-y-2">
        {queries.slice(0, 3).map((query) => (
          <code
            key={query}
            className="block overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-cyan-100"
          >
            {query}
          </code>
        ))}
      </div>

      <div className="space-y-3">
        {results.slice(0, 5).map((result) => (
          <div key={`${result.query}-${result.url}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-bold text-white">{result.title}</p>
                <p className="mt-1 text-xs text-blue-200/70">{result.displayLink}</p>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-blue-300 hover:text-white"
                aria-label="Buka hasil pencarian"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            {result.snippet && (
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{result.snippet}</p>
            )}
            {!result.previewOnly && (
              <button
                type="button"
                onClick={() => onUseUrl(result.url)}
                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
              >
                Pakai sebagai URL bukti
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportCenter = () => {
  const [form, setForm] = useState(initialForm);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [scrapedEvidence, setScrapedEvidence] = useState(null);
  const [scrapeStatus, setScrapeStatus] = useState("idle");
  const [osintStatus, setOsintStatus] = useState("idle");
  const [osintMode, setOsintMode] = useState("preview");
  const [osintQueries, setOsintQueries] = useState([]);
  const [osintResults, setOsintResults] = useState([]);
  const [osintMessage, setOsintMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [submittedReport, setSubmittedReport] = useState(null);

  useEffect(() => {
    setRecentReports(getStoredReports());
  }, []);

  useEffect(() => {
    return () => {
      filePreviews.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [filePreviews]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, evidence: undefined }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 3);

    setEvidenceFiles(files);
    setFilePreviews(
      files.map((file) => ({
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      })),
    );
    setErrors((prev) => ({ ...prev, evidence: undefined }));
  };

  const handleScrape = async () => {
    if (!form.evidenceUrl.trim()) {
      setErrors((prev) => ({ ...prev, evidenceUrl: "Masukkan URL postingan publik." }));
      return;
    }

    setScrapeStatus("loading");
    setErrors((prev) => ({ ...prev, evidenceUrl: undefined }));

    try {
      const result = await scrapeEvidenceUrl(form.evidenceUrl.trim());
      setScrapedEvidence(result);
      setScrapeStatus("success");
    } catch (error) {
      const fallbackPreview = buildClientUrlPreview(form.evidenceUrl.trim());
      setScrapedEvidence(fallbackPreview);
      setScrapeStatus("fallback");
      setErrors((prev) => ({
        ...prev,
        evidenceUrl: error.message || "Scraping gagal, URL tetap disimpan sebagai bukti.",
      }));
    }
  };

  const handleOsintSearch = async () => {
    const keyword = [
      form.fraudType,
      form.accountNumber,
      form.accountHolder,
      form.description,
    ]
      .filter(Boolean)
      .join(" ");

    if (!form.accountNumber && !form.accountHolder && !keyword.trim()) {
      setErrors((prev) => ({ ...prev, osint: "Isi nomor rekening atau nama dulu." }));
      return;
    }

    setOsintStatus("loading");
    setOsintMessage("");
    setErrors((prev) => ({ ...prev, osint: undefined }));

    try {
      const searchPayload = {
        accountNumber: form.accountNumber,
        accountHolder: form.accountHolder,
        fraudType: form.fraudType,
        platform: form.platform,
        keyword,
      };
      const result = await searchOsintEvidence(searchPayload);
      setOsintMode(result.mode || "live");
      setOsintQueries(result.queries || []);
      setOsintResults(result.results || []);
      setOsintMessage(result.message || "");
      setOsintStatus("success");
    } catch (error) {
      const preview = buildClientOsintPreview(
        {
          accountNumber: form.accountNumber,
          accountHolder: form.accountHolder,
          fraudType: form.fraudType,
          platform: form.platform,
          keyword,
        },
        error.message,
      );

      setOsintMode(preview.mode);
      setOsintQueries(preview.queries);
      setOsintResults(preview.results);
      setOsintMessage(preview.message);
      setOsintStatus("success");
    }
  };

  const useOsintUrl = async (url) => {
    updateForm("evidenceUrl", url);
    setScrapeStatus("loading");

    try {
      const result = await scrapeEvidenceUrl(url);
      setScrapedEvidence(result);
      setScrapeStatus("success");
    } catch {
      setScrapedEvidence(buildClientUrlPreview(url));
      setScrapeStatus("fallback");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await submitReport({
      ...form,
      evidenceFiles,
      scrapedEvidence,
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSubmittedReport(result.report);
    setRecentReports(result.reports);
    setForm(initialForm);
    setEvidenceFiles([]);
    setFilePreviews([]);
    setScrapedEvidence(null);
    setScrapeStatus("idle");
    setErrors({});
  };

  return (
    <section
      id="lapor"
      className="relative overflow-hidden border-y border-white/5 bg-slate-950 py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_65%)]" />
      <div className="container relative z-10 mx-auto px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
            <ShieldAlert className="h-4 w-4" /> Pusat Laporan Komunitas
          </div>
          <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
            Laporkan Rekening Penipu dengan Bukti
          </h2>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <motion.form
            onSubmit={handleSubmit}
            variants={revealUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.12 }}
            className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 md:p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Nama pelapor
                </span>
                <input
                  value={form.reporterName}
                  onChange={(event) => updateForm("reporterName", event.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Kontak pelapor
                </span>
                <input
                  value={form.reporterContact}
                  onChange={(event) => updateForm("reporterContact", event.target.value)}
                  placeholder="Email atau WhatsApp, opsional"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Bank / e-wallet
                </span>
                <input
                  value={form.bank}
                  onChange={(event) => updateForm("bank", event.target.value)}
                  placeholder="BCA, DANA, OVO, dll"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
                />
                <FieldError>{errors.bank}</FieldError>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Nomor rekening
                </span>
                <input
                  value={form.accountNumber}
                  inputMode="numeric"
                  onChange={(event) =>
                    updateForm("accountNumber", event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Contoh: 1234567890"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
                />
                <FieldError>{errors.accountNumber}</FieldError>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Nama pemilik rekening
                </span>
                <input
                  value={form.accountHolder}
                  onChange={(event) => updateForm("accountHolder", event.target.value)}
                  placeholder="Nama yang muncul di mutasi"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm uppercase text-white placeholder:normal-case placeholder-slate-500 outline-none transition focus:border-cyan-400"
                />
                <FieldError>{errors.accountHolder}</FieldError>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Platform kejadian
                </span>
                <select
                  value={form.platform}
                  onChange={(event) => updateForm("platform", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  {platformOptions.map((platform) => (
                    <option key={platform}>{platform}</option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">
                  Modus penipuan
                </span>
                <select
                  value={form.fraudType}
                  onChange={(event) => updateForm("fraudType", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  {fraudTypeOptions.map((fraudType) => (
                    <option key={fraudType}>{fraudType}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-400/20 bg-slate-950/70 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                    <Globe2 className="h-4 w-4 text-blue-300" />
                    Scraping Otomatis OSINT Dork
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                    Sistem membuat query seperti{" "}
                    <code className="rounded bg-slate-900 px-1.5 py-0.5 text-cyan-200">
                      site:facebook.com OR site:x.com
                    </code>{" "}
                    dari platform, modus, nomor rekening, dan nama yang diisi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOsintSearch}
                  disabled={osintStatus === "loading"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {osintStatus === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanSearch className="h-4 w-4" />
                  )}
                  Cari Bukti Publik
                </button>
              </div>
              <FieldError>{errors.osint}</FieldError>
              {osintMessage && <p className="mt-3 text-xs text-amber-300">{osintMessage}</p>}
              <div className="mt-4">
                <OsintResults
                  mode={osintMode}
                  queries={osintQueries}
                  results={osintResults}
                  onUseUrl={useOsintUrl}
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <FileImage className="h-4 w-4 text-cyan-300" />
                Bukti foto
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-900 px-4 py-8 text-center transition hover:border-cyan-400/70 hover:bg-slate-800">
                <UploadCloud className="mb-3 h-8 w-8 text-cyan-300" />
                <span className="text-sm font-semibold text-white">
                  Upload screenshot transfer, chat, atau postingan
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Maksimal 3 gambar untuk prototype ini
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              {filePreviews.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {filePreviews.map((file) => (
                    <div
                      key={file.previewUrl}
                      className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
                    >
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="h-24 w-full object-cover"
                      />
                      <div className="p-2">
                        <p className="truncate text-xs font-semibold text-white">{file.name}</p>
                        <p className="text-[11px] text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <FieldError>{errors.evidence}</FieldError>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                URL postingan publik
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Link className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.evidenceUrl}
                    onChange={(event) => updateForm("evidenceUrl", event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleScrape}
                  disabled={scrapeStatus === "loading"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {scrapeStatus === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanSearch className="h-4 w-4" />
                  )}
                  Analisis URL
                </button>
              </div>
              <FieldError>{errors.evidenceUrl}</FieldError>
              {scrapeStatus === "fallback" && (
                <p className="mt-2 text-xs text-amber-300">
                  Preview lokal dipakai karena endpoint scraping belum tersedia atau target
                  menolak akses.
                </p>
              )}
              <div className="mt-4">
                <ScrapePreview evidence={scrapedEvidence} />
              </div>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">
                Kronologi singkat
              </span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={5}
                placeholder="Ceritakan urutan kejadian, nominal, platform, dan kenapa rekening ini perlu direview."
                className="custom-scrollbar w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-relaxed text-white placeholder-slate-500 outline-none transition focus:border-cyan-400"
              />
              <FieldError>{errors.description}</FieldError>
            </label>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) => updateForm("consent", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500"
              />
              <span className="text-sm leading-relaxed text-slate-300">
                Saya setuju laporan ini diproses untuk review keamanan komunitas.
                Bukti palsu atau doxing dapat ditolak oleh tim TriGuard.
              </span>
            </label>
            <FieldError>{errors.consent}</FieldError>

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              <ClipboardCheck className="h-5 w-5" />
              Kirim Laporan
            </button>
          </motion.form>

          <motion.aside
            variants={revealUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.12 }}
            className="space-y-6"
          >
            {submittedReport && (
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                  Laporan diterima
                </div>
                <p className="font-mono text-2xl font-bold text-white">{submittedReport.id}</p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50/80">
                  Status: {submittedReport.status}. Data ini masih tersimpan lokal
                  sebagai prototype sampai backend database disiapkan.
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-white">
                <Database className="h-5 w-5 text-cyan-300" />
                Alur Review
              </div>
              <div className="space-y-4">
                {[
                  "Pelapor mengirim rekening, kronologi, foto, dan URL publik.",
                  "Scrapling mengambil metadata URL dan sinyal angka rekening yang terlihat.",
                  "Analis memverifikasi bukti sebelum rekening masuk blacklist.",
                ].map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-200">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-400">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-white">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
                Antrian Laporan Demo
              </div>
              {recentReports.length === 0 ? (
                <p className="text-sm leading-relaxed text-slate-500">
                  Belum ada laporan di browser ini. Kirim satu laporan untuk melihat
                  bagaimana antrian review tampil.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentReports.slice(0, 4).map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {report.id}
                        </span>
                        <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[11px] font-bold text-amber-200">
                          {report.riskScore}%
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {report.bank} {report.accountNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {report.fraudType} di {report.platform}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
};

export default ReportCenter;
