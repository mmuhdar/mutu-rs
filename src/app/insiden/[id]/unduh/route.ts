import type { NextRequest } from "next/server";
import PDFDocument from "pdfkit";

import { contentDisposition } from "@/lib/bukti";
import { hariIni, labelTanggal } from "@/lib/bulan";
import { config } from "@/lib/config";
import { responsPenolakan } from "@/lib/errors";
import {
  JENIS_EREPORT,
  kelompokUmur,
  LABEL_AKIBAT_INSIDEN,
  LABEL_FAKTOR_KONTRIBUTOR,
  LABEL_JENIS_INSIDEN,
  LABEL_JENIS_KELAMIN,
  LABEL_KATEGORI_PASIEN,
  LABEL_ORANG_PERTAMA,
  LABEL_PENANGGUNG_BIAYA,
  LABEL_SPESIALISASI,
  LABEL_STATUS_INSIDEN,
  LABEL_TINDAKAN_OLEH,
  LABEL_TIPE_INSIDEN,
  LABEL_WARNA_GRADING,
  labelUmur,
  warnaGrading,
} from "@/lib/insiden";
import { teksPdf } from "@/lib/pdf";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { ambilInsiden, type DetailInsiden } from "@/modules/insiden/service";
import { getSessionUser } from "@/server/sesi";

import { formatWaktu } from "../../../pengukuran/status";

/*
 * Laporan satu Insiden sebagai PDF A4, mengikuti susunan Formulir 1 laporan insiden internal PMK 11/2017 (data pasien,
 * rincian kejadian, grading), ditambah hasil investigasi, Riwayat Status, dan kolom paraf Pembuat dan Penerima Laporan.
 * Isinya persis yang boleh dibaca aktor menurut `ambilInsiden`. Font standar PDF (Helvetica), jadi semua teks lewat
 * `teksPdf`.
 */

const KIRI = 50;
const LEBAR = 495; // A4 595 pt dikurangi margin kiri dan kanan
const LEBAR_LABEL = 150;
const JARAK = 12;
const ATAS = 50;
const BAWAH = 60;
const REDUP = "#555555";
const GARIS = "#C8CDD5";

type Baris = [string, string];

const atauKosong = (s: string | null | undefined) => (s && s.trim() ? s : "tidak diisi");

function barisPasien(i: DetailInsiden): Baris[] {
  return [
    ["Inisial pasien", atauKosong(i.pasienInisial)],
    ["No. Rekam Medis", atauKosong(i.pasienNoRm)],
    ["Ruangan", atauKosong(i.pasienRuangan)],
    ["Umur", i.pasienUmurBulan === null ? "tidak diisi" : `${labelUmur(i.pasienUmurBulan)} (${kelompokUmur(i.pasienUmurBulan)})`],
    ["Jenis kelamin", i.pasienJenisKelamin ? LABEL_JENIS_KELAMIN[i.pasienJenisKelamin] : "tidak diisi"],
    ["Insiden menyangkut pasien", i.kategoriPasien ? LABEL_KATEGORI_PASIEN[i.kategoriPasien] : "tidak diisi"],
    ["Penanggung biaya", i.penanggungBiaya ? LABEL_PENANGGUNG_BIAYA[i.penanggungBiaya] : "tidak diisi"],
    ["Spesialisasi kasus", i.spesialisasi ? LABEL_SPESIALISASI[i.spesialisasi] : "tidak diisi"],
    ["Tanggal masuk", i.tanggalMasuk ? formatWaktu(i.tanggalMasuk) : "tidak diisi"],
  ];
}

function barisKejadian(i: DetailInsiden): Baris[] {
  return [
    ["Waktu insiden", formatWaktu(i.waktuInsiden)],
    ["Insiden", i.judul],
    ["Kronologi", i.kronologi],
    ["Jenis insiden", LABEL_JENIS_INSIDEN[i.jenis]],
    ["Orang pertama yang melaporkan", LABEL_ORANG_PERTAMA[i.orangPertama]],
    ["Tempat insiden", i.tempat],
    ["Unit tempat insiden", i.unit.nama],
    ["Unit penyebab", i.unitPenyebab?.nama ?? "tidak diketahui"],
    ["Akibat terhadap pasien", LABEL_AKIBAT_INSIDEN[i.akibat]],
    ["Tindakan segera dan hasilnya", i.tindakanSegera],
    ["Tindakan dilakukan oleh", LABEL_TINDAKAN_OLEH[i.tindakanOleh]],
    ["Pernah terjadi di unit kerja lain", i.pernahTerjadi ? `Ya. ${i.pernahTerjadiKeterangan}` : "Tidak"],
    ...(JENIS_EREPORT.includes(i.jenis)
      ? ([["e-Report Kemenkes", i.ereportPada ? `Dikirim ${labelTanggal(i.ereportPada)}` : "belum dicatat"]] as Baris[])
      : []),
  ];
}

function barisGrading(i: DetailInsiden): Baris[] {
  if (!i.warna || !i.dampak || !i.probabilitas) return [["Grading", "Belum digrading."]];
  return [
    ["Warna grading", `${LABEL_WARNA_GRADING[i.warna]} (dampak ${i.dampak}, probabilitas ${i.probabilitas})`],
    ...(i.tenggat ? ([["Tenggat investigasi", labelTanggal(i.tenggat)]] as Baris[]) : []),
  ];
}

function barisRiwayat(i: DetailInsiden): Baris[] {
  return i.riwayat.map((r) => {
    const isi = [
      r.statusAsal
        ? `${LABEL_STATUS_INSIDEN[r.statusAsal]} menjadi ${LABEL_STATUS_INSIDEN[r.statusTujuan]}`
        : `Laporan dibuat, ${LABEL_STATUS_INSIDEN[r.statusTujuan]}`,
      r.dampak && r.probabilitas
        ? `Grading ${LABEL_WARNA_GRADING[warnaGrading(r.dampak, r.probabilitas)]} (dampak ${r.dampak}, probabilitas ${r.probabilitas})`
        : "",
      `Oleh ${r.oleh}`,
      r.catatan ? `${r.statusTujuan === "bukanInsiden" ? "Alasan" : "Catatan"}: ${r.catatan}` : "",
    ];
    return [formatWaktu(r.waktu), isi.filter(Boolean).join("\n")];
  });
}

function buatPdf(i: DetailInsiden, aktor: Pengguna): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: ATAS, bottom: BAWAH, left: KIRI, right: KIRI },
    bufferPages: true,
    info: { Title: "Laporan Insiden Keselamatan Pasien", Author: teksPdf(config.namaRs), Creator: "MutuRS" },
  });
  const potongan: Buffer[] = [];
  doc.on("data", (b: Buffer) => potongan.push(b));
  const selesai = new Promise<Buffer>((terima) => doc.on("end", () => terima(Buffer.concat(potongan))));
  const batasBawah = () => doc.page.height - BAWAH;
  let y = ATAS;

  /** Pindah halaman bila tinggi `h` tidak muat lagi. */
  const sediakan = (h: number) => {
    if (y + h > batasBawah()) {
      doc.addPage();
      y = ATAS;
    }
  };

  const bagian = (judul: string) => {
    sediakan(44);
    y += 10;
    doc.rect(KIRI, y, LEBAR, 20).fill("#E7ECF3");
    doc.fillColor("#1F2937").font("Helvetica-Bold").fontSize(10.5).text(teksPdf(judul), KIRI + 8, y + 5.5, { width: LEBAR - 16 });
    y += 20;
  };

  const baris = ([label, nilai]: Baris) => {
    const lebarNilai = LEBAR - LEBAR_LABEL - JARAK;
    const [l, n] = [teksPdf(label), teksPdf(nilai)];
    doc.font("Helvetica").fontSize(9);
    const hLabel = doc.heightOfString(l, { width: LEBAR_LABEL });
    doc.fontSize(10);
    const hNilai = doc.heightOfString(n, { width: lebarNilai, lineGap: 1.5 });
    // Baris pendek tidak dipotong; isian panjang (mis. kronologi) mulai di halaman ini lalu mengalir ke halaman berikutnya.
    sediakan(Math.min(Math.max(hLabel, hNilai) + 10, 80));
    const halaman = doc.bufferedPageRange().count;
    doc.fillColor(REDUP).fontSize(9).text(l, KIRI, y + 6, { width: LEBAR_LABEL });
    doc.fillColor("#000000").fontSize(10).text(n, KIRI + LEBAR_LABEL + JARAK, y + 5, { width: lebarNilai, lineGap: 1.5 });
    // Isi yang mengalir ke halaman berikutnya berakhir di `doc.y` halaman baru.
    y = doc.bufferedPageRange().count === halaman ? Math.max(y + 6 + hLabel, doc.y) + 5 : doc.y + 5;
    doc.moveTo(KIRI, y).lineTo(KIRI + LEBAR, y).lineWidth(0.5).strokeColor(GARIS).stroke();
  };

  // Kepala laporan.
  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(11).text(teksPdf(config.namaRs), KIRI, y, { width: LEBAR });
  doc.fontSize(15).text("LAPORAN INSIDEN KESELAMATAN PASIEN (INTERNAL)", KIRI, doc.y + 4, { width: LEBAR });
  doc.fillColor("#9C0006").fontSize(9).text("RAHASIA. Tidak boleh difotokopi. Dilaporkan paling lambat 2 x 24 jam setelah insiden.", KIRI, doc.y + 4);
  doc.fillColor(REDUP).font("Helvetica").fontSize(9)
    .text("Bukan alat bukti hukum dan bukan untuk menyalahkan (PMK 11/2017 Pasal 16 dan 21).", KIRI, doc.y + 2);
  y = doc.y + 6;

  bagian("Ringkasan");
  [
    ["Status", LABEL_STATUS_INSIDEN[i.status]],
    ["Dilaporkan oleh", `${i.pembuat}, ${formatWaktu(i.dilaporkanPada)}${i.terlambatDilaporkan ? " (lewat dari 2 x 24 jam setelah insiden)" : ""}`],
  ].forEach((b) => baris(b as Baris));
  bagian("I. Data Pasien");
  barisPasien(i).forEach(baris);
  bagian("II. Rincian Kejadian");
  barisKejadian(i).forEach(baris);
  bagian("III. Grading Risiko");
  barisGrading(i).forEach(baris);
  if (i.investigasi) {
    bagian(i.status === "selesai" ? "IV. Hasil Investigasi" : "IV. Investigasi (belum selesai)");
    (
      [
        ["Tipe insiden", LABEL_TIPE_INSIDEN[i.investigasi.tipeInsiden]],
        ["Faktor kontributor", i.investigasi.faktorKontributor.map((f) => LABEL_FAKTOR_KONTRIBUTOR[f]).join(", ")],
        ["Penyebab langsung", i.investigasi.penyebabLangsung],
        ["Akar masalah", i.investigasi.akarMasalah],
        ["Rekomendasi", i.investigasi.rekomendasi],
      ] as Baris[]
    ).forEach(baris);
  }
  bagian(`${i.investigasi ? "V" : "IV"}. Riwayat Status`);
  barisRiwayat(i).forEach(baris);

  // Kolom paraf seperti Formulir 1: Pembuat Laporan dan Penerima Laporan.
  sediakan(110);
  y += 24;
  const kolom = (LEBAR - 30) / 2;
  const paraf = (x: number, judul: string, nama: string, tanggal: string) => {
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10).text(judul, x, y, { width: kolom });
    doc.font("Helvetica").fontSize(10).text(teksPdf(nama), x, y + 16, { width: kolom });
    doc.fillColor(REDUP).fontSize(9).text(tanggal, x, y + 32, { width: kolom });
    doc.text("Paraf:", x, y + 62, { width: kolom });
    doc.moveTo(x + 32, y + 72).lineTo(x + kolom, y + 72).lineWidth(0.5).strokeColor("#888888").stroke();
  };
  paraf(KIRI, "Pembuat Laporan", i.pembuat, `Tanggal lapor: ${formatWaktu(i.dilaporkanPada)}`);
  paraf(KIRI + kolom + 30, "Penerima Laporan", "Nama: ....................................................", "Tanggal terima: ...................................");

  // Kaki setiap halaman; margin bawah dinolkan sementara supaya teks kaki tidak memicu halaman baru.
  const { count } = doc.bufferedPageRange();
  const kaki = teksPdf(`Rahasia. Diunduh dari MutuRS oleh ${aktor.nama}, ${formatWaktu(new Date())}.`);
  for (let n = 0; n < count; n++) {
    doc.switchToPage(n);
    doc.page.margins.bottom = 0;
    const yKaki = doc.page.height - 38;
    doc.fillColor(REDUP).font("Helvetica").fontSize(8);
    doc.text(kaki, KIRI, yKaki, { width: LEBAR - 90, lineBreak: false });
    doc.text(`Halaman ${n + 1} dari ${count}`, KIRI + LEBAR - 90, yKaki, { width: 90, align: "right", lineBreak: false });
  }
  doc.end();
  return selesai;
}

/** Unduhan PDF laporan satu Insiden dari halaman detailnya; hak baca dan isi yang boleh dilihat dari `ambilInsiden`. */
export async function GET(_request: NextRequest, { params }: RouteContext<"/insiden/[id]/unduh">) {
  try {
    const aktor = await getSessionUser();
    wajibPengguna(aktor);
    const i = await ambilInsiden(aktor, (await params).id);
    const pdf = await buatPdf(i, aktor);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        // Nama berkas tanpa judul insiden, yang bisa memuat keterangan pasien.
        "Content-Disposition": contentDisposition("attachment", `laporan-insiden-${hariIni(i.waktuInsiden)}.pdf`),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return responsPenolakan(error);
  }
}
