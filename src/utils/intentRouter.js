export function classifyIntent(text = "") {
  const t = String(text).toLowerCase();
  if (t.includes("/rekber") || t.includes("rekber")) return "rekber";
  if (t.includes("lapor") || t.includes("laporan")) return "laporan";
  if (t.includes("resi") || t.includes("tracking") || t.includes("pengiriman")) return "resi";
  if (t.includes("mutasi")) return "mutasi";
  if (t.includes("cek") && (t.includes("rekening") || /\b\d{6,}\b/.test(t))) return "cek_rekening";
  return "unknown";
}
