CREATE TABLE "pengguna_unit" (
	"pengguna_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	CONSTRAINT "pengguna_unit_pengguna_id_unit_id_pk" PRIMARY KEY("pengguna_id","unit_id")
);
--> statement-breakpoint
ALTER TABLE "pengguna_unit" ADD CONSTRAINT "pengguna_unit_pengguna_id_pengguna_id_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."pengguna"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengguna_unit" ADD CONSTRAINT "pengguna_unit_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;