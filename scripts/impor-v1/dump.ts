import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

/*
 * Pengurai dump SQL MySQL/MariaDB aplikasi mutu lama (mysqldump atau ekspor phpMyAdmin). Hanya tiga tabel pengaturan
 * mutu dan isian harian `mutu_entries` yang diurai; tabel lain (termasuk data kepegawaian) dilewati baris per baris tanpa
 * disimpan.
 */

const TABEL_V1 = ["units", "master_indikator_mutus", "indikator_mutus", "mutu_entries"] as const;
type TabelV1 = (typeof TABEL_V1)[number];
/** Satu baris tabel: nama kolom → nilai teks apa adanya (angka juga teks), NULL = null. */
type BarisV1 = Record<string, string | null>;
export type IsiDump = Record<TabelV1, BarisV1[]>;

const ESCAPE: Record<string, string> = { "0": "\0", b: "\b", n: "\n", r: "\r", t: "\t", Z: "\x1a" };

/** Nilai-nilai dalam `VALUES (...), (...)`: string berpetik (escape MySQL dan `''`), NULL, atau kata/angka polos. */
function uraiTupel(teks: string): (string | null)[][] {
  const hasil: (string | null)[][] = [];
  let tupel: (string | null)[] | null = null;
  let i = 0;
  while (i < teks.length) {
    const c = teks[i];
    if (c === "(" && !tupel) {
      tupel = [];
      i++;
    } else if (c === ")" && tupel) {
      hasil.push(tupel);
      tupel = null;
      i++;
    } else if (!tupel || c === "," || /\s/.test(c)) {
      i++;
    } else if (c === "'") {
      let nilai = "";
      i++;
      while (i < teks.length) {
        const d = teks[i];
        if (d === "\\") {
          const e = teks[i + 1];
          // \% dan \_ tetap berisi garis miring (aturan MySQL); escape lain menjadi karakternya.
          nilai += e === "%" || e === "_" ? `\\${e}` : (ESCAPE[e] ?? e);
          i += 2;
        } else if (d === "'" && teks[i + 1] === "'") {
          nilai += "'";
          i += 2;
        } else if (d === "'") {
          i++;
          break;
        } else {
          nilai += d;
          i++;
        }
      }
      tupel.push(nilai);
    } else {
      const akhir = teks.slice(i).search(/[,)\s]/);
      const kata = teks.slice(i, akhir === -1 ? undefined : i + akhir);
      tupel.push(kata.toUpperCase() === "NULL" ? null : kata);
      i += kata.length;
    }
  }
  return hasil;
}

/** Benar bila `teks` berakhir di luar string berpetik dengan `;` (akhir pernyataan INSERT). */
function selesai(teks: string) {
  let diString = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (diString && c === "\\") i++;
    else if (c === "'") diString = !diString;
    else if (!diString && c === ";") return true;
  }
  return false;
}

/**
 * Pengurai baris demi baris. `baris(teks)` untuk setiap baris dump, lalu `hasil()`. Urutan kolom diambil dari daftar
 * kolom INSERT (phpMyAdmin) atau dari `CREATE TABLE` tabel itu (mysqldump tanpa daftar kolom).
 */
export function pengurai() {
  const isi: IsiDump = { units: [], master_indikator_mutus: [], indikator_mutus: [], mutu_entries: [] };
  const kolom = new Map<TabelV1, string[]>();
  let buat: { tabel: TabelV1; kolom: string[] } | null = null;
  let sisipan: { tabel: TabelV1; teks: string } | null = null;

  const tabelKami = (nama: string): TabelV1 | null => (TABEL_V1 as readonly string[]).includes(nama) ? (nama as TabelV1) : null;

  function simpanSisipan(tabel: TabelV1, teks: string) {
    const m = /^INSERT\s+(?:IGNORE\s+)?INTO\s+`?\w+`?\s*(\(([^)]*)\))?\s*VALUES\s*/i.exec(teks);
    if (!m) throw new Error(`Pernyataan INSERT tabel ${tabel} tidak dikenali.`);
    const nama = m[2] ? m[2].split(",").map((k) => k.trim().replace(/`/g, "")) : kolom.get(tabel);
    if (!nama) throw new Error(`Urutan kolom tabel ${tabel} tidak diketahui (tanpa CREATE TABLE dan daftar kolom).`);
    for (const nilai of uraiTupel(teks.slice(m[0].length))) {
      if (nilai.length !== nama.length) throw new Error(`Jumlah nilai tabel ${tabel} tidak sama dengan jumlah kolom.`);
      isi[tabel].push(Object.fromEntries(nama.map((k, i) => [k, nilai[i]])));
    }
  }

  return {
    baris(teks: string) {
      if (sisipan) {
        sisipan.teks += `\n${teks}`;
        if (selesai(sisipan.teks)) {
          simpanSisipan(sisipan.tabel, sisipan.teks);
          sisipan = null;
        }
        return;
      }
      if (buat) {
        const k = /^\s*`(\w+)`\s/.exec(teks);
        if (k) buat.kolom.push(k[1]);
        else if (/^\s*\)/.test(teks)) {
          kolom.set(buat.tabel, buat.kolom);
          buat = null;
        }
        return;
      }
      const c = /^CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i.exec(teks);
      if (c) {
        const tabel = tabelKami(c[1]);
        if (tabel) buat = { tabel, kolom: [] };
        return;
      }
      const s = /^INSERT\s+(?:IGNORE\s+)?INTO\s+`?(\w+)`?/i.exec(teks);
      const tabel = s && tabelKami(s[1]);
      if (tabel) {
        if (selesai(teks)) simpanSisipan(tabel, teks);
        else sisipan = { tabel, teks };
      }
    },
    hasil() {
      if (sisipan) throw new Error(`Dump terpotong di tengah INSERT tabel ${sisipan.tabel}.`);
      return isi;
    },
  };
}

/** Mengurai teks dump lengkap (untuk tes dan dump kecil). */
export function uraiDump(teks: string) {
  const p = pengurai();
  for (const baris of teks.split(/\r?\n/)) p.baris(baris);
  return p.hasil();
}

/** Membaca berkas dump `.sql` atau `.sql.gz` baris per baris, tanpa memuat seluruh berkas ke memori. */
export async function bacaDump(path: string) {
  const masukan = createReadStream(path);
  const p = pengurai();
  for await (const baris of createInterface({ input: path.endsWith(".gz") ? masukan.pipe(createGunzip()) : masukan, crlfDelay: Infinity })) {
    p.baris(baris);
  }
  return p.hasil();
}
