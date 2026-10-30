CREATE TABLE "indikator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" varchar(32) NOT NULL,
	"nama" varchar(200) NOT NULL,
	"kelompok" varchar(16) NOT NULL,
	"definisi_operasional" text NOT NULL,
	"definisi_numerator" text NOT NULL,
	"definisi_denominator" text NOT NULL,
	"sumber_data" text NOT NULL,
	"faktor" integer NOT NULL,
	"satuan" varchar(32) NOT NULL,
	"arah" varchar(16) NOT NULL,
	"frekuensi" varchar(16) NOT NULL,
	"pic" varchar(120) DEFAULT '' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indikator_kelompok_check" CHECK ("indikator"."kelompok" in ('INM', 'IMP-RS', 'IMP-Unit')),
	CONSTRAINT "indikator_arah_check" CHECK ("indikator"."arah" in ('makinTinggi', 'makinRendah')),
	CONSTRAINT "indikator_frekuensi_check" CHECK ("indikator"."frekuensi" in ('bulanan', 'semesteran')),
	CONSTRAINT "indikator_faktor_check" CHECK ("indikator"."faktor" > 0)
);
--> statement-breakpoint
CREATE TABLE "target" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"nilai" numeric NOT NULL,
	"berlaku_mulai" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "target_berlaku_mulai_check" CHECK (extract(day from "target"."berlaku_mulai") = 1),
	CONSTRAINT "target_nilai_check" CHECK ("target"."nilai" >= 0)
);
--> statement-breakpoint
ALTER TABLE "target" ADD CONSTRAINT "target_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "indikator_kode_unique" ON "indikator" USING btree (lower("kode"));--> statement-breakpoint
CREATE UNIQUE INDEX "target_indikator_bulan_unique" ON "target" USING btree ("indikator_id","berlaku_mulai");