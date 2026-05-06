"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package } from "lucide-react";

interface StockItem {
  alimento_id: number;
  nombre: string;
  cantidad_total: number;
  unidad_medida: string | null;
  categoria: string | null;
  donaciones_count: number;
  cantidad_vencida: number;
  cantidad_por_vencer: number;
  cantidad_buena: number;
}

export default function StockClient() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargarStock() {
    setLoading(true);

    // Obtener todos los detalles de donación con información de alimentos
    const { data: detalles } = await supabase
      .from("detalle_donacion")
      .select(`
        cantidad,
        fecha_vencimiento,
        estado_id,
        alimentos(
          id,
          nombre,
          unidad_medida_id,
          categoria_id,
          categorias(nombre),
          unidades_medida(nombre)
        ),
        estados(nombre)
      `);

    // Obtener categorías
    const { data: cats } = await supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre");
    setCategorias(cats ?? []);

    // Procesar datos
    const stockMap: { [key: number]: StockItem } = {};
    const hoy = new Date().toISOString().slice(0, 10);
    const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    (detalles ?? []).forEach((det) => {
      const ali = det.alimentos as any;
      if (!ali) return;

      const alId = ali.id;
      
      // Determinar si está vencido o dañado
      const estado = (det.estados as any)?.nombre;
      const fecha = det.fecha_vencimiento;
      const esVencido = estado === "Caducado" || (fecha && fecha < hoy);
      const esDanado = estado && estado.toLowerCase() === "dañado";
      
      // Si está vencido o dañado, no lo agregamos al stock
      if (esVencido || esDanado) return;

      if (!stockMap[alId]) {
        stockMap[alId] = {
          alimento_id: alId,
          nombre: ali.nombre,
          cantidad_total: 0,
          unidad_medida: ali.unidades_medida?.nombre || null,
          categoria: ali.categorias?.nombre || null,
          donaciones_count: 0,
          cantidad_vencida: 0,
          cantidad_por_vencer: 0,
          cantidad_buena: 0,
        };
      }

      stockMap[alId].cantidad_total += det.cantidad;
      stockMap[alId].donaciones_count++;

      // Contar por estado/vencimiento
      if (fecha && fecha >= hoy && fecha <= en7) {
        stockMap[alId].cantidad_por_vencer += det.cantidad;
      } else {
        stockMap[alId].cantidad_buena += det.cantidad;
      }
    });

    setStock(Object.values(stockMap).sort((a, b) => b.cantidad_total - a.cantidad_total));
    setLoading(false);
  }

  useEffect(() => {
    cargarStock();
  }, []);

  // Filtrar stock
  let stockFiltrado = stock;

  if (filtroCategoria !== "todas") {
    stockFiltrado = stockFiltrado.filter(
      (s) => s.categoria === categorias.find((c) => c.id === Number(filtroCategoria))?.nombre
    );
  }

  if (busqueda) {
    stockFiltrado = stockFiltrado.filter((s) =>
      s.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  const cantidadTotal = stock.reduce((sum, s) => sum + s.cantidad_total, 0);
  const cantidadPorVencer = stock.reduce((sum, s) => sum + s.cantidad_por_vencer, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock de Alimentos</h1>
        <p className="text-muted-foreground mt-1">
          Inventario consolidado de todos los productos donados.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Total en Stock</p>
                <p className="text-2xl font-bold mt-1">{cantidadTotal}</p>
                <p className="text-xs text-muted-foreground mt-1">{stockFiltrado.length} productos</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cantidadPorVencer > 0 ? "border-amber-200 bg-amber-50/40" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700 uppercase">Por Vencer (7 días)</p>
                <p className={`text-2xl font-bold mt-1 ${cantidadPorVencer > 0 ? "text-amber-600" : ""}`}>
                  {cantidadPorVencer}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Dentro de la próxima semana</p>
              </div>
              {cantidadPorVencer > 0 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
            <Select
              value={filtroCategoria}
              onValueChange={(v) => setFiltroCategoria(v ?? "todas")}
              items={[
                { value: "todas", label: "Todas las categorías" },
                ...categorias.map((c) => ({ value: String(c.id), label: c.nombre })),
              ]}
            >
              <SelectTrigger className="w-full sm:w-48">
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
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Inventario</CardTitle>
          <CardDescription>
            {stockFiltrado.length} de {stock.length} producto{stock.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando stock...</p>
            </div>
          ) : stockFiltrado.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">Sin productos</p>
              <p className="text-sm text-muted-foreground mt-1">
                {busqueda || filtroCategoria !== "todas"
                  ? "No hay productos con estos filtros."
                  : "No hay donaciones registradas aún."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center text-green-700">Bueno</TableHead>
                    <TableHead className="text-center text-amber-700">Por vencer</TableHead>
                    <TableHead className="text-right text-xs">Donaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockFiltrado.map((s) => {
                    const tieneAlerta = s.cantidad_por_vencer > 0;
                    return (
                      <TableRow
                        key={s.alimento_id}
                        className={tieneAlerta ? "bg-amber-50/50" : ""}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <p>{s.nombre}</p>
                            {s.unidad_medida && (
                              <p className="text-xs text-muted-foreground">{s.unidad_medida}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.categoria ? (
                            <Badge variant="secondary">{s.categoria}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {s.cantidad_total}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.cantidad_buena > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {s.cantidad_buena}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.cantidad_por_vencer > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 border-0">
                              {s.cantidad_por_vencer}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {s.donaciones_count}
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
