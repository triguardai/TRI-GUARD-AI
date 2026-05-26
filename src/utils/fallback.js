export function buildFallbackReply(prompt) {
  const text = String(prompt || '').toLowerCase();
  const getField = (label) => {
    const match = prompt.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
    return match?.[1]?.trim();
  };

  const formatRupiah = (value) => {
    const numericValue = Number(String(value || '').replace(/[^\d]/g, ''));
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }

    return new Intl.NumberFormat('id-ID').format(numericValue);
  };

  const transactionFields = ['barang', 'harga sepakat', 'pembeli', 'penjual'];
  const hasTransactionDetails = transactionFields.some((field) => text.includes(field));

  // Direct command to start rekber flow
  if (text.includes('/rekber') || (text.includes('rekber') && !hasTransactionDetails)) {
    return `Untuk memulai Rekber, isi detail transaksi berikut (contoh):\n\nBarang: iPhone 13 Pro 256GB\nHarga Sepakat: 2.000.000\nPembeli: Nama Pembeli\nPenjual: Nama Penjual\n\natau cukup ketik /rekber lalu isi field seperti di atas. Saya akan bantu hitung biaya admin dan menyiapkan virtual account.`;
  }

  if (hasTransactionDetails) {
    const hargaSepakat = getField('harga sepakat');
    const pembeli = getField('pembeli') || 'Pembeli';
    const formattedHarga = formatRupiah(hargaSepakat);
    const biayaAdmin = 100000;
    const total = formattedHarga
      ? Number(String(hargaSepakat).replace(/[^\d]/g, '')) + biayaAdmin
      : null;
    const formattedTotal = total ? new Intl.NumberFormat('id-ID').format(total) : null;

    return `Rincian transaksi\n\nHarga Barang: Rp ${formattedHarga || '-'}\nBiaya Admin AI (Flat): Rp ${new Intl.NumberFormat('id-ID').format(biayaAdmin)}\nTotal ditransfer: Rp ${formattedTotal || '-'}\n\n${pembeli} bisa transfer Rp ${formattedTotal || '-'} ke rekening escrow kami:\nBCA: 1122334455 (TriGuard AI)`;
  }

  if (text.includes('resi')) {
    return `Untuk cek resi, kirim nomor resi kamu, misalnya: JNT001122334455. Saya akan coba cek status pengiriman.`;
  }

  if (text.includes('lapor') || text.includes('laporan')) {
    return `Untuk melaporkan rekening penipu, buka bagian "Lapor Penipu". Isi nomor rekening, nama pemilik, kronologi, lalu tambahkan bukti foto atau URL postingan publik agar tim bisa review.`;
  }

  if (text.includes('cek') && (text.includes('rekening') || /\b\d{6,}\b/.test(text))) {
    return `Untuk cek rekening, buka bagian "Cek Blacklist" lalu masukkan nomor rekening. Untuk demo, coba 9988776655 sebagai aman atau 1234567890 sebagai berisiko.`;
  }

  if (text.includes('mutasi') || text.includes('mutasi bank')) {
    return `Untuk baca mutasi, unggah screenshot atau tuliskan baris mutasi, saya akan bantu ringkas transaksi masuk/keluar.`;
  }

  if (text.includes('admin') || text.includes('biaya')) {
    return `Biaya admin untuk layanan rekber adalah Rp100.000 (flat) pada demo ini.`;
  }

  return `Maaf, saya belum mengerti. Bisa jelaskan lagi atau coba kata kunci seperti 'resi', 'mutasi', atau '/rekber'?`;
}

export default { buildFallbackReply };
