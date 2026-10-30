CREATE TABLE "unit_pelapor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"bulan_mulai" date NOT NULL,
	"bulan_berhenti" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_pelapor_bulan_mulai_check" CHECK (extract(day from "unit_pelapor"."bulan_mulai") = 1),
	CONSTRAINT "unit_pelapor_bulan_berhenti_check" CHECK (extract(day from "unit_pelapor"."bulan_berhenti") = 1),
	CONSTRAINT "unit_pelapor_periode_check" CHECK ("unit_pelapor"."bulan_berhenti" >= "unit_pelapor"."bulan_mulai")
);
--> statement-breakpoint
ALTER TABLE "unit_pelapor" ADD CONSTRAINT "unit_pelapor_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_pelapor" ADD CONSTRAINT "unit_pelapor_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unit_pelapor_indikator_idx" ON "unit_pelapor" USING btree ("indikator_id");