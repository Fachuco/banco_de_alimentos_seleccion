"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface Stats {
  alimentos: number;
  donantes: number;
  donaciones: number;
  categorias: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    alimentos: 0,
    donantes: 0,
    donaciones: 0,
    categorias: 0,
  });

  useEffect(() => {
    async function cargar() {
      const [ali, don, donac, cat] = await Promise.all([
        supabase.from("alimentos").select("id", { count: "exact", head: true }),
        supabase.from("donantes").select("id", { count: "exact", head: true }),
        supabase
          .from("donaciones")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("categorias")
          .select("id", { count: "exact", head: true }),
      ]);
      setStats({
        alimentos: ali.count ?? 0,
        donantes: don.count ?? 0,
        donaciones: donac.count ?? 0,
        categorias: cat.count ?? 0,
      });
    }
    cargar();
  }, []);

  const tarjetas = [
    {
      titulo: "Alimentos",
      valor: stats.alimentos,
      descripcion: "registrados en el sistema",
      href: "/alimentos",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Donantes",
      valor: stats.donantes,
      descripcion: "personas u organizaciones",
      href: "/donantes",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      titulo: "Donaciones",
      valor: stats.donaciones,
      descripcion: "recibidas en total",
      href: "/donaciones",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      titulo: "Categorías",
      valor: stats.categorias,
      descripcion: "de clasificación",
      href: "/alimentos",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const accesos = [
    {
      titulo: "Registrar Alimento",
      descripcion:
        "Clasificar un nuevo alimento por categoría, peso y fecha de vencimiento",
      href: "/alimentos",
    },
    {
      titulo: "Nuevo Donante",
      descripcion: "Registrar una persona u organización como donante",
      href: "/donantes",
    },
    {
      titulo: "Registrar Donación",
      descripcion: "Registrar una donación con sus alimentos detallados",
      href: "/donaciones",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de Selección
        </h1>
        <p className="mt-1 text-muted-foreground">
          Gestiona la recepción y clasificación de alimentos donados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href}>
            <Card className="transition hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t.titulo}
                    </p>
                    <p className={`mt-1 text-3xl font-bold ${t.color}`}>
                      {t.valor}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${t.bg}`}
                  >
                    <span className={`text-lg font-bold ${t.color}`}>
                      {t.titulo[0]}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.descripcion}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Accesos Rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {accesos.map((a) => (
            <Link key={a.titulo} href={a.href}>
              <Card className="h-full transition hover:border-primary/30 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{a.titulo}</CardTitle>
                  <CardDescription>{a.descripcion}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
