CREATE TABLE "efisiensi_pdsa" (
	"pdsa_id" uuid NOT NULL,
	"jenis" varchar(16) NOT NULL,
	"sebelum" integer NOT NULL,
	"sesudah" integer NOT NULL,
	"keterangan" text DEFAULT '' NOT NULL,
	CONSTRAINT "efisiensi_pdsa_pdsa_id_jenis_pk" PRIMARY KEY("pdsa_id","jenis"),
	CONSTRAINT "efisiensi_pdsa_jenis_check" CHECK ("efisiensi_pdsa"."jenis" in ('tenaga', 'bahan', 'alat', 'waktu', 'lainnya')),
	CONSTRAINT "efisiensi_pdsa_biaya_check" CHECK ("efisiensi_pdsa"."sebelum" >= 0 and "efisiensi_pdsa"."sesudah" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pdsa" ADD COLUMN "kesimpulan_efisiensi" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "efisiensi_pdsa" ADD CONSTRAINT "efisiensi_pdsa_pdsa_id_pdsa_id_fk" FOREIGN KEY ("pdsa_id") REFERENCES "public"."pdsa"("id") ON DELETE no action ON UPDATE no action;