export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          nombre: string;
        };
        Update: {
          nombre?: string;
        };
        Relationships: [];
      };
      estados: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          nombre: string;
        };
        Update: {
          nombre?: string;
        };
        Relationships: [];
      };
      unidades_medida: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          nombre: string;
        };
        Update: {
          nombre?: string;
        };
        Relationships: [];
      };
      alimentos: {
        Row: {
          id: number;
          nombre: string;
          categoria_id: number | null;
          fecha_ingreso: string;
          estado_id: number | null;
          cantidad: number;
          unidad_medida_id: number | null;
          fecha_vencimiento: string | null;
        };
        Insert: {
          nombre: string;
          categoria_id?: number | null;
          estado_id?: number | null;
          cantidad: number;
          unidad_medida_id?: number | null;
          fecha_vencimiento?: string | null;
        };
        Update: {
          nombre?: string;
          categoria_id?: number | null;
          estado_id?: number | null;
          cantidad?: number;
          unidad_medida_id?: number | null;
          fecha_vencimiento?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alimentos_categoria_id_fkey";
            columns: ["categoria_id"];
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alimentos_estado_id_fkey";
            columns: ["estado_id"];
            referencedRelation: "estados";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alimentos_unidad_medida_id_fkey";
            columns: ["unidad_medida_id"];
            referencedRelation: "unidades_medida";
            referencedColumns: ["id"];
          },
        ];
      };
      donantes: {
        Row: {
          id: number;
          nombre: string;
          razon_social: string | null;
          numero_contacto: string | null;
          ci: string | null;
        };
        Insert: {
          nombre: string;
          razon_social?: string | null;
          numero_contacto?: string | null;
          ci?: string | null;
        };
        Update: {
          nombre?: string;
          razon_social?: string | null;
          numero_contacto?: string | null;
          ci?: string | null;
        };
        Relationships: [];
      };
      donaciones: {
        Row: {
          id: number;
          donante_id: number | null;
          fecha_donacion: string;
        };
        Insert: {
          donante_id?: number | null;
        };
        Update: {
          donante_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "donaciones_donante_id_fkey";
            columns: ["donante_id"];
            referencedRelation: "donantes";
            referencedColumns: ["id"];
          },
        ];
      };
      detalle_donacion: {
        Row: {
          id: number;
          donacion_id: number | null;
          alimento_id: number | null;
          cantidad: number;
        };
        Insert: {
          donacion_id?: number | null;
          alimento_id?: number | null;
          cantidad: number;
        };
        Update: {
          donacion_id?: number | null;
          alimento_id?: number | null;
          cantidad?: number;
        };
        Relationships: [
          {
            foreignKeyName: "detalle_donacion_donacion_id_fkey";
            columns: ["donacion_id"];
            referencedRelation: "donaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "detalle_donacion_alimento_id_fkey";
            columns: ["alimento_id"];
            referencedRelation: "alimentos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
