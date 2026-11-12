CREATE TABLE "bukti_pengukuran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengukuran_id" uuid NOT NULL,
	"nama" varchar(200) NOT NULL,
	"jenis" varchar(32) NOT NULL,
	"ukuran" integer NOT NULL,
	"isi" "bytea" NOT NULL,
	"diunggah_oleh_id" uuid NOT NULL,
	"diunggah_pada" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "bukti_pengukuran_jenis_check" CHECK ("bukti_pengukuran"."jenis" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "bukti_pengukuran_ukuran_check" CHECK ("bukti_pengukuran"."ukuran" = octet_length("bukti_pengukuran"."isi") and "bukti_pengukuran"."ukuran" between 1 and 10485760)
);
--> statement-breakpoint
ALTER TABLE "bukti_pengukuran" ADD CONSTRAINT "bukti_pengukuran_pengukuran_id_pengukuran_id_fk" FOREIGN KEY ("pengukuran_id") REFERENCES "public"."pengukuran"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bukti_pengukuran" ADD CONSTRAINT "bukti_pengukuran_diunggah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diunggah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bukti_pengukuran_pengukuran_idx" ON "bukti_pengukuran" USING btree ("pengukuran_id");