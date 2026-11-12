CREATE TABLE "insiden" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"unit_penyebab_id" uuid,
	"waktu_insiden" timestamp with time zone NOT NULL,
	"judul" varchar(200) NOT NULL,
	"kronologi" text NOT NULL,
	"jenis" varchar(16) NOT NULL,
	"orang_pertama" varchar(16) NOT NULL,
	"tempat" varchar(120) NOT NULL,
	"pasien_inisial" varchar(20),
	"pasien_no_rm" varchar(30),
	"pasien_ruangan" varchar(80) DEFAULT '' NOT NULL,
	"pasien_umur_bulan" integer,
	"pasien_jenis_kelamin" varchar(1),
	"penanggung_biaya" varchar(16),
	"kategori_pasien" varchar(16),
	"spesialisasi" varchar(24),
	"tanggal_masuk" timestamp with time zone,
	"akibat" varchar(16) NOT NULL,
	"tindakan_segera" text NOT NULL,
	"tindakan_oleh" varchar(16) NOT NULL,
	"pernah_terjadi" boolean NOT NULL,
	"pernah_terjadi_keterangan" text DEFAULT '' NOT NULL,
	"dilaporkan_oleh_id" uuid NOT NULL,
	"dilaporkan_pada" timestamp with time zone NOT NULL,
	"status" varchar(16) NOT NULL,
	"dampak" integer,
	"probabilitas" integer,
	"tenggat" date,
	"tipe_insiden" varchar(24),
	"faktor_kontributor" text[] DEFAULT '{}' NOT NULL,
	"penyebab_langsung" text DEFAULT '' NOT NULL,
	"akar_masalah" text DEFAULT '' NOT NULL,
	"rekomendasi" text DEFAULT '' NOT NULL,
	"ereport_pada" date,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insiden_jenis_check" CHECK ("insiden"."jenis" in ('kpc', 'knc', 'ktc', 'ktd', 'sentinel')),
	CONSTRAINT "insiden_status_check" CHECK ("insiden"."status" in ('dilaporkan', 'investigasi', 'ditinjau', 'rca', 'selesai', 'bukanInsiden')),
	CONSTRAINT "insiden_orang_pertama_check" CHECK ("insiden"."orang_pertama" in ('dokter', 'perawat', 'petugasLain', 'pasien', 'keluarga', 'pengunjung', 'lainnya')),
	CONSTRAINT "insiden_jenis_kelamin_check" CHECK ("insiden"."pasien_jenis_kelamin" in ('L', 'P')),
	CONSTRAINT "insiden_penanggung_biaya_check" CHECK ("insiden"."penanggung_biaya" in ('pribadi', 'asuransiSwasta', 'pemerintah', 'perusahaan', 'bpjs', 'lainnya')),
	CONSTRAINT "insiden_kategori_pasien_check" CHECK ("insiden"."kategori_pasien" in ('rawatInap', 'rawatJalan', 'ugd', 'lainnya')),
	CONSTRAINT "insiden_spesialisasi_check" CHECK ("insiden"."spesialisasi" in ('penyakitDalam', 'anak', 'bedah', 'obstetriGinekologi', 'tht', 'mata', 'saraf', 'anestesi', 'kulitKelamin', 'jantung', 'paru', 'jiwa', 'lainnya')),
	CONSTRAINT "insiden_akibat_check" CHECK ("insiden"."akibat" in ('tidakAdaCedera', 'cederaRingan', 'cederaSedang', 'cederaBerat', 'kematian')),
	CONSTRAINT "insiden_tindakan_oleh_check" CHECK ("insiden"."tindakan_oleh" in ('tim', 'dokter', 'perawat', 'petugasLain')),
	CONSTRAINT "insiden_tipe_check" CHECK ("insiden"."tipe_insiden" in ('administrasiKlinik', 'prosedurKlinis', 'dokumentasi', 'infeksiNosokomial', 'medikasi', 'transfusi', 'nutrisi', 'oksigen', 'alatMedis', 'perilakuPasien', 'jatuh', 'kecelakaan', 'infrastruktur', 'manajemenOrganisasi', 'laboratorium')),
	CONSTRAINT "insiden_faktor_check" CHECK ("insiden"."faktor_kontributor" <@ array['eksternal', 'organisasi', 'lingkungan', 'tim', 'petugas', 'tugas', 'pasien', 'komunikasi']::text[]),
	CONSTRAINT "insiden_umur_check" CHECK ("insiden"."pasien_umur_bulan" between 0 and 1800),
	CONSTRAINT "insiden_pasien_check" CHECK ("insiden"."jenis" = 'kpc' or ("insiden"."pasien_inisial" is not null and "insiden"."pasien_no_rm" is not null and "insiden"."pasien_umur_bulan" is not null and "insiden"."pasien_jenis_kelamin" is not null and "insiden"."penanggung_biaya" is not null and "insiden"."kategori_pasien" is not null and "insiden"."spesialisasi" is not null)),
	CONSTRAINT "insiden_dampak_check" CHECK ("insiden"."dampak" between 1 and 5),
	CONSTRAINT "insiden_probabilitas_check" CHECK ("insiden"."probabilitas" between 1 and 5),
	CONSTRAINT "insiden_grading_check" CHECK (("insiden"."dampak" is null) = ("insiden"."probabilitas" is null))
);
--> statement-breakpoint
CREATE TABLE "riwayat_status_insiden" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insiden_id" uuid NOT NULL,
	"status_asal" varchar(16),
	"status_tujuan" varchar(16) NOT NULL,
	"oleh_id" uuid NOT NULL,
	"waktu" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"dampak" integer,
	"probabilitas" integer,
	"catatan" text,
	CONSTRAINT "riwayat_status_insiden_asal_check" CHECK ("riwayat_status_insiden"."status_asal" in ('dilaporkan', 'investigasi', 'ditinjau', 'rca', 'selesai', 'bukanInsiden')),
	CONSTRAINT "riwayat_status_insiden_tujuan_check" CHECK ("riwayat_status_insiden"."status_tujuan" in ('dilaporkan', 'investigasi', 'ditinjau', 'rca', 'selesai', 'bukanInsiden')),
	CONSTRAINT "riwayat_status_insiden_dampak_check" CHECK ("riwayat_status_insiden"."dampak" between 1 and 5),
	CONSTRAINT "riwayat_status_insiden_probabilitas_check" CHECK ("riwayat_status_insiden"."probabilitas" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "insiden" ADD CONSTRAINT "insiden_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insiden" ADD CONSTRAINT "insiden_unit_penyebab_id_unit_id_fk" FOREIGN KEY ("unit_penyebab_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insiden" ADD CONSTRAINT "insiden_dilaporkan_oleh_id_pengguna_id_fk" FOREIGN KEY ("dilaporkan_oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status_insiden" ADD CONSTRAINT "riwayat_status_insiden_insiden_id_insiden_id_fk" FOREIGN KEY ("insiden_id") REFERENCES "public"."insiden"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_status_insiden" ADD CONSTRAINT "riwayat_status_insiden_oleh_id_pengguna_id_fk" FOREIGN KEY ("oleh_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insiden_unit_idx" ON "insiden" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "insiden_status_idx" ON "insiden" USING btree ("status");--> statement-breakpoint
CREATE INDEX "insiden_waktu_idx" ON "insiden" USING btree ("waktu_insiden");--> statement-breakpoint
CREATE INDEX "riwayat_status_insiden_idx" ON "riwayat_status_insiden" USING btree ("insiden_id","waktu");