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
import { AlertTriangle, X, Filter, Edit2, Trash2 } from "lucide-react";

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
  const [cantidad, setCantidad] = useState("");
  const [unidadMedidaId, setUnidadMedidaId] = useState("");

  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editCantidad, setEditCantidad] = useState("");
  const [editUnidadMedidaId, setEditUnidadMedidaId] = useState("");

  async function cargarDatos() {
    const [{ data: ali }, { data: cat }, { data: uni }] =
      await Promise.all([
        supabase.from("alimentos").select("*").order("nombre", { ascending: true }),
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("unidades_medida").select("*").order("nombre"),
      ]);
    setAlimentos(ali ?? []);
    setCategorias(cat ?? []);
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
      cantidad: Number(cantidad),
      unidad_medida_id: unidadMedidaId ? Number(unidadMedidaId) : null,
    });
    setNombre(""); 
    setCategoriaId("");
    setCantidad(""); 
    setUnidadMedidaId("");
    setDialogOpen(false);
    cargarDatos();
  }

  async function eliminarAlimento(id: number) {
    await supabase.from("alimentos").delete().eq("id", id);
    setEliminandoId(null);
    cargarDatos();
  }

  function abrirEdicion(a: Alimento) {
    setEditandoId(a.id);
    setEditNombre(a.nombre);
    setEditCategoriaId(a.categoria_id ? String(a.categoria_id) : "");
    setEditCantidad(String(a.cantidad));
    setEditUnidadMedidaId(a.unidad_medida_id ? String(a.unidad_medida_id) : "");
  }

  function cerrarEdicion() {
    setEditandoId(null);
    setEditNombre("");
    setEditCategoriaId("");
    setEditCantidad("");
    setEditUnidadMedidaId("");
  }

  async function guardarEdicion() {
    if (!editandoId) return;
    await supabase.from("alimentos").update({
      nombre: editNombre,
      categoria_id: editCategoriaId ? Number(editCategoriaId) : null,
      cantidad: Number(editCantidad),
      unidad_medida_id: editUnidadMedidaId ? Number(editUnidadMedidaId) : null,
    }).eq("id", editandoId);
    cerrarEdicion();
    cargarDatos();
  }

  function limpiarFiltroUrl() {
    router.push("/alimentos");
    setFiltroCategoria("todas");
  }

  /* --- filtrado --- */
  let alimentosFiltrados = alimentos;

  /* filtro desde URL */
  if (filtroUrl === "categoria" && filtroId) {
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
    filtroUrl === "categoria" && filtroId
      ? `Categoría: ${categorias.find((c) => c.id === filtroId)?.nombre ?? filtroId}`
      : null;

  function getNombreCategoria(id: number | null) {
    return categorias.find((c) => c.id === id)?.nombre ?? null;
  }
  function getNombreUnidad(id: number | null) {
    return unidades.find((u) => u.id === id)?.nombre ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alimentos</h1>
          <p className="text-muted-foreground">
            Registra los productos del banco de alimentos con nombre, categoría, cantidad y unidad de medida.
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
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-center">Unidades de Medida</TableHead>
                    <TableHead className="w-[80px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alimentosFiltrados.map((a) => {
                    const cat = getNombreCategoria(a.categoria_id);
                    const uni = getNombreUnidad(a.unidad_medida_id);

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.nombre}</TableCell>
                        <TableCell>
                          {cat ? <Badge variant="secondary">{cat}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center font-mono">{a.cantidad}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {uni ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Dialog open={editandoId === a.id} onOpenChange={(open) => {
                              if (open) abrirEdicion(a);
                              else cerrarEdicion();
                            }}>
                              <DialogTrigger render={<Button variant="ghost" size="sm" className="p-1 h-8 w-8" />}>
                                <Edit2 className="h-4 w-4 text-blue-600 hover:text-blue-700" />
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Editar Alimento</DialogTitle>
                                  <DialogDescription>Actualiza los datos del alimento.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Nombre del alimento *</Label>
                                    <Input
                                      value={editNombre}
                                      onChange={(e) => setEditNombre(e.target.value)}
                                      placeholder="Ej: Arroz integral, Leche en polvo..."
                                      required
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Categoría</Label>
                                      <Select
                                        value={editCategoriaId}
                                        onValueChange={(v) => setEditCategoriaId(v ?? "")}
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
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Cantidad *</Label>
                                      <Input
                                        type="number" min={1} value={editCantidad}
                                        onChange={(e) => setEditCantidad(e.target.value)}
                                        placeholder="Ej: 10" required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Unidad de Medida</Label>
                                      <Select
                                        value={editUnidadMedidaId}
                                        onValueChange={(v) => setEditUnidadMedidaId(v ?? "")}
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
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={cerrarEdicion}>
                                    Cancelar
                                  </Button>
                                  <Button type="submit" onClick={guardarEdicion}>Guardar cambios</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={eliminandoId === a.id} onOpenChange={(open) => setEliminandoId(open ? a.id : null)}>
                              <DialogTrigger render={<Button variant="ghost" size="sm" className="p-1 h-8 w-8" />}>
                                <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
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
                          </div>
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

export default function AlimentosClient() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <AlimentosContent />
    </Suspense>
  );
}
