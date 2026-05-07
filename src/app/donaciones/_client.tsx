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
import { getHoyLocal, getFechaFuturaLocal } from "@/lib/utils";

// Formatear fecha directamente del string sin conversión de timezone
function formatearFechaDirecta(fechaStr: string | null): string {
  if (!fechaStr) return "—";
  const [año, mes, día] = fechaStr.split('T')[0].split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${día} ${meses[mes - 1]} ${año}`;
}

type Donante = Database["public"]["Tables"]["donantes"]["Row"];
type Alimento = Database["public"]["Tables"]["alimentos"]["Row"];
type Estado = Database["public"]["Tables"]["estados"]["Row"];
type UnidadMedida = Database["public"]["Tables"]["unidades_medida"]["Row"];

// Tipo extendido para alimentos que incluyen la relación con unidades_medida
interface AlimentoConUnidad extends Alimento {
  unidades_medida?: { nombre: string } | null;
}

interface DetalleDonacion { 
  alimento_id: number; 
  cantidad: number;
  fecha_vencimiento: string | null;
  estado_id: number | null;
}

interface DetalleConAlimento {
  cantidad: number;
  fecha_vencimiento: string | null;
  estado_id: number | null;
  alimentos: {
    nombre: string;
    cantidad: number;
    unidad_medida_id: number | null;
    unidades_medida: { nombre: string } | null;
  } | null;
  estados: { nombre: string } | null;
}

interface DonacionConDetalle {
  id: number;
  fecha_donacion: string;
  donante_id: number | null;
  donantes: { nombre: string } | null;
  detalle_donacion: DetalleConAlimento[];
}

const hoy = getHoyLocal();
const en7 = getFechaFuturaLocal(7);

function calcularPorcentajeProductos(donacion: DonacionConDetalle) {
  const detalles = donacion.detalle_donacion;
  if (detalles.length === 0) return { buenos: 0, malos: 0 };
  
  let totalBueno = 0;
  let totalMalo = 0;
  
  detalles.forEach((d) => {
    const fecha = d.fecha_vencimiento ?? null;
    const estado = d.estados?.nombre;
    
    // Determinar si está vencido o dañado
    const esVencido = estado === "Caducado" || (fecha && fecha < hoy);
    const esDanado = estado && estado.toLowerCase() === "dañado";
    
    if (esVencido || esDanado) {
      totalMalo += d.cantidad;
    } else {
      totalBueno += d.cantidad;
    }
  });
  
  const totalProductos = totalBueno + totalMalo;
  const porcentajeBueno = totalProductos > 0 ? Math.round((totalBueno / totalProductos) * 100) : 0;
  const porcentajeMalo = totalProductos > 0 ? Math.round((totalMalo / totalProductos) * 100) : 0;
  
  return { buenos: porcentajeBueno, malos: porcentajeMalo, totalBueno, totalMalo };
}

function badgeVencimiento(fecha: string | null, estado: { nombre: string } | null) {
  if (!fecha) return null;
  const hoy = getHoyLocal();
  const en7 = getFechaFuturaLocal(7);
  
  if (estado?.nombre === "Caducado") return { label: "Caducado", cls: "bg-red-100 text-red-700" };
  if (fecha < hoy) return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (fecha <= en7) return { label: "Por vencer", cls: "bg-amber-100 text-amber-700" };
  return null;
}

function DonacionRow({ donacion }: { donacion: DonacionConDetalle }) {
  const [abierto, setAbierto] = useState(false);
  const hoy = getHoyLocal();
  const en7 = getFechaFuturaLocal(7);
  
  const tieneAlertaVenc = donacion.detalle_donacion.some((d) => {
    const f = d.fecha_vencimiento ?? null;
    if (d.estados?.nombre === "Caducado") return true;
    return f && f < hoy;
  });

  return (
    <>
      <tr
        className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${tieneAlertaVenc ? "bg-red-50/30" : ""}`}
        onClick={() => setAbierto((v) => !v)}
      >
        <td className="py-3 pl-6 pr-4 w-[80px]">
          <Badge variant="outline">#{donacion.id}</Badge>
        </td>
        <td className="py-3 px-4 font-medium">{donacion.donantes?.nombre ?? "—"}</td>
        <td className="py-3 px-4 text-muted-foreground">
          {(() => {
            const [año, mes, día] = donacion.fecha_donacion.split('T')[0].split('-').map(Number);
            const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            return `${día} de ${meses[mes - 1]} de ${año}`;
          })()}
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {donacion.detalle_donacion.length} producto{donacion.detalle_donacion.length !== 1 ? "s" : ""}
              </span>
              {tieneAlertaVenc && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                  <AlertTriangle className="h-2.5 w-2.5" /> Vencido
                </span>
              )}
            </div>
            {donacion.detalle_donacion.length > 0 && (
              (() => {
                const stats = calcularPorcentajeProductos(donacion);
                return (
                  <div className="flex gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 font-semibold">{stats.buenos}%</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <div className="h-1.5 w-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-semibold">{stats.malos}%</span>
                    </span>
                  </div>
                );
              })()
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
                    <th className="py-2 px-3 text-left font-medium">Vencimiento</th>
                    <th className="py-2 pl-3 pr-4 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {donacion.detalle_donacion.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 pl-4 text-muted-foreground text-xs">Sin detalle registrado.</td>
                    </tr>
                  ) : (
                    donacion.detalle_donacion.map((d, i) => {
                      const alerta = badgeVencimiento(d.fecha_vencimiento ?? null, d.estados);
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
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {formatearFechaDirecta(d.fecha_vencimiento)}
                          </td>
                          <td className="py-2.5 pl-3 pr-4">
                            {d.estados?.nombre ? (
                              <Badge variant={d.estados.nombre === "Caducado" ? "destructive" : "secondary"}>
                                {d.estados.nombre}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              
              {donacion.detalle_donacion.length > 0 && (
                <div className="bg-muted/20 px-4 py-3 border-t">
                  {(() => {
                    const stats = calcularPorcentajeProductos(donacion);
                    return (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">Resumen de estado</p>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-8 bg-green-500 rounded"></div>
                              <span className="text-xs text-muted-foreground">Productos buenos: <span className="font-semibold text-green-700">{stats.buenos}%</span> ({stats.totalBueno})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-8 bg-red-500 rounded"></div>
                              <span className="text-xs text-muted-foreground">Vencidos/Dañados: <span className="font-semibold text-red-700">{stats.malos}%</span> ({stats.totalMalo})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
  const [alimentos, setAlimentos] = useState<AlimentoConUnidad[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [donanteId, setDonanteId] = useState("");
  const [detalles, setDetalles] = useState<DetalleDonacion[]>([{ alimento_id: 0, cantidad: 1, fecha_vencimiento: null, estado_id: null }]);
  const [loading, setLoading] = useState(true);
  const [donaciones, setDonaciones] = useState<DonacionConDetalle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busquedaAlimento, setBusquedaAlimento] = useState<{[key: number]: string}>({});
  const [categorias, setCategorias] = useState<Database["public"]["Tables"]["categorias"]["Row"][]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [dialogNuevoProducto, setDialogNuevoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({nombre: "", categoria_id: "", cantidad: "", unidad_medida_id: ""});

  async function cargarDatos() {
    const [{ data: don }, { data: ali }, { data: est }, { data: donac }, { data: cat }, { data: uni }] = await Promise.all([
      supabase.from("donantes").select("*").order("nombre"),
      supabase.from("alimentos").select("id, nombre, cantidad, unidad_medida_id, categorias(id, nombre), unidades_medida(nombre)").order("nombre"),
      supabase.from("estados").select("*").order("nombre"),
      supabase
        .from("donaciones")
        .select(`
          id,
          fecha_donacion,
          donante_id,
          donantes(nombre),
          detalle_donacion(
            cantidad,
            fecha_vencimiento,
            estado_id,
            alimentos(nombre, cantidad, unidad_medida_id, unidades_medida(nombre)),
            estados(nombre)
          )
        `)
        .order("id", { ascending: false }),
      supabase.from("categorias").select("*").order("nombre"),
      supabase.from("unidades_medida").select("*").order("nombre"),
    ]);
    setDonantes(don ?? []);
    setAlimentos((ali as unknown as AlimentoConUnidad[]) ?? []);
    setEstados(est ?? []);
    setCategorias(cat ?? []);
    setUnidades(uni ?? []);
    setDonaciones((donac as unknown as DonacionConDetalle[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { cargarDatos(); }, []);

  function agregarDetalle() {
    setDetalles([...detalles, { alimento_id: 0, cantidad: 1, fecha_vencimiento: null, estado_id: null }]);
  }
  function actualizarDetalle(index: number, campo: keyof DetalleDonacion, valor: any) {
    const nuevos = [...detalles];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setDetalles(nuevos);
  }
  function eliminarDetalle(index: number) {
    setDetalles(detalles.filter((_, i) => i !== index));
  }

  function obtenerEstadoAutomatico(fecha_vencimiento: string | null): number | null {
    if (!fecha_vencimiento) return null;
    const hoy = getHoyLocal();
    if (fecha_vencimiento <= hoy) {
      // Buscar estado "Caducado"
      const estadoCaducado = estados.find(e => e.nombre.toLowerCase() === "caducado");
      return estadoCaducado?.id ?? null;
    }
    return null;
  }

  function esEstadoNoEditable(fecha_vencimiento: string | null): boolean {
    if (!fecha_vencimiento) return false;
    const hoy = getHoyLocal();
    return fecha_vencimiento <= hoy;
  }

  async function crearNuevoProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoProducto.nombre.trim()) return;
    if (!nuevoProducto.cantidad || Number(nuevoProducto.cantidad) <= 0) return;
    
    try {
      const { data: nuevoAli, error } = await supabase.from("alimentos").insert({
        nombre: nuevoProducto.nombre,
        categoria_id: nuevoProducto.categoria_id ? Number(nuevoProducto.categoria_id) : null,
        cantidad: Number(nuevoProducto.cantidad),
        unidad_medida_id: nuevoProducto.unidad_medida_id ? Number(nuevoProducto.unidad_medida_id) : null,
      }).select().single();
      
      if (error) {
        console.error("Error al registrar producto:", error);
        return;
      }
      
      if (nuevoAli) {
        // Recargar alimentos desde la BD para asegurar sincronización
        const { data: ali } = await supabase.from("alimentos").select("id, nombre, cantidad, unidad_medida_id, categorias(id, nombre), unidades_medida(nombre)").order("nombre");
        setAlimentos((ali as unknown as AlimentoConUnidad[]) ?? []);
        
        setNuevoProducto({nombre: "", categoria_id: "", cantidad: "", unidad_medida_id: ""});
        setDialogNuevoProducto(false);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    }
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
        detallesValidos.map((d) => ({ 
          donacion_id: donacion.id, 
          alimento_id: d.alimento_id, 
          cantidad: d.cantidad,
          fecha_vencimiento: d.fecha_vencimiento || null,
          estado_id: d.estado_id || obtenerEstadoAutomatico(d.fecha_vencimiento)
        }))
      );
    }
    setDonanteId("");
    setDetalles([{ alimento_id: 0, cantidad: 1, fecha_vencimiento: null, estado_id: null }]);
    setBusquedaAlimento({});
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
        const f = det.fecha_vencimiento ?? null;
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
      ? `Mes: ${(() => {
          const [año, mes] = filtroFecha.split('-').map(Number);
          const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
          return `${meses[mes - 1]} de ${año}`;
        })()}`
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
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDialogNuevoProducto(true)}>
                      + Registrar nuevo producto
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={agregarDetalle}>
                      + Agregar donación
                    </Button>
                  </div>
                </div>
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {detalles.map((detalle, i) => {
                    const alimentoSeleccionado = alimentos.find(a => a.id === detalle.alimento_id);
                    const alimentosFiltrados = busquedaAlimento[i]
                      ? alimentos.filter(a => a.nombre.toLowerCase().includes(busquedaAlimento[i].toLowerCase()))
                      : [];
                    const mostrarSugerencias = busquedaAlimento[i] && alimentosFiltrados.length > 0;
                    
                    return (
                      <div key={i} className="rounded-md border bg-muted/30 p-3 space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Producto *</Label>
                          <div className="relative">
                            <Input
                              placeholder="Buscar producto..."
                              value={busquedaAlimento[i] || alimentoSeleccionado?.nombre || ""}
                              onChange={(e) => setBusquedaAlimento({...busquedaAlimento, [i]: e.target.value})}
                              className="text-sm"
                            />
                            {mostrarSugerencias && (
                              <div className="absolute top-full left-0 right-0 mt-1 border bg-white rounded-md shadow-lg z-10">
                                {alimentosFiltrados.slice(0, 5).map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => {
                                      actualizarDetalle(i, "alimento_id", a.id);
                                      setBusquedaAlimento({...busquedaAlimento, [i]: ""});
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                                  >
                                    <div className="font-medium">{a.nombre}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {a.cantidad} {a.unidades_medida?.nombre || ""}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {alimentoSeleccionado && (
                            <div className="text-xs bg-primary/5 border border-primary/20 rounded px-2 py-1">
                              <span className="font-medium">{alimentoSeleccionado.nombre}</span>
                              <span className="text-muted-foreground ml-2">
                                {alimentoSeleccionado.cantidad} {alimentoSeleccionado.unidades_medida?.nombre}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Cantidad donada *</Label>
                            <Input
                              type="number" min={1} value={detalle.cantidad}
                              onChange={(e) => actualizarDetalle(i, "cantidad", Number(e.target.value))}
                              className="text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Vencimiento</Label>
                            <Input
                              type="date"
                              value={detalle.fecha_vencimiento || ""}
                              onChange={(e) => {
                                const nuevaFecha = e.target.value || null;
                                actualizarDetalle(i, "fecha_vencimiento", nuevaFecha);
                                // Si la fecha es pasada, asignar automáticamente estado Caducado
                                if (nuevaFecha) {
                                  const estadoAuto = obtenerEstadoAutomatico(nuevaFecha);
                                  if (estadoAuto !== null) {
                                    actualizarDetalle(i, "estado_id", estadoAuto);
                                  }
                                }
                              }}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Estado</Label>
                          {esEstadoNoEditable(detalle.fecha_vencimiento) ? (
                            <div className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5 text-red-700 font-medium">
                              🚫 Caducado (automático - no editable)
                            </div>
                          ) : (
                            <>
                              <Select
                                value={detalle.estado_id ? String(detalle.estado_id) : ""}
                                onValueChange={(v) => actualizarDetalle(i, "estado_id", v ? Number(v) : null)}
                                items={estados.map((e) => ({ value: String(e.id), label: e.nombre }))}
                              >
                                <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Sin estado</SelectItem>
                                  {estados.map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {detalle.estado_id && estados.find(e => e.id === detalle.estado_id)?.nombre.toLowerCase() === "dañado" && (
                                <p className="text-xs text-amber-600 mt-1">⚠️ Productos dañados no aparecerán en el stock</p>
                              )}
                            </>
                          )}
                        </div>

                        {detalles.length > 1 && (
                          <Button
                            type="button" variant="ghost" size="sm"
                            className="w-full h-7 text-destructive hover:text-destructive text-xs"
                            onClick={() => eliminarDetalle(i)}
                          >✕ Remover</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogNuevoProducto} onOpenChange={setDialogNuevoProducto}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar nuevo producto</DialogTitle>
              <DialogDescription>Agrega un nuevo producto al inventario</DialogDescription>
            </DialogHeader>
            <form onSubmit={crearNuevoProducto} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="np-nombre">Nombre del producto *</Label>
                <Input
                  id="np-nombre"
                  placeholder="Ej: Arroz integral"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np-categoria">Categoría</Label>
                <Select value={nuevoProducto.categoria_id} onValueChange={(v) => setNuevoProducto({...nuevoProducto, categoria_id: v ?? ""})}>
                  <SelectTrigger id="np-categoria">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="np-cantidad">Cantidad *</Label>
                  <Input
                    id="np-cantidad"
                    type="number"
                    placeholder="Ej: 10"
                    value={nuevoProducto.cantidad}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, cantidad: e.target.value})}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="np-unidad">Unidad de medida</Label>
                  <Select value={nuevoProducto.unidad_medida_id} onValueChange={(v) => setNuevoProducto({...nuevoProducto, unidad_medida_id: v ?? ""})}>
                    <SelectTrigger id="np-unidad">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogNuevoProducto(false)}>Cancelar</Button>
                <Button type="submit">Registrar producto</Button>
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

export default function DonacionesClient() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <DonacionesContent />
    </Suspense>
  );
}
