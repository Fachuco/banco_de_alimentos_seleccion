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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, X, Filter } from "lucide-react";

type Alimento = Database["public"]["Tables"]["alimentos"]["Row"];
type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
type Estado = Database["public"]["Tables"]["estados"]["Row"];
type UnidadMedida = Database["public"]["Tables"]["unidades_medida"]["Row"];

function AlimentosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtroUrl = searchParams.get("filtro");
  const filtroId = searchParams.get("id") ? Number(searchParams.get("id")) : null;

  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidadMedidaId, setUnidadMedidaId] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  /* validación de fecha vencida */
  const esVencido = fechaVencimiento
    ? new Date(fechaVencimiento) < new Date(new Date().toDateString())
    : false;
  const venceProximo =
    fechaVencimiento && !esVencido
      ? (new Date(fechaVencimiento).getTime() - Date.now()) / 86400000 <= 7
      : false;

  async function cargarDatos() {
    const [{ data: ali }, { data: cat }, { data: est }, { data: uni }] =
      await Promise.all([
        supabase.from("alimentos").select("*").order("id", { ascending: false }),
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("estados").select("*").order("nombre"),
        supabase.from("unidades_medida").select("*").order("nombre"),
      ]);
    setAlimentos(ali ?? []);
    setCategorias(cat ?? []);
    setEstados(est ?? []);
    setUnidades(uni ?? []);
    setLoading(false);
  }

  useEffect(() => { cargarDatos(); }, []);

  /* sincronizar filtro URL → select de categoría */
  useEffect(() => {
    if (filtroUrl === "categoria" && filtroId) {
      setFiltroCategoria(String(filtroId));
    }
  }, [filtroUrl, filtroId]);

  async function agregarAlimento(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("alimentos").insert({
      nombre,
      categoria_id: categoriaId ? Number(categoriaId) : null,
      estado_id: estadoId ? Number(estadoId) : null,
      cantidad: Number(cantidad),
      unidad_medida_id: unidadMedidaId ? Number(unidadMedidaId) : null,
      fecha_vencimiento: fechaVencimiento || null,
    });
    setNombre(""); setCategoriaId(""); setEstadoId("");
    setCantidad(""); setUnidadMedidaId(""); setFechaVencimiento("");
    setDialogOpen(false);
    cargarDatos();
  }

  async function eliminarAlimento(id: number) {
    await supabase.from("alimentos").delete().eq("id", id);
    setEliminandoId(null);
    cargarDatos();
  }

  function limpiarFiltroUrl() {
    router.push("/alimentos");
    setFiltroCategoria("todas");
  }

  /* --- filtrado --- */
  const hoy = new Date().toISOString().slice(0, 10);
  const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  let alimentosFiltrados = alimentos;

  /* filtro desde URL */
  if (filtroUrl === "por_vencer") {
    alimentosFiltrados = alimentosFiltrados.filter(
      (a) => a.fecha_vencimiento && a.fecha_vencimiento >= hoy && a.fecha_vencimiento <= en30
    );
  } else if (filtroUrl === "estado" && filtroId) {
    alimentosFiltrados = alimentosFiltrados.filter((a) => a.estado_id === filtroId);
  } else if (filtroUrl === "categoria" && filtroId) {
    alimentosFiltrados = alimentosFiltrados.filter((a) => a.categoria_id === filtroId);
  } else {
    /* filtro de la UI (select) */
    if (filtroCategoria !== "todas") {
      alimentosFiltrados = alimentosFiltrados.filter(
        (a) => a.categoria_id === Number(filtroCategoria)
      );
    }
  }

  /* búsqueda de texto siempre activa */
  if (busqueda) {
    alimentosFiltrados = alimentosFiltrados.filter((a) =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  /* etiqueta del filtro activo */
  const filtroActivo =
    filtroUrl === "por_vencer"
      ? "Próximos a vencer (30 días)"
      : filtroUrl === "estado" && filtroId
      ? `Estado: ${estados.find((e) => e.id === filtroId)?.nombre ?? filtroId}`
      : filtroUrl === "categoria" && filtroId
      ? `Categoría: ${categorias.find((c) => c.id === filtroId)?.nombre ?? filtroId}`
      : null;

  function getNombreCategoria(id: number | null) {
    return categorias.find((c) => c.id === id)?.nombre ?? null;
  }
  function getNombreEstado(id: number | null) {
    return estados.find((e) => e.id === id)?.nombre ?? null;
  }
  function getNombreUnidad(id: number | null) {
    return unidades.find((u) => u.id === id)?.nombre ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Selección de Alimentos</h1>
          <p className="text-muted-foreground">
            Clasifica los alimentos recibidos por categoría, peso y fecha de vencimiento.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>+ Nuevo Alimento</DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Alimento</DialogTitle>
              <DialogDescription>Clasifica el alimento ingresando sus datos.</DialogDescription>
            </DialogHeader>
            <form onSubmit={agregarAlimento} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del alimento *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Arroz integral, Leche en polvo..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={categoriaId}
                    onValueChange={(v) => setCategoriaId(v ?? "")}
                    items={categorias.map((c) => ({ value: String(c.id), label: c.nombre }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={estadoId}
                    onValueChange={(v) => setEstadoId(v ?? "")}
                    items={estados.map((e) => ({ value: String(e.id), label: e.nombre }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {estados.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad *</Label>
                  <Input
                    type="number" min={1} value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej: 10" required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Select
                    value={unidadMedidaId}
                    onValueChange={(v) => setUnidadMedidaId(v ?? "")}
                    items={unidades.map((u) => ({ value: String(u.id), label: u.nombre }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className={esVencido ? "border-red-500 focus-visible:ring-red-300" : ""}
                />
                {esVencido && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Fecha ya vencida</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Este alimento ya está vencido. Considera marcarlo con un estado apropiado (ej: Vencido o No apto).
                      </p>
                    </div>
                  </div>
                )}
                {venceProximo && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">Vence en menos de 7 días. Priorizar su distribución.</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Banner filtro activo desde URL */}
      {filtroActivo && (
        <div className="flex items-center justify-between rounded-lg bg-primary/8 border border-primary/20 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Filter className="h-4 w-4" />
            Filtrando por: <span className="font-semibold">{filtroActivo}</span>
            <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-0">
              {alimentosFiltrados.length} resultado{alimentosFiltrados.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <button
            onClick={limpiarFiltroUrl}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Quitar filtro
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Inventario de Alimentos</CardTitle>
              <CardDescription>
                {alimentosFiltrados.length} de {alimentos.length} alimento
                {alimentos.length !== 1 && "s"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar alimento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-48"
              />
              {/* Ocultar select de categoría cuando hay filtro URL activo */}
              {!filtroUrl && (
                <Select
                  value={filtroCategoria}
                  onValueChange={(v) => setFiltroCategoria(v ?? "todas")}
                  items={[
                    { value: "todas", label: "Todas las categorías" },
                    ...categorias.map((c) => ({ value: String(c.id), label: c.nombre })),
                  ]}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando alimentos...</p>
            </div>
          ) : alimentosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">
                {busqueda || filtroCategoria !== "todas" || filtroUrl ? "Sin resultados" : "No hay alimentos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {busqueda || filtroCategoria !== "todas" || filtroUrl
                  ? "Intenta con otros filtros."
                  : "Registra tu primer alimento para comenzar."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alimentosFiltrados.map((a) => {
                    const cat = getNombreCategoria(a.categoria_id);
                    const est = getNombreEstado(a.estado_id);
                    const uni = getNombreUnidad(a.unidad_medida_id);
                    const vencido = a.fecha_vencimiento && a.fecha_vencimiento < hoy;
                    const proximoVencer =
                      a.fecha_vencimiento &&
                      a.fecha_vencimiento >= hoy &&
                      a.fecha_vencimiento <= en30;

                    return (
                      <TableRow key={a.id} className={vencido ? "bg-red-50/50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {a.nombre}
                            {vencido && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                <AlertTriangle className="h-2.5 w-2.5" /> VENCIDO
                              </span>
                            )}
                            {proximoVencer && !vencido && (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Por vencer
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cat ? <Badge variant="secondary">{cat}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {est ? <Badge variant="outline">{est}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {a.cantidad}
                          {uni && <span className="ml-1 text-xs text-muted-foreground">{uni}</span>}
                        </TableCell>
                        <TableCell>
                          {a.fecha_vencimiento ? (
                            <span className={`text-sm ${vencido ? "text-red-600 font-medium" : ""}`}>
                              {new Date(a.fecha_vencimiento).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(a.fecha_ingreso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={eliminandoId === a.id} onOpenChange={(open) => setEliminandoId(open ? a.id : null)}>
                            <DialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}>
                              Eliminar
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar eliminación</DialogTitle>
                                <DialogDescription>
                                  ¿Estás seguro de eliminar <strong>{a.nombre}</strong>? Esta acción no se puede deshacer.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEliminandoId(null)}>Cancelar</Button>
                                <Button variant="destructive" onClick={() => eliminarAlimento(a.id)}>Eliminar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AlimentosPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <AlimentosContent />
    </Suspense>
  );
}
