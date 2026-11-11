"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Ikon } from "./ikon";

export type OpsiPilih = { nilai: string; label: string; grup?: string };

/** Cocok bila setiap kata yang diketik ada di label (tanpa membedakan huruf besar/kecil), bukan pencocokan fuzzy. */
const cocok = (_nilai: string, cari: string, label?: string[]) => {
  const teks = (label ?? []).join(" ").toLowerCase();
  return cari.toLowerCase().split(/\s+/).every((kata) => teks.includes(kata)) ? 1 : 0;
};

/**
 * Pilihan dengan kotak pencarian (combobox shadcn: Popover + Command), pengganti `<select>` di semua form. Nilainya
 * dikirim lewat input bernama `nama`, jadi terbaca FormData (server action maupun form GET); input itu juga membawa
 * `required` bila `wajib`, sehingga browser menahan form yang belum memilih. `grup` = judul kelompok pilihan. Pemanggil
 * memberi `key` = nilai awal bila nilainya bisa berubah dari state form (aturan yang sama dengan select).
 */
export function PilihCari(p: {
  id: string;
  nama: string;
  pilihan: readonly OpsiPilih[];
  nilai?: string;
  placeholder?: string;
  cari?: string;
  wajib?: boolean;
}) {
  const [buka, setBuka] = useState(false);
  const [nilai, setNilai] = useState(p.nilai ?? "");
  const pemicu = useRef<HTMLButtonElement>(null);
  const terpilih = p.pilihan.find((o) => o.nilai === nilai);
  const grup = [...new Set(p.pilihan.map((o) => o.grup ?? ""))];

  return (
    <div className="relative min-w-0">
      {/*
        Bukan type="hidden" supaya `required` divalidasi browser; tak terlihat dan tak bisa difokus lewat Tab. Bila
        browser memfokuskannya karena kosong, fokus dipindah ke tombol pilihan.
      */}
      <input
        name={p.nama}
        value={nilai}
        required={p.wajib}
        onChange={() => {}}
        onFocus={() => pemicu.current?.focus()}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
      />
      <Popover open={buka} onOpenChange={setBuka}>
        <PopoverTrigger asChild>
          <Button
            ref={pemicu}
            id={p.id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={buka}
            className="h-10 w-full justify-between rounded-md border-input bg-paper-3 px-3 text-base font-normal hover:bg-paper-2"
          >
            <span className={`truncate ${terpilih ? "" : "text-muted-foreground"}`}>{terpilih?.label ?? p.placeholder ?? "Pilih…"}</span>
            <Ikon nama="pilih" className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
          <Command filter={cocok}>
            <CommandInput placeholder={p.cari ?? "Cari…"} />
            <CommandList>
              <CommandEmpty>Tidak ada yang cocok.</CommandEmpty>
              {grup.map((g) => (
                <CommandGroup key={g} heading={g || undefined}>
                  {p.pilihan
                    .filter((o) => (o.grup ?? "") === g)
                    .map((o) => (
                      <CommandItem
                        key={o.nilai}
                        value={o.nilai || "(kosong)"}
                        keywords={[o.label]}
                        data-checked={o.nilai === nilai}
                        onSelect={() => {
                          setNilai(o.nilai);
                          setBuka(false);
                        }}
                      >
                        {o.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
