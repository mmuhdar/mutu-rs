CREATE TABLE "pdsa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"unit_id" uuid,
	"judul" varchar(200) NOT NULL,
	"siklus" integer NOT NULL,
	"sebelumnya_id" uuid,
	"tahap" varchar(16) NOT NULL,
	"bulan_mulai" date NOT NULL,
	"bulan_akhir" date NOT NULL,
	"masalah" text NOT NULL,
	"tujuan" text NOT NULL,
	"prediksi" text NOT NULL,
	"rencana" text NOT NULL,
	"pelaksanaan" text DEFAULT '' NOT NULL,
	"hasil" text DEFAULT '' NOT NULL,
	"keputusan" varchar(16),
	"penjelasan" text DEFAULT '' NOT NULL,
	"diubah_oleh_id" uuid NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pdsa_tahap_check" CHECK ("pdsa"."tahap" in ('plan', 'do', 'study', 'act', 'selesai')),
	CONSTRAINT "pdsa_keputusan_check" CHECK ("pdsa"."keputusan" in ('adopsi', 'adaptasi', 'tinggalkan')),
	CONSTRAINT "pdsa_siklus_check" CHECK ("pdsa"."siklus" >= 1),
	CONSTRAINT "pdsa_bulan_mulai_check" CHECK (extract(day from "pdsa"."bulan_mulai") = 1),
	CONSTRAINT "pdsa_bulan_akhir_check" CHECK (extract(day from "pdsa"."bulan_akhir") = 1),
	CONSTRAINT "pdsa_periode_check" CHECK ("pdsa"."bulan_akhir" >= "pdsa"."bulan_mulai")
);
--> statement-breakpoint
ALTER TABLE "pdsa" ADD CONSTRAINT "pdsa_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdsa" ADD CONSTRAINT "pdsa_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdsa" ADD CONSTRAINT "pdsa_sebelumnya_id_pdsa_id_fk" FOREIGN KEY ("sebelumnya_id") REFERENCES "public"."pdsa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdsa" ADD CONSTRAINT "pdsa_diubah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diubah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pdsa_indikator_idx" ON "pdsa" USING btree ("indikator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pdsa_sebelumnya_unique" ON "pdsa" USING btree ("sebelumnya_id");