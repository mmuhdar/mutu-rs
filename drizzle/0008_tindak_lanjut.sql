CREATE TABLE "tindak_lanjut" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analisis_id" uuid NOT NULL,
	"tindakan" text NOT NULL,
	"pic" varchar(120) NOT NULL,
	"tenggat" date NOT NULL,
	"status" varchar(16) NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"diubah_oleh_id" uuid NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tindak_lanjut_status_check" CHECK ("tindak_lanjut"."status" in ('direncanakan', 'berjalan', 'selesai', 'dibatalkan')),
	CONSTRAINT "tindak_lanjut_catatan_check" CHECK ("tindak_lanjut"."status" in ('direncanakan', 'berjalan') or "tindak_lanjut"."catatan" <> '')
);
--> statement-breakpoint
ALTER TABLE "tindak_lanjut" ADD CONSTRAINT "tindak_lanjut_analisis_id_analisis_id_fk" FOREIGN KEY ("analisis_id") REFERENCES "public"."analisis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tindak_lanjut" ADD CONSTRAINT "tindak_lanjut_diubah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diubah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tindak_lanjut_analisis_idx" ON "tindak_lanjut" USING btree ("analisis_id");