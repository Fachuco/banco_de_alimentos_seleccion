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

type Donante = Database["public"]["Tables"]["donantes"]["Row"];
type Alimento = Database["public"]["Tables"]["alimentos"]["Row"];

interface DetalleDonacion {
  alimento_id: number;
  cantidad: number;
}

interface DonacionConDonante {
  id: number;
  fecha_donacion: string;
  donantes: { nombre: string } | null;
}

export default function DonacionesPage() {
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [donanteId, setDonanteId] = useState("");
  const [detalles, setDetalles] = useState<DetalleDonacion[]>([
    { alimento_id: 0, cantidad: 1 },
  ]);
  const [loading, setLoading] = useState(true);
  const [donaciones, setDonaciones] = useState<DonacionConDonante[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function cargarDatos() {
    const [{ data: don }, { data: ali }, { data: donac }] = await Promise.all([
      supabase.from("donantes").select("*").order("nombre"),
      supabase.from("alimentos").select("*").order("nombre"),
      supabase
        .from("donaciones")
        .select("id, fecha_donacion, donantes(nombre)")
        .order("id", { ascending: false }),
    ]);
    setDonantes(don ?? []);
    setAlimentos(ali ?? []);
    setDonaciones((donac as DonacionConDonante[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function agregarDetalle() {
    setDetalles([...detalles, { alimento_id: 0, cantidad: 1 }]);
  }

  function actualizarDetalle(
    index: number,
    campo: keyof DetalleDonacion,
    valor: number
  ) {
    const nuevos = [...detalles];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setDetalles(nuevos);
  }

  function eliminarDetalle(index: number) {
    setDetalles(detalles.filter((_, i) => i !== index));
  }

  async function registrarDonacion(e: React.FormEvent) {
    e.preventDefault();
    const detallesValidos = detalles.filter(
      (d) => d.alimento_id > 0 && d.cantidad > 0
    );
    if (!donanteId || detallesValidos.length === 0) return;

    const { data: donacion } = await supabase
      .from("donaciones")
      .insert({ donante_id: Number(donanteId) })
      .select("id")
      .single();

    if (donacion) {
      await supabase.from("detalle_donacion").insert(
        detallesValidos.map((d) => ({
          donacion_id: donacion.id,
          alimento_id: d.alimento_id,
          cantidad: d.cantidad,
        }))
      );
    }

    setDonanteId("");
    setDetalles([{ alimento_id: 0, cantidad: 1 }]);
    setDialogOpen(false);
    cargarDatos();
  }

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
          <DialogTrigger render={<Button />}>
            + Nueva Donación
          </DialogTrigger>
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar donante" />
                  </SelectTrigger>
                  <SelectContent>
                    {donantes.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Alimentos donados</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarDetalle}
                  >
                    + Agregar
                  </Button>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {detalles.map((detalle, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                    >
                      <Select
                        value={
                          detalle.alimento_id
                            ? String(detalle.alimento_id)
                            : ""
                        }
                        onValueChange={(v) =>
                          actualizarDetalle(i, "alimento_id", Number(v))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Alimento" />
                        </SelectTrigger>
                        <SelectContent>
                          {alimentos.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={detalle.cantidad}
                        onChange={(e) =>
                          actualizarDetalle(
                            i,
                            "cantidad",
                            Number(e.target.value)
                          )
                        }
                        className="w-20"
                      />
                      {detalles.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => eliminarDetalle(i)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Historial de Donaciones</CardTitle>
          <CardDescription>
            {donaciones.length} donación{donaciones.length !== 1 && "es"}{" "}
            registrada{donaciones.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando donaciones...</p>
            </div>
          ) : donaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">No hay donaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Registra la primera donación para comenzar.
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
                {donaciones.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline">#{d.id}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {d.donantes?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(d.fecha_donacion).toLocaleDateString("es", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
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
