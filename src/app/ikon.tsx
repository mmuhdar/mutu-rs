import {
  Building2,
  ChartLine,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Database,
  Eye,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SquarePen,
  Target,
  Undo2,
  Users,
  X,
} from "lucide-react";

/*
 * Ikon garis Lucide (pustaka ikon shadcn/ui) dengan nama domain MutuRS. Selalu dekoratif (`aria-hidden`): artinya
 * ditulis di teks di sampingnya.
 */
const BENTUK = {
  dashboard: LayoutDashboard,
  isi: SquarePen,
  verifikasi: ShieldCheck,
  pantau: ListChecks,
  monitoring: ChartLine,
  tindakLanjut: ClipboardCheck,
  pdsa: RefreshCw,
  indikator: Database,
  unit: Building2,
  pengguna: Users,
  sandi: KeyRound,
  keluar: LogOut,
  cari: Search,
  bawah: ChevronDown,
  cek: Check,
  kanan: ChevronRight,
  tambah: Plus,
  lihat: Eye,
  jam: Clock,
  target: Target,
  centang: CircleCheck,
  peringatan: CircleAlert,
  dokumen: FileText,
  kotakMasuk: Inbox,
  kembalikan: Undo2,
  menu: Menu,
  tutup: X,
} as const;

export type NamaIkon = keyof typeof BENTUK;

export function Ikon({ nama, className = "size-5" }: { nama: NamaIkon; className?: string }) {
  const Bentuk = BENTUK[nama];
  return <Bentuk aria-hidden strokeWidth={1.75} className={`shrink-0 ${className}`} />;
}
