CREATE TABLE "jejak_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waktu" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"pengguna_id" uuid,
	"entitas" varchar(16) NOT NULL,
	"entitas_id" uuid,
	"ringkasan" text NOT NULL,
	CONSTRAINT "jejak_audit_entitas_check" CHECK ("jejak_audit"."entitas" in ('sesi', 'pengguna', 'unit', 'indikator', 'pengukuran', 'perbaikan', 'laporan', 'validasi', 'insiden'))
);
--> statement-breakpoint
ALTER TABLE "jejak_audit" ADD CONSTRAINT "jejak_audit_pengguna_id_pengguna_id_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jejak_audit_waktu_idx" ON "jejak_audit" USING btree ("waktu");--> statement-breakpoint
CREATE INDEX "jejak_audit_entitas_idx" ON "jejak_audit" USING btree ("entitas","entitas_id");