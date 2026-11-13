CREATE TABLE "dokumen_risiko" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risiko_id" uuid NOT NULL,
	"nama" varchar(200) NOT NULL,
	"jenis" varchar(80) NOT NULL,
	"ukuran" integer NOT NULL,
	"isi" "bytea" NOT NULL,
	"diunggah_oleh_id" uuid NOT NULL,
	"diunggah_pada" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "dokumen_risiko_jenis_check" CHECK ("dokumen_risiko"."jenis" in ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
	CONSTRAINT "dokumen_risiko_ukuran_check" CHECK ("dokumen_risiko"."ukuran" = octet_length("dokumen_risiko"."isi") and "dokumen_risiko"."ukuran" between 1 and 10485760)
);
--> statement-breakpoint
CREATE TABLE "risiko" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"tahun" integer NOT NULL,
	"uraian" text NOT NULL,
	"kategori" varchar(16) NOT NULL,
	"probabilitas" integer NOT NULL,
	"dampak" integer NOT NULL,
	"perlakuan" text DEFAULT '' NOT NULL,
	"jadwal" date,
	"probabilitas_pemantauan" integer,
	"dampak_pemantauan" integer,
	"efektivitas" varchar(16),
	"diubah_oleh_id" uuid NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risiko_tahun_check" CHECK ("risiko"."tahun" between 2000 and 2100),
	CONSTRAINT "risiko_kategori_check" CHECK ("risiko"."kategori" in ('kebijakan', 'reputasi', 'fraudKorupsi', 'legal', 'kepatuhan', 'operasional')),
	CONSTRAINT "risiko_skala_check" CHECK ("risiko"."probabilitas" between 1 and 5 and "risiko"."dampak" between 1 and 5),
	CONSTRAINT "risiko_pemantauan_check" CHECK (("risiko"."probabilitas_pemantauan" is null and "risiko"."dampak_pemantauan" is null and "risiko"."efektivitas" is null) or ("risiko"."probabilitas_pemantauan" between 1 and 5 and "risiko"."dampak_pemantauan" between 1 and 5)),
	CONSTRAINT "risiko_efektivitas_check" CHECK ("risiko"."efektivitas" in ('efektif', 'tidakEfektif'))
);
--> statement-breakpoint
ALTER TABLE "jejak_audit" DROP CONSTRAINT "jejak_audit_entitas_check";--> statement-breakpoint
ALTER TABLE "dokumen_risiko" ADD CONSTRAINT "dokumen_risiko_risiko_id_risiko_id_fk" FOREIGN KEY ("risiko_id") REFERENCES "public"."risiko"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumen_risiko" ADD CONSTRAINT "dokumen_risiko_diunggah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diunggah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risiko" ADD CONSTRAINT "risiko_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risiko" ADD CONSTRAINT "risiko_diubah_oleh_id_pengguna_id_fk" FOREIGN KEY ("diubah_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dokumen_risiko_risiko_idx" ON "dokumen_risiko" USING btree ("risiko_id");--> statement-breakpoint
CREATE INDEX "risiko_unit_tahun_idx" ON "risiko" USING btree ("unit_id","tahun");--> statement-breakpoint
ALTER TABLE "jejak_audit" ADD CONSTRAINT "jejak_audit_entitas_check" CHECK ("jejak_audit"."entitas" in ('sesi', 'pengguna', 'unit', 'indikator', 'pengukuran', 'perbaikan', 'laporan', 'validasi', 'insiden', 'risiko'));