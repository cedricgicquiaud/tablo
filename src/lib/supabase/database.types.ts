export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          duration_min: number
          id: string
          starts_at: string
          tag: string
          title: string
        }
        Insert: {
          duration_min?: number
          id?: string
          starts_at: string
          tag: string
          title: string
        }
        Update: {
          duration_min?: number
          id?: string
          starts_at?: string
          tag?: string
          title?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          country: string
          created_at: string
          email: string
          full_name: string
          id: string
          segment: string
        }
        Insert: {
          country: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          segment: string
        }
        Update: {
          country?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          segment?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          customer_id: string | null
          id: number
          metadata: Json | null
          occurred_at: string
          type: string
        }
        Insert: {
          customer_id?: string | null
          id?: number
          metadata?: Json | null
          occurred_at?: string
          type: string
        }
        Update: {
          customer_id?: string | null
          id?: number
          metadata?: Json | null
          occurred_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: number
          order_id: string
          product_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          id?: number
          order_id: string
          product_id: string
          quantity: number
          unit_price_cents: number
        }
        Update: {
          id?: number
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          created_at: string
          customer_id: string
          id: string
          paid_at: string | null
          status: string
          total_cents: number
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id: string
          id?: string
          paid_at?: string | null
          status: string
          total_cents: number
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string
          id?: string
          paid_at?: string | null
          status?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          price_cents: number
          rating: number
          segment: string
          sku: string
          status: string
          stock: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          price_cents: number
          rating: number
          segment: string
          sku: string
          status: string
          stock: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          price_cents?: number
          rating?: number
          segment?: string
          sku?: string
          status?: string
          stock?: number
        }
        Relationships: []
      }
      shipments: {
        Row: {
          delivered_at: string | null
          hub: string
          id: string
          order_id: string
          shipped_at: string
          status: string
        }
        Insert: {
          delivered_at?: string | null
          hub: string
          id?: string
          order_id: string
          shipped_at: string
          status: string
        }
        Update: {
          delivered_at?: string | null
          hub?: string
          id?: string
          order_id?: string
          shipped_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          month: string
          revenue_cents: number
        }
        Insert: {
          month: string
          revenue_cents: number
        }
        Update: {
          month?: string
          revenue_cents?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      basket_kpi: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_cents: number
          delta_pct: number
        }[]
      }
      orders_kpi: {
        Args: {
          days?: number
        }
        Returns: {
          count: number
          delta_pct: number
          daily_cents: number[]
        }[]
      }
      revenue_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          revenue_cents: number
        }[]
      }
      revenue_kpi: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_cents: number
          previous_cents: number
          delta_pct: number
          sparkline_cents: number[]
        }[]
      }
      revenue_monthly: {
        Args: {
          months?: number
        }
        Returns: {
          month: string
          revenue_cents: number
        }[]
      }
      target_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_cents: number
          target_cents: number
          pct: number
          online_cents: number
          store_cents: number
        }[]
      }
      target_vs_actual_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          actual_cents: number
          target_cents: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

