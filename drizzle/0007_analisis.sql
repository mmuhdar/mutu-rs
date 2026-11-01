CREATE TABLE "analisis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"unit_id" uuid,
	"bulan" date NOT NULL,
	"teks" text NOT NULL,
	"diubah_oleh_id" uuid NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analisis_indikator_unit_bulan_unique" UNIQUE NULLS NOT DISTINCT("indikator_id","unit_id","bulan"),
	CONSTRAINT "analisis_bulan_check" CHECK (extract(day from "analisis"."bulan") = 1)
);
--> statement-breakpoint
ALTER TABLE "analisis" ADD CONSTRAINT "analisis_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analisis" ADD CONSTRAINT "analisis_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analisis" ADD CONSTRAINT "analisis_diubah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diubah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;