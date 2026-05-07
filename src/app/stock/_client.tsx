"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, ChevronDown, ChevronRight } from "lucide-react";
import { getHoyLocal, getFechaFuturaLocal } from "@/lib/utils";

// Formatear fecha directamente del string sin conversión de timezone
function formatearFechaDirecta(fechaStr: string | null): string {
  if (!fechaStr) return "—";
  const [año, mes, día] = fechaStr.split('T')[0].split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${día} ${meses[mes - 1]} ${año}`;
}

// Calcular días hasta vencimiento
function diasHasta(fechaVencimiento: string | null, hoyLocal: string): number {
  if (!fechaVencimiento) return 999;
  const fechaStr = fechaVencimiento.split('T')[0];
  if (fechaStr === hoyLocal) return 0;
  const [añoF, mesF, díaF] = fechaStr.split('-').map(Number);
  const [añoH, mesH, díaH] = hoyLocal.split('-').map(Number);
  const fDate = new Date(Date.UTC(añoF, mesF - 1, díaF, 12, 0, 0));
  const hDate = new Date(Date.UTC(añoH, mesH - 1, díaH, 12, 0, 0));
  return Math.ceil((fDate.getTime() - hDate.getTime()) / 86400000);
}

interface DetalleStock {
  id: number;
  cantidad: number;
  fecha_vencimiento: string | null;
  fecha_donacion: string;
  donante: string | null;
  estado: string | null;
}

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
  detalles: DetalleStock[];
}

export default function StockClient() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState<number[]>([]);

  async function cargarStock() {
    setLoading(true);

    // Obtener TODOS los detalles primero para obtener la fecha de hoy
    const hoy = getHoyLocal();
    const { data: detalles } = await supabase
      .from("detalle_donacion")
      .select(`
        id,
        cantidad,
        fecha_vencimiento,
        estado_id,
        donaciones(fecha_donacion, donante_id, donantes(nombre)),
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
    const en7 = getFechaFuturaLocal(7);

    (detalles ?? []).forEach((det: any) => {
      // Validaciones básicas
      const ali = det.alimentos;
      if (!ali || !ali.id) return;

      const alId = ali.id;
      const estado = det.estados?.nombre || null;
      const estadoId = det.estado_id;
      const fecha = det.fecha_vencimiento;

      // 1. EXCLUIR si está Dañado (estado_id = 3)
      if (estadoId === 3) {
        return;
      }

      // 2. EXCLUIR si está vencido (fecha < hoy)
      if (fecha) {
        const fechaStr = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
        if (fechaStr < hoy) {
          return;
        }
      }

      // Si pasó los filtros, agregarlo al stock
      if (!stockMap[alId]) {
        stockMap[alId] = {
          alimento_id: alId,
          nombre: ali.nombre || 'Sin nombre',
          cantidad_total: 0,
          unidad_medida: ali.unidades_medida?.nombre || null,
          categoria: ali.categorias?.nombre || null,
          donaciones_count: 0,
          cantidad_vencida: 0,
          cantidad_por_vencer: 0,
          cantidad_buena: 0,
          detalles: [],
        };
      }

      // Agregar detalles
      const donacion = det.donaciones || {};
      const donante = donacion.donantes?.nombre || 'Donante anónimo';
      
      stockMap[alId].detalles.push({
        id: det.id,
        cantidad: det.cantidad,
        fecha_vencimiento: fecha,
        fecha_donacion: donacion.fecha_donacion,
        donante,
        estado: estado,
      });

      // Actualizar contadores
      stockMap[alId].cantidad_total += det.cantidad;
      stockMap[alId].donaciones_count++;

      // Determinar si es por vencer (entre hoy y 7 días)
      if (fecha) {
        const fechaStr = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
        if (fechaStr >= hoy && fechaStr <= en7) {
          stockMap[alId].cantidad_por_vencer += det.cantidad;
        } else {
          stockMap[alId].cantidad_buena += det.cantidad;
        }
      }
      else if (estado === "Próximo a vencer") {
        stockMap[alId].cantidad_por_vencer += det.cantidad;
      } 
      else {
        // Sin fecha, se considera bueno
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
                    <TableHead className="w-8"></TableHead>
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
                    const estaExpandido = expandidos.includes(s.alimento_id);
                    return [
                      <TableRow
                        key={`main-${s.alimento_id}`}
                        className={`cursor-pointer hover:bg-muted/30 ${tieneAlerta ? "bg-amber-50/50" : ""}`}
                        onClick={() => setExpandidos(estaExpandido ? expandidos.filter(id => id !== s.alimento_id) : [...expandidos, s.alimento_id])}
                      >
                        <TableCell className="w-8">
                          {estaExpandido ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
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
                      </TableRow>,
                      estaExpandido && (
                        <TableRow key={`details-${s.alimento_id}`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4 bg-white">
                              <p className="text-sm font-semibold mb-3 text-foreground">Detalle de donaciones</p>
                              <div className="overflow-x-auto">
                                <Table className="text-sm">
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs py-2">Donante</TableHead>
                                      <TableHead className="text-xs py-2">Cantidad</TableHead>
                                      <TableHead className="text-xs py-2">Fecha Donación</TableHead>
                                      <TableHead className="text-xs py-2">Fecha Vencimiento</TableHead>
                                      <TableHead className="text-xs py-2">Estado</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {s.detalles.map((det) => {
                                      const hoy = getHoyLocal();
                                      const dias = diasHasta(det.fecha_vencimiento, hoy);
                                      const esProximoVencer = (dias >= 0 && dias <= 7 && det.estado !== "Caducado" && det.estado?.toLowerCase() !== "dañado") || det.estado === "Próximo a vencer";
                                      
                                      return (
                                        <TableRow key={det.id} className="border-gray-100">
                                          <TableCell className="py-2">{det.donante}</TableCell>
                                          <TableCell className="py-2">{det.cantidad}</TableCell>
                                          <TableCell className="py-2 text-xs text-muted-foreground">
                                            {formatearFechaDirecta(det.fecha_donacion)}
                                          </TableCell>
                                          <TableCell className="py-2 text-xs text-muted-foreground">
                                            {formatearFechaDirecta(det.fecha_vencimiento)}
                                          </TableCell>
                                          <TableCell className="py-2">
                                            {esProximoVencer ? (
                                              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Próximo a vencer</Badge>
                                            ) : !det.estado ? (
                                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Bueno</Badge>
                                            ) : det.estado === "Caducado" ? (
                                              <Badge className="bg-red-100 text-red-700 border-0 text-xs">Caducado</Badge>
                                            ) : det.estado.toLowerCase() === "dañado" ? (
                                              <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Dañado</Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-xs">{det.estado}</Badge>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ),
                    ].filter(Boolean);
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
