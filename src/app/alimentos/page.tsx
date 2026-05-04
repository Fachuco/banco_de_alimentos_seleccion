"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Alimento = Database["public"]["Tables"]["alimentos"]["Row"];
type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
type Estado = Database["public"]["Tables"]["estados"]["Row"];
type UnidadMedida = Database["public"]["Tables"]["unidades_medida"]["Row"];

export default function AlimentosPage() {
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

  async function cargarDatos() {
    const [{ data: ali }, { data: cat }, { data: est }, { data: uni }] =
      await Promise.all([
        supabase
          .from("alimentos")
          .select("*")
          .order("id", { ascending: false }),
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

  useEffect(() => {
    cargarDatos();
  }, []);

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
    setNombre("");
    setCategoriaId("");
    setEstadoId("");
    setCantidad("");
    setUnidadMedidaId("");
    setFechaVencimiento("");
    setDialogOpen(false);
    cargarDatos();
  }

  async function eliminarAlimento(id: number) {
    await supabase.from("alimentos").delete().eq("id", id);
    setEliminandoId(null);
    cargarDatos();
  }

  const alimentosFiltrados = alimentos
    .filter((a) =>
      filtroCategoria !== "todas"
        ? a.categoria_id === Number(filtroCategoria)
        : true
    )
    .filter((a) =>
      busqueda ? a.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
    );

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
          <h1 className="text-2xl font-bold tracking-tight">
            Selección de Alimentos
          </h1>
          <p className="text-muted-foreground">
            Clasifica los alimentos recibidos por categoría, peso y fecha de
            vencimiento.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            + Nuevo Alimento
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Alimento</DialogTitle>
              <DialogDescription>
                Clasifica el alimento ingresando sus datos.
              </DialogDescription>
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={estadoId}
                    onValueChange={(v) => setEstadoId(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej: 10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Select
                    value={unidadMedidaId}
                    onValueChange={(v) => setUnidadMedidaId(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.nombre}
                        </SelectItem>
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
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Inventario de Alimentos
              </CardTitle>
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
              <Select
                value={filtroCategoria}
                onValueChange={(v) => setFiltroCategoria(v ?? "todas")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {busqueda || filtroCategoria !== "todas"
                  ? "Sin resultados"
                  : "No hay alimentos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {busqueda || filtroCategoria !== "todas"
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
                    <TableHead className="w-[100px] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alimentosFiltrados.map((a) => {
                    const cat = getNombreCategoria(a.categoria_id);
                    const est = getNombreEstado(a.estado_id);
                    const uni = getNombreUnidad(a.unidad_medida_id);

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.nombre}
                        </TableCell>
                        <TableCell>
                          {cat ? (
                            <Badge variant="secondary">{cat}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {est ? (
                            <Badge variant="outline">{est}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {a.cantidad}
                          {uni && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {uni}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.fecha_vencimiento ? (
                            <span className="text-sm">
                              {new Date(
                                a.fecha_vencimiento
                              ).toLocaleDateString("es", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(a.fecha_ingreso).toLocaleDateString("es", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog
                            open={eliminandoId === a.id}
                            onOpenChange={(open) =>
                              setEliminandoId(open ? a.id : null)
                            }
                          >
                            <DialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}>
                              Eliminar
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Confirmar eliminación
                                </DialogTitle>
                                <DialogDescription>
                                  ¿Estás seguro de eliminar{" "}
                                  <strong>{a.nombre}</strong>? Esta acción no se
                                  puede deshacer.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setEliminandoId(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => eliminarAlimento(a.id)}
                                >
                                  Eliminar
                                </Button>
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
