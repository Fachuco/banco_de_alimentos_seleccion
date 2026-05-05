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
import { Filter, X } from "lucide-react";

type Donante = Database["public"]["Tables"]["donantes"]["Row"];
type Alimento = Database["public"]["Tables"]["alimentos"]["Row"];

interface DetalleDonacion { alimento_id: number; cantidad: number }

interface DonacionConDonante {
  id: number;
  fecha_donacion: string;
  donante_id: number | null;
  donantes: { nombre: string; id: number } | null;
}

function DonacionesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtroUrl = searchParams.get("filtro");
  const filtroId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const filtroFecha = searchParams.get("fecha"); // "YYYY-MM"

  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [donanteId, setDonanteId] = useState("");
  const [detalles, setDetalles] = useState<DetalleDonacion[]>([{ alimento_id: 0, cantidad: 1 }]);
  const [loading, setLoading] = useState(true);
  const [donaciones, setDonaciones] = useState<DonacionConDonante[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function cargarDatos() {
    const [{ data: don }, { data: ali }, { data: donac }] = await Promise.all([
      supabase.from("donantes").select("*").order("nombre"),
      supabase.from("alimentos").select("*").order("nombre"),
      supabase
        .from("donaciones")
        .select("id, fecha_donacion, donante_id, donantes(nombre, id)")
        .order("id", { ascending: false }),
    ]);
    setDonantes(don ?? []);
    setAlimentos(ali ?? []);
    setDonaciones((donac as DonacionConDonante[]) ?? []);
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
      /* filtro de mes específico desde gráfica */
      donacionesFiltradas = donacionesFiltradas.filter((d) =>
        d.fecha_donacion.startsWith(filtroFecha)
      );
    } else {
      /* mes actual */
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      donacionesFiltradas = donacionesFiltradas.filter(
        (d) => new Date(d.fecha_donacion) >= inicioMes
      );
    }
  }

  /* etiqueta del filtro activo */
  const filtroActivo =
    filtroUrl === "donante" && filtroId
      ? `Donante: ${donantes.find((d) => d.id === filtroId)?.nombre ?? filtroId}`
      : filtroUrl === "mes" && filtroFecha
      ? `Mes: ${new Date(filtroFecha + "-01").toLocaleDateString("es", { month: "long", year: "numeric" })}`
      : filtroUrl === "mes"
      ? "Donaciones de este mes"
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

      {/* Banner filtro activo */}
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
            {donaciones.length !== 1 && "es"} registrada
            {donaciones.length !== 1 && "s"}
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
                {filtroActivo
                  ? "No hay donaciones con este filtro."
                  : "Registra la primera donación para comenzar."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">N°</TableHead>
                  <TableHead>Donante</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donacionesFiltradas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline">#{d.id}</Badge></TableCell>
                    <TableCell className="font-medium">{d.donantes?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(d.fecha_donacion).toLocaleDateString("es", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
