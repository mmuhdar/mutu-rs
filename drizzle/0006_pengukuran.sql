CREATE TABLE "pengukuran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"bulan" date NOT NULL,
	"n" integer NOT NULL,
	"d" integer NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"status" varchar(16) NOT NULL,
	"pengisi_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pengukuran_bulan_check" CHECK (extract(day from "pengukuran"."bulan") = 1),
	CONSTRAINT "pengukuran_status_check" CHECK ("pengukuran"."status" in ('draf', 'diajukan', 'terverifikasi')),
	CONSTRAINT "pengukuran_nd_check" CHECK ("pengukuran"."n" >= 0 and "pengukuran"."d" >= 0 and ("pengukuran"."d" > 0 or "pengukuran"."n" = 0))
);
--> statement-breakpoint
CREATE TABLE "riwayat_status_pengukuran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengukuran_id" uuid NOT NULL,
	"status_asal" varchar(16),
	"status_tujuan" varchar(16) NOT NULL,
	"oleh_id" uuid NOT NULL,
	"waktu" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"alasan" text,
	CONSTRAINT "riwayat_status_pengukuran_asal_check" CHECK ("riwayat_status_pengukuran"."status_asal" in ('draf', 'diajukan', 'terverifikasi')),
	CONSTRAINT "riwayat_status_pengukuran_tujuan_check" CHECK ("riwayat_status_pengukuran"."status_tujuan" in ('draf', 'diajukan', 'terverifikasi'))
);
--> statement-breakpoint
ALTER TABLE "pengukuran" ADD CONSTRAINT "pengukuran_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengukuran" ADD CONSTRAINT "pengukuran_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengukuran" ADD CONSTRAINT "pengukuran_pengisi_id_pengguna_id_fk" FOREIGN KEY ("pengisi_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status_pengukuran" ADD CONSTRAINT "riwayat_status_pengukuran_pengukuran_id_pengukuran_id_fk" FOREIGN KEY ("pengukuran_id") REFERENCES "public"."pengukuran"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status_pengukuran" ADD CONSTRAINT "riwayat_status_pengukuran_oleh_id_pengguna_id_fk" FOREIGN KEY ("oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pengukuran_indikator_unit_bulan_unique" ON "pengukuran" USING btree ("indikator_id","unit_id","bulan");--> statement-breakpoint
CREATE INDEX "riwayat_status_pengukuran_idx" ON "riwayat_status_pengukuran" USING btree ("pengukuran_id","waktu");