"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, X, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

type Donante = Database["public"]["Tables"]["donantes"]["Row"];
type Alimento = Database["public"]["Tables"]["alimentos"]["Row"];

interface DetalleDonacion { alimento_id: number; cantidad: number }

interface DetalleConAlimento {
  cantidad: number;
  alimentos: {
    nombre: string;
    fecha_vencimiento: string | null;
    unidad_medida_id: number | null;
    unidades_medida: { nombre: string } | null;
  } | null;
}

interface DonacionConDetalle {
  id: number;
  fecha_donacion: string;
  donante_id: number | null;
  donantes: { nombre: string } | null;
  detalle_donacion: DetalleConAlimento[];
}

const hoy = new Date().toISOString().slice(0, 10);
const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

function badgeVencimiento(fecha: string | null) {
  if (!fecha) return null;
  if (fecha < hoy) return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (fecha <= en7) return { label: "Por vencer", cls: "bg-amber-100 text-amber-700" };
  return null;
}

function DonacionRow({ donacion }: { donacion: DonacionConDetalle }) {
  const [abierto, setAbierto] = useState(false);
  const tieneAlertaVenc = donacion.detalle_donacion.some((d) => {
    const f = d.alimentos?.fecha_vencimiento ?? null;
    return f && f <= en7;
  });

  return (
    <>
      <tr
        className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${tieneAlertaVenc ? "bg-amber-50/30" : ""}`}
        onClick={() => setAbierto((v) => !v)}
      >
        <td className="py-3 pl-6 pr-4 w-[80px]">
          <Badge variant="outline">#{donacion.id}</Badge>
        </td>
        <td className="py-3 px-4 font-medium">{donacion.donantes?.nombre ?? "—"}</td>
        <td className="py-3 px-4 text-muted-foreground">
          {new Date(donacion.fecha_donacion).toLocaleDateString("es", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {donacion.detalle_donacion.length} producto{donacion.detalle_donacion.length !== 1 ? "s" : ""}
            </span>
            {tieneAlertaVenc && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <AlertTriangle className="h-2.5 w-2.5" /> Alerta venc.
              </span>
            )}
          </div>
        </td>
        <td className="py-3 pl-4 pr-6 text-muted-foreground">
          {abierto
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </td>
      </tr>

      {abierto && (
        <tr className="border-b bg-muted/20">
          <td colSpan={5} className="pb-3 pt-0">
            <div className="mx-6 mt-2 rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="py-2 pl-4 pr-3 text-left font-medium">Alimento</th>
                    <th className="py-2 px-3 text-right font-medium">Cantidad</th>
                    <th className="py-2 pl-3 pr-4 text-left font-medium">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {donacion.detalle_donacion.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-3 pl-4 text-muted-foreground text-xs">Sin detalle registrado.</td>
                    </tr>
                  ) : (
                    donacion.detalle_donacion.map((d, i) => {
                      const alerta = badgeVencimiento(d.alimentos?.fecha_vencimiento ?? null);
                      return (
                        <tr key={i} className={`border-t ${alerta?.cls.includes("red") ? "bg-red-50/40" : alerta ? "bg-amber-50/40" : ""}`}>
                          <td className="py-2.5 pl-4 pr-3 font-medium text-foreground">
                            {d.alimentos?.nombre ?? "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                            {d.cantidad}
                            {d.alimentos?.unidades_medida?.nombre && (
                              <span className="ml-1 text-xs">{d.alimentos.unidades_medida.nombre}</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-3 pr-4">
                            {d.alimentos?.fecha_vencimiento ? (
                              <div className="flex items-center gap-2">
                                <span className={alerta?.cls.includes("red") ? "text-red-600 font-medium" : alerta ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                                  {new Date(d.alimentos.fecha_vencimiento).toLocaleDateString("es", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })}
                                </span>
                                {alerta && (
                                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${alerta.cls}`}>
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {alerta.label}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DonacionesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtroUrl = searchParams.get("filtro");
  const filtroId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const filtroFecha = searchParams.get("fecha");
  const filtroValor = searchParams.get("valor");

  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [donanteId, setDonanteId] = useState("");
  const [detalles, setDetalles] = useState<DetalleDonacion[]>([{ alimento_id: 0, cantidad: 1 }]);
  const [loading, setLoading] = useState(true);
  const [donaciones, setDonaciones] = useState<DonacionConDetalle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function cargarDatos() {
    const [{ data: don }, { data: ali }, { data: donac }] = await Promise.all([
      supabase.from("donantes").select("*").order("nombre"),
      supabase.from("alimentos").select("*").order("nombre"),
      supabase
        .from("donaciones")
        .select(`
          id,
          fecha_donacion,
          donante_id,
          donantes(nombre),
          detalle_donacion(
            cantidad,
            alimentos(nombre, fecha_vencimiento, unidad_medida_id, unidades_medida(nombre))
          )
        `)
        .order("id", { ascending: false }),
    ]);
    setDonantes(don ?? []);
    setAlimentos(ali ?? []);
    setDonaciones((donac as unknown as DonacionConDetalle[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { cargarDatos(); }, []);

  function agregarDetalle() {
    setDetalles([...detalles, { alimento_id: 0, cantidad: 1 }]);
  }
  function actualizarDetalle(index: number, campo: keyof DetalleDonacion, valor: number) {
    const nuevos = [...detalles];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setDetalles(nuevos);
  }
  function eliminarDetalle(index: number) {
    setDetalles(detalles.filter((_, i) => i !== index));
  }

  async function registrarDonacion(e: React.FormEvent) {
    e.preventDefault();
    const detallesValidos = detalles.filter((d) => d.alimento_id > 0 && d.cantidad > 0);
    if (!donanteId || detallesValidos.length === 0) return;
    const { data: donacion } = await supabase
      .from("donaciones")
      .insert({ donante_id: Number(donanteId) })
      .select("id").single();
    if (donacion) {
      await supabase.from("detalle_donacion").insert(
        detallesValidos.map((d) => ({ donacion_id: donacion.id, alimento_id: d.alimento_id, cantidad: d.cantidad }))
      );
    }
    setDonanteId("");
    setDetalles([{ alimento_id: 0, cantidad: 1 }]);
    setDialogOpen(false);
    cargarDatos();
  }

  /* --- filtrado --- */
  let donacionesFiltradas = donaciones;

  if (filtroUrl === "donante" && filtroId) {
    donacionesFiltradas = donacionesFiltradas.filter((d) => d.donante_id === filtroId);
  } else if (filtroUrl === "mes") {
    if (filtroFecha) {
      donacionesFiltradas = donacionesFiltradas.filter((d) => d.fecha_donacion.startsWith(filtroFecha));
    } else {
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      donacionesFiltradas = donacionesFiltradas.filter((d) => new Date(d.fecha_donacion) >= inicioMes);
    }
  } else if (filtroUrl === "estado" && filtroValor) {
    donacionesFiltradas = donacionesFiltradas.filter((d) =>
      d.detalle_donacion.some((det) => {
        const f = det.alimentos?.fecha_vencimiento ?? null;
        if (filtroValor === "vencido")    return f !== null && f < hoy;
        if (filtroValor === "por_vencer") return f !== null && f >= hoy && f <= en7;
        if (filtroValor === "bueno")      return f === null || f > en7;
        return false;
      })
    );
  }

  const estadoLabel: Record<string, string> = {
    vencido: "Vencido", por_vencer: "Por vencer", bueno: "Bueno",
  };

  const filtroActivo =
    filtroUrl === "donante" && filtroId
      ? `Donante: ${donantes.find((d) => d.id === filtroId)?.nombre ?? filtroId}`
      : filtroUrl === "mes" && filtroFecha
      ? `Mes: ${new Date(filtroFecha + "-01").toLocaleDateString("es", { month: "long", year: "numeric" })}`
      : filtroUrl === "mes"
      ? "Donaciones de este mes"
      : filtroUrl === "estado" && filtroValor
      ? `Estado del producto: ${estadoLabel[filtroValor] ?? filtroValor}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donaciones</h1>
          <p className="text-muted-foreground">
            Registra y visualiza las donaciones de alimentos recibidas.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>+ Nueva Donación</DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Donación</DialogTitle>
              <DialogDescription>
                Selecciona el donante y los alimentos que está donando.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={registrarDonacion} className="space-y-5">
              <div className="space-y-2">
                <Label>Donante *</Label>
                <Select
                  value={donanteId}
                  onValueChange={(v) => setDonanteId(v ?? "")}
                  items={donantes.map((d) => ({ value: String(d.id), label: d.nombre }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar donante" /></SelectTrigger>
                  <SelectContent>
                    {donantes.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Alimentos donados</Label>
                  <Button type="button" variant="outline" size="sm" onClick={agregarDetalle}>
                    + Agregar
                  </Button>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {detalles.map((detalle, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                      <Select
                        value={detalle.alimento_id ? String(detalle.alimento_id) : ""}
                        onValueChange={(v) => actualizarDetalle(i, "alimento_id", Number(v))}
                        items={alimentos.map((a) => ({ value: String(a.id), label: a.nombre }))}
                      >
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Alimento" /></SelectTrigger>
                        <SelectContent>
                          {alimentos.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min={1} value={detalle.cantidad}
                        onChange={(e) => actualizarDetalle(i, "cantidad", Number(e.target.value))}
                        className="w-20"
                      />
                      {detalles.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => eliminarDetalle(i)}
                        >✕</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {filtroActivo && (
        <div className="flex items-center justify-between rounded-lg bg-primary/8 border border-primary/20 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Filter className="h-4 w-4" />
            Filtrando por: <span className="font-semibold">{filtroActivo}</span>
            <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-0">
              {donacionesFiltradas.length} resultado{donacionesFiltradas.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <button
            onClick={() => router.push("/donaciones")}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Quitar filtro
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Historial de Donaciones</CardTitle>
          <CardDescription>
            {donacionesFiltradas.length} de {donaciones.length} donación
            {donaciones.length !== 1 && "es"} — clic en una fila para ver los alimentos donados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando donaciones...</p>
            </div>
          ) : donacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">
                {filtroActivo ? "Sin resultados" : "No hay donaciones"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filtroActivo ? "No hay donaciones con este filtro." : "Registra la primera donación para comenzar."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="py-2.5 pl-6 pr-4 text-left font-medium w-[80px]">N°</th>
                    <th className="py-2.5 px-4 text-left font-medium">Donante</th>
                    <th className="py-2.5 px-4 text-left font-medium">Fecha</th>
                    <th className="py-2.5 px-4 text-left font-medium">Alimentos</th>
                    <th className="py-2.5 pl-4 pr-6 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {donacionesFiltradas.map((d) => (
                    <DonacionRow key={d.id} donacion={d} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DonacionesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <DonacionesContent />
    </Suspense>
  );
}
