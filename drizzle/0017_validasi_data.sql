CREATE TABLE "validasi_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"bulan" date NOT NULL,
	"pemicu" varchar(24) NOT NULL,
	"tanggal" date NOT NULL,
	"pengumpul_data" varchar(120) NOT NULL,
	"validator" varchar(120) NOT NULL,
	"populasi" integer NOT NULL,
	"sampel" integer NOT NULL,
	"sesuai" integer NOT NULL,
	"penyebab" text[] DEFAULT '{}' NOT NULL,
	"perbaikan" text DEFAULT '' NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"diubah_oleh_id" uuid NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validasi_data_bulan_check" CHECK (extract(day from "validasi_data"."bulan") = 1),
	CONSTRAINT "validasi_data_pemicu_check" CHECK ("validasi_data"."pemicu" in ('indikatorBaru', 'publikasi', 'perubahanPengukuran', 'perubahanHasil', 'perubahanSumber', 'perubahanSubjek')),
	CONSTRAINT "validasi_data_penyebab_check" CHECK ("validasi_data"."penyebab" <@ array['pemahaman', 'kamus', 'definisi', 'waktu', 'input', 'sumber', 'kelalaian', 'formulir']::text[]),
	CONSTRAINT "validasi_data_sampel_check" CHECK ("validasi_data"."populasi" >= 1 and "validasi_data"."sampel" between 1 and "validasi_data"."populasi" and "validasi_data"."sesuai" between 0 and "validasi_data"."sampel")
);
--> statement-breakpoint
ALTER TABLE "validasi_data" ADD CONSTRAINT "validasi_data_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validasi_data" ADD CONSTRAINT "validasi_data_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validasi_data" ADD CONSTRAINT "validasi_data_diubah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diubah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "validasi_data_indikator_unit_bulan_idx" ON "validasi_data" USING btree ("indikator_id","unit_id","bulan");