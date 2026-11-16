import type { NextRequest } from "next/server";
import writeXlsxFile, { type Cell, type CellObject, type SheetData } from "write-excel-file/node";

import { contentDisposition } from "@/lib/bukti";
import { config } from "@/lib/config";
import { responsPenolakan } from "@/lib/errors";
import {
  LABEL_EFEKTIVITAS,
  LABEL_KATEGORI_RISIKO,
  LABEL_TINGKAT_RISIKO,
  labelSimpulan,
  TINGKAT_RISIKO,
  type PenilaianRisiko,
  type TingkatRisiko,
} from "@/lib/risiko";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { daftarRisiko, tahunBerjalan, tahunRisikoValid } from "@/modules/risiko/service";
import { getSessionUser } from "@/server/sesi";

import { formatWaktu } from "../../pengukuran/status";

type BarisRisiko = Awaited<ReturnType<typeof daftarRisiko>>[number];
type Gaya = Omit<CellObject, "value" | "type">;

/*
 * Register Risiko sebagai berkas Excel (.xlsx) berwarna seperti register kertas: judul, kepala tabel dua tingkat
 * (Penilaian Awal dan Hasil Pemantauan), warna Tingkat Risiko merah, jingga, kuning, hijau, biru (sama dengan v1), dan
 * keterangan warna di bawah tabel. Warna hanya pelengkap; Tingkat dan Simpulan selalu juga ditulis.
 */

const GARIS: Gaya = { borderStyle: "thin", borderColor: "#A6A6A6" };
const KEPALA: Gaya = { ...GARIS, fontWeight: "bold", backgroundColor: "#D9E1F2", align: "center", alignVertical: "center", wrap: true };
const KELOMPOK: Gaya = { ...KEPALA, backgroundColor: "#B4C6E7" };
const ISI: Gaya = { ...GARIS, alignVertical: "top", wrap: true };
const ANGKA: Gaya = { ...ISI, align: "center" };
const REDUP: Gaya = { ...ISI, textColor: "#7F7F7F", fontStyle: "italic" };
const BAIK: Gaya = { ...ISI, backgroundColor: "#C6EFCE", textColor: "#006100" };
const BURUK: Gaya = { ...ISI, backgroundColor: "#FFC7CE", textColor: "#9C0006" };

const WARNA_TINGKAT: Record<TingkatRisiko, Gaya> = {
  sangatTinggi: { backgroundColor: "#C00000", textColor: "#FFFFFF", fontWeight: "bold" },
  tinggi: { backgroundColor: "#F4B084" },
  sedang: { backgroundColor: "#FFE699" },
  rendah: { backgroundColor: "#C6E0B4" },
  sangatRendah: { backgroundColor: "#BDD7EE" },
};

/** Kolom: lebar (karakter) dan judul; `kelompok` = judul gabungan di atas lima kolom penilaian. */
const PENILAIAN = ["Probabilitas", "Dampak", "Bobot", "Nilai Risiko", "Tingkat Risiko"];
const KOLOM: { judul: string; lebar: number; kelompok?: string }[] = [
  { judul: "No", lebar: 5 },
  { judul: "Unit", lebar: 16 },
  { judul: "Uraian Risiko", lebar: 40 },
  { judul: "Kategori Risiko", lebar: 14 },
  ...PENILAIAN.map((judul, i) => ({ judul, lebar: i === 4 ? 13 : 9, kelompok: "Penilaian Awal" })),
  { judul: "Prioritas Risiko", lebar: 10 },
  { judul: "Perlakuan", lebar: 45 },
  { judul: "Jadwal Pelaksanaan", lebar: 13 },
  ...PENILAIAN.map((judul, i) => ({ judul, lebar: i === 4 ? 13 : 9, kelompok: "Hasil Pemantauan" })),
  { judul: "Simpulan Tingkat Risiko", lebar: 17 },
  { judul: "Efektivitas", lebar: 12 },
  { judul: "Dokumen Review", lebar: 10 },
  { judul: "Diubah oleh", lebar: 20 },
  { judul: "Diubah pada", lebar: 18 },
];
const BARIS_KEPALA = 6;

/** Dua baris kepala tabel: kolom tunggal digabung dua baris, lima kolom penilaian di bawah judul kelompoknya. */
function kepalaTabel(): SheetData {
  const atas: Cell[] = [];
  const bawah: Cell[] = [];
  KOLOM.forEach((k, i) => {
    if (!k.kelompok) {
      atas.push({ value: k.judul, rowSpan: 2, ...KEPALA });
      bawah.push(null);
    } else {
      atas.push(KOLOM[i - 1]?.kelompok === k.kelompok ? null : { value: k.kelompok, columnSpan: PENILAIAN.length, ...KELOMPOK });
      bawah.push({ value: k.judul, ...KEPALA });
    }
  });
  return [atas, bawah];
}

/** Lima sel satu penilaian; Nilai dan Tingkat diwarnai menurut Tingkat Risiko. Belum dipantau = satu teks redup. */
function selPenilaian(n: PenilaianRisiko | null): Cell[] {
  if (!n) return [{ value: "belum dipantau", columnSpan: PENILAIAN.length, ...REDUP }, ...PENILAIAN.slice(1).map(() => null)];
  const warna = { ...ANGKA, ...WARNA_TINGKAT[n.tingkat] };
  return [
    { value: n.probabilitas, ...ANGKA },
    { value: n.dampak, ...ANGKA },
    { value: n.bobot, format: "0.00", ...ANGKA },
    { value: n.nilai, ...warna },
    { value: LABEL_TINGKAT_RISIKO[n.tingkat], ...warna },
  ];
}

function barisRisiko(r: BarisRisiko, i: number): Cell[] {
  return [
    { value: i + 1, ...ANGKA },
    { value: r.unit.nama, ...ISI },
    { value: r.uraian, ...ISI },
    { value: LABEL_KATEGORI_RISIKO[r.kategori], ...ISI },
    ...selPenilaian(r.awal),
    { value: r.awal.prioritas, ...ANGKA, ...WARNA_TINGKAT[r.awal.tingkat] },
    r.daftarPerlakuan.length > 0
      ? { value: r.daftarPerlakuan.map((p, j) => `${j + 1}. ${p}`).join("\n"), ...ISI }
      : { value: "belum diisi", ...REDUP },
    // Tanggal tengah malam UTC supaya Excel menampilkan tanggal yang sama di zona waktu mana pun.
    r.jadwal ? { value: new Date(`${r.jadwal}T00:00:00Z`), type: Date, format: "dd/mm/yyyy", ...ANGKA } : { value: "tanpa jadwal", ...REDUP },
    ...selPenilaian(r.pemantauan),
    { value: labelSimpulan(r.turun), ...(r.turun === null ? REDUP : r.turun ? BAIK : BURUK) },
    r.efektivitas ? { value: LABEL_EFEKTIVITAS[r.efektivitas], ...(r.efektivitas === "efektif" ? BAIK : BURUK) } : { value: "belum dinilai", ...REDUP },
    { value: r.jumlahDokumen, ...ANGKA },
    { value: r.diubahOleh, ...ISI },
    { value: formatWaktu(r.diubahPada), ...ISI },
  ];
}

function isiLembar(daftar: BarisRisiko[], tahun: number, namaUnit: string, aktor: Pengguna): SheetData {
  const lebar = KOLOM.length;
  const judul = (value: string, gaya: Gaya): Cell[] => [{ value, columnSpan: lebar, ...gaya }];
  return [
    judul(`Register Risiko ${namaUnit} Tahun ${tahun}`, { fontWeight: "bold", fontSize: 14 }),
    judul(config.namaRs, { fontSize: 12 }),
    judul(`Diunduh dari MutuRS oleh ${aktor.nama}, ${formatWaktu(new Date())}. ${daftar.length} risiko.`, { textColor: "#595959" }),
    [],
    ...kepalaTabel(),
    ...daftar.map(barisRisiko),
    [],
    [null, { value: "Keterangan warna Tingkat Risiko", fontWeight: "bold", columnSpan: 2 }],
    ...TINGKAT_RISIKO.map((t): Cell[] => [null, { value: LABEL_TINGKAT_RISIKO[t], ...ANGKA, ...WARNA_TINGKAT[t] }]),
  ];
}

/**
 * Unduhan Excel Register Risiko dengan saringan yang sama dengan halaman `/risiko`: `?tahun=` (di luar rentang = tahun
 * berjalan) dan `?unit=` (kosong = semua Unit yang terbaca). Hak baca di service.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const dariAlamat = Number(sp.get("tahun"));
    const tahun = tahunRisikoValid(dariAlamat) ? dariAlamat : tahunBerjalan();
    const unitId = sp.get("unit") || undefined;
    const aktor = await getSessionUser();
    wajibPengguna(aktor);
    const daftar = await daftarRisiko(aktor, { tahun, unitId });
    const namaUnit = unitId ? `Unit ${daftar[0]?.unit.nama ?? ""}`.trim() : "Semua Unit";
    const berkas = await writeXlsxFile(
      isiLembar(daftar, tahun, namaUnit, aktor),
      { sheet: `Register Risiko ${tahun}`, columns: KOLOM.map((k) => ({ width: k.lebar })), stickyRowsCount: BARIS_KEPALA, orientation: "landscape" },
      { fontFamily: "Calibri", fontSize: 11 },
    ).toBuffer();
    const nama = `register-risiko-${tahun}${unitId && daftar[0] ? `-${daftar[0].unit.nama}` : ""}.xlsx`;
    return new Response(new Uint8Array(berkas), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition("attachment", nama),
      },
    });
  } catch (error) {
    return responsPenolakan(error);
  }
}
