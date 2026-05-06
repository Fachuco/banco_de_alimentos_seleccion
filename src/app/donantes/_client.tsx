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

export default function DonantesClient() {
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [numeroContacto, setNumeroContacto] = useState("");
  const [ci, setCi] = useState("");
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  async function cargarDonantes() {
    const { data } = await supabase
      .from("donantes")
      .select("*")
      .order("id", { ascending: false });
    setDonantes(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargarDonantes();
  }, []);

  async function agregarDonante(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("donantes").insert({
      nombre,
      razon_social: razonSocial || null,
      numero_contacto: numeroContacto || null,
      ci: ci || null,
    });
    setNombre("");
    setRazonSocial("");
    setNumeroContacto("");
    setCi("");
    setDialogOpen(false);
    cargarDonantes();
  }

  async function eliminarDonante(id: number) {
    await supabase.from("donantes").delete().eq("id", id);
    setEliminandoId(null);
    cargarDonantes();
  }

  const donantesFiltrados = busqueda
    ? donantes.filter(
        (d) =>
          d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          d.ci?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : donantes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donantes</h1>
          <p className="text-muted-foreground">
            Gestiona las personas y organizaciones que donan alimentos.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            + Nuevo Donante
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Donante</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo donante.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={agregarDonante} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razon">Razón Social</Label>
                <Input
                  id="razon"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Nombre de la empresa (opcional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contacto">Contacto</Label>
                  <Input
                    id="contacto"
                    value={numeroContacto}
                    onChange={(e) => setNumeroContacto(e.target.value)}
                    placeholder="Teléfono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ci">CI</Label>
                  <Input
                    id="ci"
                    value={ci}
                    onChange={(e) => setCi(e.target.value)}
                    placeholder="Cédula de identidad"
                  />
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
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lista de Donantes</CardTitle>
              <CardDescription>
                {donantes.length} donante{donantes.length !== 1 && "s"}{" "}
                registrado{donantes.length !== 1 && "s"}
              </CardDescription>
            </div>
            <Input
              placeholder="Buscar por nombre o CI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando donantes...</p>
            </div>
          ) : donantesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">
                {busqueda ? "Sin resultados" : "No hay donantes"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {busqueda
                  ? "Intenta con otro término de búsqueda."
                  : "Registra tu primer donante para comenzar."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>CI</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donantesFiltrados.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nombre}</TableCell>
                    <TableCell>
                      {d.razon_social ? (
                        <Badge variant="secondary">{d.razon_social}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{d.numero_contacto ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {d.ci ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog
                        open={eliminandoId === d.id}
                        onOpenChange={(open) =>
                          setEliminandoId(open ? d.id : null)
                        }
                      >
                        <DialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}>
                          Eliminar
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmar eliminación</DialogTitle>
                            <DialogDescription>
                              ¿Estás seguro de eliminar a{" "}
                              <strong>{d.nombre}</strong>? Esta acción no se
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
                              onClick={() => eliminarDonante(d.id)}
                            >
                              Eliminar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
