"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Package,
  Users,
  HeartHandshake,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  MousePointerClick,
} from "lucide-react";

/* ── types ── */
interface KPI {
  alimentos: number;
  donantes: number;
  donacionesMes: number;
  porVencer: number;
}
interface MesData { mes: string; donaciones: number; fecha: string }
interface CategoriaData { id: number; nombre: string; value: number }
interface DonanteData { id: number; nombre: string; donaciones: number }
interface VencimientoRow {
  nombre: string;
  fecha_vencimiento: string;
  cantidad: number;
  diasRestantes: number;
}
interface EstadoData { nombre: string; value: number; color: string; valor: string }


const COLORS = ["#CC1717", "#E05C1F", "#8B1A1A", "#D97706", "#92400E"];
const CHART_RED = "#CC1717";

function nombreMes(fecha: string) {
  return new Date(fecha).toLocaleDateString("es", { month: "short", year: "2-digit" });
}
function mesKey(fecha: string) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function diasHasta(fecha: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha).getTime() - hoy.getTime()) / 86400000);
}
function badgeColor(dias: number) {
  if (dias <= 7) return "bg-red-100 text-red-700";
  if (dias <= 15) return "bg-orange-100 text-orange-700";
  return "bg-yellow-100 text-yellow-700";
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name?: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name ? `${p.name}: ` : ""}
          <span className="font-bold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function HintLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
      <MousePointerClick className="h-3 w-3" />
      {children}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [kpi, setKpi] = useState<KPI>({ alimentos: 0, donantes: 0, donacionesMes: 0, porVencer: 0 });
  const [meses, setMeses] = useState<MesData[]>([]);
  const [categorias, setCategorias] = useState<CategoriaData[]>([]);
  const [topDonantes, setTopDonantes] = useState<DonanteData[]>([]);
  const [estados, setEstados] = useState<EstadoData[]>([]);
  const [vencimientos, setVencimientos] = useState<VencimientoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
      const en30dias = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const hace6meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).toISOString().slice(0, 10);

      const [
        { count: cAlimentos },
        { count: cDonantes },
        { count: cDonMes },
        { count: cVencer },
        { data: donacionesData },
        { data: alimentosCat },
        { data: donacionesDon },
        { data: vencData },
        { data: estadoRaw },
      ] = await Promise.all([
        supabase.from("alimentos").select("id", { count: "exact", head: true }),
        supabase.from("donantes").select("id", { count: "exact", head: true }),
        supabase.from("donaciones").select("id", { count: "exact", head: true }).gte("fecha_donacion", inicioMes),
        supabase.from("alimentos").select("id", { count: "exact", head: true })
          .not("fecha_vencimiento", "is", null)
          .gte("fecha_vencimiento", hoy.toISOString().slice(0, 10))
          .lte("fecha_vencimiento", en30dias),
        supabase.from("donaciones").select("fecha_donacion").gte("fecha_donacion", hace6meses).order("fecha_donacion"),
        supabase.from("alimentos").select("categoria_id, categorias(nombre)").not("categoria_id", "is", null),
        supabase.from("donaciones").select("donante_id, donantes(nombre, id)").not("donante_id", "is", null),
        supabase.from("alimentos").select("nombre, fecha_vencimiento, cantidad")
          .not("fecha_vencimiento", "is", null)
          .gte("fecha_vencimiento", hoy.toISOString().slice(0, 10))
          .lte("fecha_vencimiento", en30dias)
          .order("fecha_vencimiento").limit(8),
        supabase.from("detalle_donacion").select("alimentos(fecha_vencimiento)"),
      ]);

      setKpi({ alimentos: cAlimentos ?? 0, donantes: cDonantes ?? 0, donacionesMes: cDonMes ?? 0, porVencer: cVencer ?? 0 });


      const conteoMes: Record<string, { label: string; count: number }> = {};
      (donacionesData ?? []).forEach((d) => {
        const key = mesKey(d.fecha_donacion);
        if (!conteoMes[key]) conteoMes[key] = { label: nombreMes(d.fecha_donacion), count: 0 };
        conteoMes[key].count++;
      });
      setMeses(Object.entries(conteoMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, { label, count }]) => ({ mes: label, donaciones: count, fecha })));


      const catMap: Record<number, { nombre: string; count: number }> = {};
      (alimentosCat ?? []).forEach((a) => {
        const cat = a.categorias as { nombre: string } | null;
        if (a.categoria_id && cat) {
          catMap[a.categoria_id] = catMap[a.categoria_id] ?? { nombre: cat.nombre, count: 0 };
          catMap[a.categoria_id].count++;
        }
      });
      setCategorias(Object.entries(catMap)
        .map(([id, { nombre, count }]) => ({ id: Number(id), nombre, value: count }))
        .sort((a, b) => b.value - a.value));


      const donMap: Record<number, { nombre: string; count: number }> = {};
      (donacionesDon ?? []).forEach((d) => {
        const don = d.donantes as { nombre: string; id: number } | null;
        if (d.donante_id && don) {
          donMap[d.donante_id] = donMap[d.donante_id] ?? { nombre: don.nombre, count: 0 };
          donMap[d.donante_id].count++;
        }
      });
      setTopDonantes(Object.entries(donMap)
        .map(([id, { nombre, count }]) => ({ id: Number(id), nombre, donaciones: count }))
        .sort((a, b) => b.donaciones - a.donaciones).slice(0, 6));


      setVencimientos((vencData ?? []).map((v) => ({
        nombre: v.nombre,
        fecha_vencimiento: v.fecha_vencimiento!,
        cantidad: v.cantidad,
        diasRestantes: diasHasta(v.fecha_vencimiento!),
      })));

      const hoyStr = hoy.toISOString().slice(0, 10);
      const en7Str = en30dias; // en30dias ya es hoy+7
      let cVencido = 0, cPorVencer = 0, cBueno = 0;
      (estadoRaw ?? []).forEach((row) => {
        const ali = row.alimentos as { fecha_vencimiento: string | null } | null;
        const f = ali?.fecha_vencimiento ?? null;
        if (!f || f > en7Str) cBueno++;
        else if (f < hoyStr) cVencido++;
        else cPorVencer++;
      });
      const estadosCalc: EstadoData[] = [];
      if (cVencido > 0)   estadosCalc.push({ nombre: "Vencido",    value: cVencido,   color: "#CC1717", valor: "vencido"    });
      if (cPorVencer > 0) estadosCalc.push({ nombre: "Por vencer", value: cPorVencer, color: "#D97706", valor: "por_vencer" });
      if (cBueno > 0)     estadosCalc.push({ nombre: "Bueno",      value: cBueno,     color: "#16a34a", valor: "bueno"      });
      setEstados(estadosCalc);

      setLoading(false);
    }
    cargar();
  }, []);

  const kpiCards = [
    {
      titulo: "Alimentos",
      valor: kpi.alimentos,
      desc: "registrados en inventario",
      icon: Package,
      href: "/alimentos",
      color: "text-primary",
      bg: "bg-primary/8",
    },
    {
      titulo: "Donantes",
      valor: kpi.donantes,
      desc: "personas u organizaciones",
      icon: Users,
      href: "/donantes",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      titulo: "Donaciones este mes",
      valor: kpi.donacionesMes,
      desc: "recibidas en el mes actual",
      icon: HeartHandshake,
      href: "/donaciones?filtro=mes",
      color: "text-primary",
      bg: "bg-primary/8",
    },
    {
      titulo: "Por vencer (7 días)",
      valor: kpi.porVencer,
      desc: "alimentos próximos a vencer",
      icon: AlertTriangle,
      href: "/alimentos?filtro=por_vencer",
      color: kpi.porVencer > 0 ? "text-amber-600" : "text-emerald-600",
      bg: kpi.porVencer > 0 ? "bg-amber-50" : "bg-emerald-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Resumen operativo del Banco de Alimentos de Bolivia</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
          <TrendingUp className="h-3.5 w-3.5" />
          En tiempo real
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Link key={k.titulo} href={k.href}>
            <Card className="group transition-all hover:shadow-md hover:border-primary/30 cursor-pointer h-full">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.titulo}</p>
                    <p className={`mt-1.5 text-3xl font-bold ${k.color}`}>{k.valor}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{k.desc}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.bg}`}>
                    <k.icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Ver detalle <ArrowUpRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Donaciones por mes */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Donaciones — últimos 6 meses</CardTitle>
            <HintLabel>Clic en una barra para ver las donaciones de ese mes</HintLabel>
          </CardHeader>
          <CardContent>
            {meses.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={meses} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_RED} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_RED} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="donaciones"
                    name="Donaciones"
                    stroke={CHART_RED}
                    strokeWidth={2.5}
                    fill="url(#gradRed)"
                    dot={{
                      fill: CHART_RED, r: 4, strokeWidth: 0,
                      cursor: "pointer",
                    }}
                    activeDot={{
                      r: 6, strokeWidth: 0, cursor: "pointer",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick: (_: unknown, payload: any) => {
                        const fecha = payload?.payload?.fecha as string | undefined;
                        if (fecha) router.push(`/donaciones?filtro=mes&fecha=${fecha}`);
                      },
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Alimentos por categoría — donut */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Alimentos por categoría</CardTitle>
            <HintLabel>Clic en un segmento para filtrar alimentos</HintLabel>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? <EmptyChart /> : (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={categorias}
                      dataKey="value"
                      nameKey="nombre"
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75}
                      paddingAngle={2}
                      onClick={(data) => router.push(`/alimentos?filtro=categoria&id=${(data as unknown as CategoriaData).id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {categorias.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {categorias.slice(0, 4).map((c, i) => (
                    <button
                      key={i}
                      className="flex w-full items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/alimentos?filtro=categoria&id=${c.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{c.nombre}</span>
                      </div>
                      <span className="font-semibold text-foreground">{c.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Top donantes */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top donantes</CardTitle>
            <HintLabel>Clic en una barra para ver las donaciones de ese donante</HintLabel>
          </CardHeader>
          <CardContent>
            {topDonantes.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topDonantes} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category" dataKey="nombre"
                    tick={{ fontSize: 11, fill: "#555" }}
                    axisLine={false} tickLine={false} width={100}
                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="donaciones" name="Donaciones"
                    fill={CHART_RED} radius={[0, 4, 4, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(data) => router.push(`/donaciones?filtro=donante&id=${(data as unknown as DonanteData).id}`)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Estado de productos donados */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Estado de productos donados</CardTitle>
            <HintLabel>Clic en un segmento para filtrar donaciones</HintLabel>
          </CardHeader>
          <CardContent>
            {estados.length === 0 ? <EmptyChart /> : (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={estados}
                      dataKey="value"
                      nameKey="nombre"
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75}
                      paddingAngle={2}
                      onClick={(data) => router.push(`/donaciones?filtro=estado&valor=${(data as unknown as EstadoData).valor}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {estados.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {estados.map((e, i) => (
                    <button
                      key={i}
                      className="flex w-full items-center justify-between text-xs hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/donaciones?filtro=estado&valor=${e.valor}`)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                        <span className="text-muted-foreground">{e.nombre}</span>
                      </div>
                      <span className="font-semibold text-foreground">{e.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos a vencer */}
      {vencimientos.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-800">
                  Alimentos próximos a vencer (7 días)
                </CardTitle>
              </div>
              <Link
                href="/alimentos?filtro=por_vencer"
                className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
              >
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-amber-200">
                    <th className="py-2.5 pl-6 pr-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Alimento</th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Cantidad</th>
                    <th className="py-2.5 px-4 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Vencimiento</th>
                    <th className="py-2.5 pl-4 pr-6 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vencimientos.map((v, i) => (
                    <tr key={i} className="border-t border-amber-100 hover:bg-amber-50">
                      <td className="py-2.5 pl-6 pr-4 font-medium text-foreground">{v.nombre}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{v.cantidad}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {new Date(v.fecha_vencimiento).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5 pl-4 pr-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor(v.diasRestantes)}`}>
                          {v.diasRestantes === 0 ? "Hoy" : v.diasRestantes === 1 ? "Mañana" : `${v.diasRestantes} días`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accesos rápidos */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/alimentos", title: "Registrar Alimento", desc: "Clasificar un nuevo alimento por categoría, peso y fecha" },
          { href: "/donantes", title: "Nuevo Donante", desc: "Registrar una persona u organización como donante" },
          { href: "/donaciones", title: "Registrar Donación", desc: "Registrar una donación con sus alimentos detallados" },
        ].map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="group h-full cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm">
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">{a.title}</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center">
      <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
    </div>
  );
}
