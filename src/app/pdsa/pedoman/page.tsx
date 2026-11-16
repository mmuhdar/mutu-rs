import type { Metadata } from "next";

import { KEPUTUSAN_PDSA, LABEL_KEPUTUSAN_PDSA, LABEL_TAHAP_PDSA, type KeputusanPdsa, type TahapIsianPdsa } from "@/lib/perbaikan";
import { requireUser } from "@/server/sesi";

import { TombolCetak } from "../../laporan/klien";
import { Halaman, Kartu, KepalaHalaman } from "../../ui";

export const metadata: Metadata = { title: "Pedoman pengisian PDSA" };

/*
 * Pedoman pengisian PDSA untuk pengisi di ruangan (Kepala Unit) dan Komite Mutu, dengan bahasa sehari-hari dan satu
 * contoh yang sama dari Plan sampai Act. Nama tombol harus sama dengan tombol di `../form-pdsa.tsx` dan `../[id]/page.tsx`.
 */

/** Nama tombol di aplikasi, ditulis seperti tombolnya supaya mudah dikenali. */
function Tombol({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-rule-2 bg-paper-3 px-1.5 py-0.5 text-[14px] whitespace-nowrap text-ink">{children}</span>;
}

/** Baris berlabel: label di kiri, isi di kanan (bertumpuk di layar sempit), dipisah garis rambut. */
function Baris({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-rule px-5 py-4 last:border-0 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 print:break-inside-avoid">
      <dt className="text-[15px] font-medium">{label}</dt>
      <dd className="grid max-w-[72ch] gap-2 text-[15px] leading-6 text-ink-2">{children}</dd>
    </div>
  );
}

function Contoh({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] leading-6 text-ink-3">
      Contoh: <span className="text-ink-2">{children}</span>
    </p>
  );
}

const SEKILAS: { tahap: TahapIsianPdsa; arti: string; isi: string }[] = [
  { tahap: "plan", arti: "Rencanakan", isi: "Tulis masalahnya, tujuan, perkiraan hasil, dan perubahan yang akan dicoba." },
  { tahap: "do", arti: "Coba", isi: "Jalankan perubahan dalam skala kecil, misalnya satu ruangan selama 1 sampai 3 bulan, dan catat yang terjadi." },
  { tahap: "study", arti: "Pelajari", isi: "Bandingkan hasil uji coba dengan perkiraan di Plan. Grafik Capaian sudah disediakan aplikasi." },
  { tahap: "act", arti: "Putuskan", isi: "Terapkan tetap, ubah lalu coba lagi, atau hentikan." },
];

const LANGKAH: { judul: React.ReactNode; isi: React.ReactNode }[] = [
  {
    judul: "Buka menu PDSA",
    isi: "Menu ada di sisi kiri layar, pada kelompok Perbaikan. Di HP, tekan dulu tombol menu di kiri atas.",
  },
  {
    judul: (
      <>
        Tekan <Tombol>Mulai PDSA</Tombol>
      </>
    ),
    isi: "Tombolnya ada di kanan atas halaman PDSA. Bila tombol ini tidak ada, akun Anda tidak berhak memulai PDSA (lihat bagian Bila ada kendala).",
  },
  {
    judul: "Pilih Indikator dan Lingkup",
    isi: "Tekan kotak Indikator, ketik kode atau sebagian namanya (misalnya kebersihan tangan), lalu pilih. Untuk Lingkup, pilih Unit Anda; Komite Mutu juga bisa memilih RS. Indikator dan Lingkup tidak bisa diubah setelah disimpan.",
  },
  {
    judul: (
      <>
        Isi Plan, lalu tekan <Tombol>Simpan Plan dan mulai Do</Tombol>
      </>
    ),
    isi: "Semua isian Plan wajib diisi; penjelasan setiap isian ada di bawah. Setelah disimpan, PDSA langsung berada di tahap Do.",
  },
  {
    judul: "Jalankan uji coba dan isi Do",
    isi: (
      <>
        Selama uji coba, buka PDSA dari Daftar PDSA, tulis catatan pelaksanaan, lalu tekan <Tombol>Simpan</Tombol>. Catatan bisa ditambah lagi
        kapan saja. Setelah periode uji coba selesai, tekan <Tombol>Simpan dan lanjut ke Study</Tombol>.
      </>
    ),
  },
  {
    judul: "Isi Study",
    isi: (
      <>
        Lihat grafik Capaian di tahap Study (periode uji coba diberi warna), tulis hasilnya, lalu tekan{" "}
        <Tombol>Simpan dan lanjut ke Act</Tombol>.
      </>
    ),
  },
  {
    judul: "Isi Act dan selesaikan",
    isi: (
      <>
        Pilih keputusan, tulis penjelasannya, lalu tekan <Tombol>Simpan dan selesaikan PDSA</Tombol>. Bila keputusannya Adaptasi, tekan{" "}
        <Tombol>Mulai siklus berikutnya</Tombol> untuk mencoba perubahan yang sudah disesuaikan.
      </>
    ),
  },
];

/** Isian setiap tahap: apa yang ditulis dan contohnya (satu kasus yang sama dari Plan sampai Act). */
const ISIAN: { tahap: TahapIsianPdsa; kapan: string; isian: { label: string; isi: React.ReactNode; contoh: string }[] }[] = [
  {
    tahap: "plan",
    kapan: "Diisi saat memulai PDSA.",
    isian: [
      {
        label: "Judul",
        isi: "Nama singkat perubahan yang dicoba, bukan nama masalahnya.",
        contoh: "Handrub di setiap tempat tidur ICU",
      },
      {
        label: "Masalah",
        isi: "Apa yang kurang baik, dengan angka dari Monitoring atau Analisis bulanan, dan dugaan penyebabnya.",
        contoh: "Kepatuhan kebersihan tangan perawat ICU bulan Agustus 72%, Target ≥ 85%. Paling rendah di shift malam. Handrub hanya ada di pintu masuk ruangan.",
      },
      {
        label: "Tujuan",
        isi: "Hasil yang ingin dicapai, dengan angka dan batas waktu.",
        contoh: "Kepatuhan shift malam ICU mencapai 85% atau lebih pada akhir Oktober 2026.",
      },
      {
        label: "Prediksi",
        isi: "Apa yang Anda perkirakan terjadi bila perubahan dijalankan, dan alasannya. Prediksi boleh meleset; justru itu yang dipelajari di Study.",
        contoh: "Bila handrub ada di samping setiap tempat tidur, perawat tidak perlu berjalan ke pintu, sehingga kepatuhan naik sekitar 10 poin.",
      },
      {
        label: "Rencana perubahan",
        isi: "Apa yang diubah, siapa yang menjalankan, di mana, mulai kapan, dan bagaimana hasilnya diukur. Mulai dari skala kecil.",
        contoh:
          "Kepala Ruang ICU memasang handrub di 6 tempat tidur mulai 1 September. IPCN mengamati kebersihan tangan 2 kali seminggu pada shift malam dan mencatatnya di formulir audit yang biasa dipakai.",
      },
      {
        label: "Periode uji coba",
        isi: "Bulan mulai dan bulan selesai uji coba, keduanya termasuk; biasanya 1 sampai 3 bulan. Bila tidak muncul pilihan bulan, ketik tahun dan bulan dengan angka, misalnya 2026-09.",
        contoh: "Uji coba mulai 2026-09, sampai 2026-10.",
      },
    ],
  },
  {
    tahap: "do",
    kapan: "Diisi selama uji coba berjalan; boleh ditambah sedikit demi sedikit.",
    isian: [
      {
        label: "Pelaksanaan",
        isi: "Apa yang benar-benar dijalankan, apa yang berbeda dari rencana, dan masalah yang muncul.",
        contoh:
          "Handrub terpasang 3 September. Minggu pertama botol cepat habis, stok ditambah dari farmasi. Pengamatan berjalan 16 kali. Dua perawat baru belum tahu, sudah diberi tahu saat operan.",
      },
    ],
  },
  {
    tahap: "study",
    kapan: "Diisi setelah periode uji coba selesai dan Pengukuran bulan itu sudah diverifikasi.",
    isian: [
      {
        label: "Hasil dibanding prediksi",
        isi: "Lihat grafik di tahap Study. Tulis angkanya selama uji coba, bandingkan dengan prediksi di Plan, dan tulis apa yang dipelajari.",
        contoh: "Kepatuhan shift malam September 80%, Oktober 86%. Prediksi naik 10 poin, kenyataannya naik 14 poin. Kenaikan terbesar pada saat sebelum menyentuh pasien.",
      },
    ],
  },
  {
    tahap: "act",
    kapan: "Diisi setelah Study, bersama tim di ruangan atau Komite Mutu.",
    isian: [
      {
        label: "Penjelasan",
        isi: "Untuk Adopsi: apa yang diterapkan dan dokumennya, misalnya SPO. Untuk Adaptasi: apa yang diubah pada siklus berikutnya. Untuk Tinggalkan: alasannya.",
        contoh: "Adopsi. Handrub di setiap tempat tidur dijadikan standar ICU; SPO kebersihan tangan ICU direvisi November 2026 dan diusulkan untuk ruang rawat inap.",
      },
    ],
  },
];

const ARTI_KEPUTUSAN: Record<KeputusanPdsa, string> = {
  adopsi: "Perubahan berhasil dan diterapkan tetap, misalnya dimasukkan ke SPO atau diperluas ke ruangan lain.",
  adaptasi: "Ada hasilnya, tetapi perlu diubah sedikit lalu dicoba lagi pada siklus berikutnya.",
  tinggalkan: "Perubahan tidak membantu atau tidak bisa dijalankan. Hentikan dan tulis alasannya.",
};

const TIPS = [
  "Tulis seperti melapor kepada atasan: kalimat pendek, ada angka, ada siapa dan kapan.",
  "Tidak perlu bahasa ilmiah. Yang penting orang lain mengerti apa yang dicoba dan bagaimana hasilnya.",
  "Jangan menulis nama pasien, nomor rekam medis, atau identitas pasien lainnya.",
  "Isian bisa disimpan lalu dilanjutkan kapan saja; tidak perlu selesai sekali duduk.",
  "Satu PDSA untuk satu perubahan. Bila ingin mencoba dua hal, buat dua PDSA supaya hasilnya tidak tercampur.",
  "Bila penyimpanan ditolak, baca pesan merah di atas tombol. Biasanya ada isian yang masih kosong.",
];

const KENDALA: { masalah: string; jalan: React.ReactNode }[] = [
  {
    masalah: "Tombol Mulai PDSA tidak ada",
    jalan: "Hanya Kepala Unit, Komite Mutu, dan Admin Sistem yang bisa memulai PDSA. Petugas Input Data bisa membaca; minta Kepala Unit yang mengisi.",
  },
  {
    masalah: "Muncul pesan bahwa Unit bukan Unit Pelapor",
    jalan: "Unit harus melaporkan Indikator itu pada bulan mulai uji coba. Periksa lagi Indikator dan bulan mulainya, atau hubungi Komite Mutu.",
  },
  {
    masalah: "Salah memilih Indikator atau Lingkup",
    jalan: (
      <>
        Indikator dan Lingkup tidak bisa diubah. Minta Admin Sistem menghapus PDSA itu, lalu mulai lagi. Isian lain (judul, Plan, periode) bisa
        diperbaiki sendiri lewat <Tombol>Perbaiki Plan</Tombol>.
      </>
    ),
  },
  {
    masalah: "Ingin mengubah tahap yang sudah lewat",
    jalan: (
      <>
        Di halaman PDSA, tekan nama tahapnya (misalnya Do), lalu tekan <Tombol>Perbaiki Do</Tombol>. Tahap yang sedang berjalan tidak berubah.
      </>
    ),
  },
  {
    masalah: "Terlanjur lanjut ke tahap berikutnya",
    jalan: "Tahap tidak bisa dikembalikan, tetapi isian tahap sebelumnya masih bisa ditambah atau diperbaiki lewat tombol Perbaiki seperti di atas.",
  },
  {
    masalah: "Grafik di tahap Study kosong",
    jalan: "Grafik hanya memakai Pengukuran yang sudah diverifikasi Kepala Unit. Pastikan Pengukuran bulan uji coba sudah diisi, diajukan, dan diverifikasi.",
  },
];

const KELAS_H2 = "font-display text-[22px] leading-7 font-medium tracking-[-0.02em]";

/** Pedoman pengisian PDSA: sekilas, langkah di aplikasi, isian per tahap dengan contoh, Analisis Efisiensi, tips, kendala. */
export default async function HalamanPedomanPdsa() {
  await requireUser();
  return (
    <Halaman>
      <KepalaHalaman
        judul="Pedoman pengisian PDSA"
        kembali={[{ href: "/pdsa", label: "Daftar PDSA" }]}
        sub="Panduan langkah demi langkah untuk Kepala Unit dan Komite Mutu. Tidak perlu dihafal: buka halaman ini di samping formulir, atau cetak untuk ruangan."
        aksi={
          <div className="w-full sm:w-auto print:hidden">
            <TombolCetak />
          </div>
        }
      />

      <section aria-labelledby="sekilas" className="grid gap-3">
        <h2 id="sekilas" className={KELAS_H2}>
          PDSA dalam satu menit
        </h2>
        <p className="max-w-[72ch] text-[15px] leading-6 text-ink-2">
          PDSA adalah cara mencoba satu perubahan kecil lebih dulu sebelum diterapkan di seluruh ruangan atau rumah sakit. Satu PDSA untuk satu
          Indikator di satu Lingkup: satu Unit, atau RS. Empat tahapnya diisi berurutan, dan setiap tahap bisa disimpan lalu dilanjutkan kapan
          saja.
        </p>
        <ol className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
          {SEKILAS.map((s) => (
            <li key={s.tahap} className="grid content-start gap-1 bg-paper-2 p-5">
              <span className="font-display text-[20px] leading-7 font-medium">{LABEL_TAHAP_PDSA[s.tahap]}</span>
              <span className="text-[14px] text-ink-3">{s.arti}</span>
              <p className="mt-1 text-[15px] leading-6 text-ink-2">{s.isi}</p>
            </li>
          ))}
        </ol>
      </section>

      <Kartu judul="Siapa dan kapan">
        <dl className="grid border-t border-rule">
          <Baris label="Siapa yang mengisi">
            Kepala Unit untuk Unit-nya sendiri. Komite Mutu dan Admin Sistem untuk Unit mana pun dan untuk Lingkup RS. Petugas Input Data,
            Direktur, dan Kepala Unit lain hanya bisa membaca.
          </Baris>
          <Baris label="Kapan membuat PDSA">
            Saat Capaian belum mencapai Target beberapa bulan, saat Analisis bulanan menyimpulkan perlu perbaikan, atau saat Direktur
            menetapkan prioritas perbaikan.
          </Baris>
          <Baris label="Yang perlu disiapkan">
            Grafik Capaian Indikator dari menu Monitoring, hasil diskusi dengan tim di ruangan, dan siapa yang akan menjalankan serta mengukur
            uji coba.
          </Baris>
        </dl>
      </Kartu>

      <section aria-labelledby="langkah" className="grid gap-4">
        <h2 id="langkah" className={KELAS_H2}>
          Langkah di aplikasi
        </h2>
        <ol className="grid border-l border-rule-2">
          {LANGKAH.map((l, i) => (
            <li key={i} className="grid gap-1.5 pb-6 pl-5 last:pb-1 sm:pl-7 print:break-inside-avoid">
              <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[17px] leading-7 font-medium">
                <span className="terukur text-[14px] text-ink-3">{i + 1}</span>
                <span>{l.judul}</span>
              </h3>
              <p className="max-w-[72ch] text-[15px] leading-7 text-ink-2">{l.isi}</p>
            </li>
          ))}
        </ol>
        <p className="max-w-[72ch] text-[15px] leading-6 text-ink-3">
          Isian tahap yang sudah lewat tetap bisa diperbaiki: di halaman PDSA tekan nama tahapnya (misalnya Plan), lalu tekan{" "}
          <Tombol>Perbaiki Plan</Tombol>.
        </p>
      </section>

      <section aria-labelledby="isian" className="grid gap-4">
        <h2 id="isian" className={KELAS_H2}>
          Mengisi setiap tahap
        </h2>
        <p className="max-w-[72ch] text-[15px] leading-6 text-ink-2">
          Contoh di bawah memakai satu kasus yang sama dari Plan sampai Act, yaitu kepatuhan kebersihan tangan di ICU. Ganti dengan keadaan di
          ruangan Anda.
        </p>
        {ISIAN.map((t) => (
          <Kartu key={t.tahap} judul={LABEL_TAHAP_PDSA[t.tahap]} sub={t.kapan}>
            <dl className="grid border-t border-rule">
              {t.tahap === "act" && (
                <Baris label="Keputusan">
                  <p>Pilih satu:</p>
                  <ul className="grid gap-1.5">
                    {KEPUTUSAN_PDSA.map((k) => (
                      <li key={k}>
                        <span className="font-medium text-ink">{LABEL_KEPUTUSAN_PDSA[k]}</span>: {ARTI_KEPUTUSAN[k]}
                      </li>
                    ))}
                  </ul>
                </Baris>
              )}
              {t.isian.map((i) => (
                <Baris key={i.label} label={i.label}>
                  <p>{i.isi}</p>
                  <Contoh>{i.contoh}</Contoh>
                </Baris>
              ))}
            </dl>
          </Kartu>
        ))}
      </section>

      <Kartu judul="Analisis Efisiensi" sub="Hanya bila diminta Komite Mutu: satu proyek prioritas perbaikan per tahun.">
        <div className="grid max-w-[72ch] gap-3 px-5 pb-5 text-[15px] leading-6 text-ink-2">
          <p>
            Tekan <Tombol>Isi Analisis Efisiensi</Tombol> di bagian bawah halaman PDSA. Isi biaya dalam Rupiah tanpa titik (misalnya 1500000)
            untuk periode yang sama sebelum dan sesudah perbaikan, misalnya per bulan. Kosongkan jenis sumber daya yang tidak terkait.
          </p>
          <p>Di kesimpulan, tulis periode perhitungannya, dari mana angkanya, dan apakah perbaikan lebih hemat tanpa menurunkan Capaian.</p>
        </div>
      </Kartu>

      <Kartu judul="Tips menulis">
        <ul className="grid max-w-[72ch] list-disc gap-2 px-5 pb-5 pl-10 text-[15px] leading-6 text-ink-2">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Kartu>

      <Kartu judul="Bila ada kendala">
        <dl className="grid border-t border-rule">
          {KENDALA.map((k) => (
            <Baris key={k.masalah} label={k.masalah}>
              <p>{k.jalan}</p>
            </Baris>
          ))}
        </dl>
      </Kartu>
    </Halaman>
  );
}
