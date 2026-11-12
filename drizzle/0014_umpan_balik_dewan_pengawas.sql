CREATE TABLE "umpan_balik_dewan_pengawas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tahun" integer NOT NULL,
	"triwulan" integer NOT NULL,
	"teks" text NOT NULL,
	"diterima_pada" date NOT NULL,
	"tindak_lanjut" text DEFAULT '' NOT NULL,
	"diubah_oleh_id" uuid NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "umpan_balik_dewan_pengawas_tahun_triwulan_unique" UNIQUE("tahun","triwulan"),
	CONSTRAINT "umpan_balik_dewan_pengawas_triwulan_check" CHECK ("umpan_balik_dewan_pengawas"."triwulan" between 1 and 4)
);
--> statement-breakpoint
ALTER TABLE "umpan_balik_dewan_pengawas" ADD CONSTRAINT "umpan_balik_dewan_pengawas_diubah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diubah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;