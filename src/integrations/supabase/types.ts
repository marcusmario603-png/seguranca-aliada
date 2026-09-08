export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      beneficiaries: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          process_id: string
          relationship: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          process_id: string
          relationship?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          process_id?: string
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          birth_date: string | null
          city: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          cnpj: string | null
          company_name: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          birth_date?: string | null
          city?: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          birth_date?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string
          created_at: string
          doc_type: string
          file_size: number | null
          id: string
          mime_type: string | null
          original_name: string
          process_id: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          doc_type?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_name: string
          process_id?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          doc_type?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string
          process_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["process_status"] | null
          notes: string | null
          previous_status: Database["public"]["Enums"]["process_status"] | null
          process_id: string
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["process_status"] | null
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["process_status"] | null
          process_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["process_status"] | null
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["process_status"] | null
          process_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_history_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          accommodation: string | null
          assistance_segment: string | null
          cancellation_reason: string | null
          cancelled_date: string | null
          client_id: string
          code: number
          coparticipation: boolean
          coverage: string | null
          created_at: string
          deleted_at: string | null
          effective_date: string | null
          id: string
          lives_quantity: number
          network_type: string | null
          notes: string | null
          operator_id: string | null
          plan_type: string
          proposal_date: string | null
          reimbursement: boolean
          responsible_user_id: string | null
          signed_date: string | null
          status: Database["public"]["Enums"]["process_status"]
          updated_at: string
        }
        Insert: {
          accommodation?: string | null
          assistance_segment?: string | null
          cancellation_reason?: string | null
          cancelled_date?: string | null
          client_id: string
          code?: number
          coparticipation?: boolean
          coverage?: string | null
          created_at?: string
          deleted_at?: string | null
          effective_date?: string | null
          id?: string
          lives_quantity?: number
          network_type?: string | null
          notes?: string | null
          operator_id?: string | null
          plan_type?: string
          proposal_date?: string | null
          reimbursement?: boolean
          responsible_user_id?: string | null
          signed_date?: string | null
          status?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
        }
        Update: {
          accommodation?: string | null
          assistance_segment?: string | null
          cancellation_reason?: string | null
          cancelled_date?: string | null
          client_id?: string
          code?: number
          coparticipation?: boolean
          coverage?: string | null
          created_at?: string
          deleted_at?: string | null
          effective_date?: string | null
          id?: string
          lives_quantity?: number
          network_type?: string | null
          notes?: string | null
          operator_id?: string | null
          plan_type?: string
          proposal_date?: string | null
          reimbursement?: boolean
          responsible_user_id?: string | null
          signed_date?: string | null
          status?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "collaborator"
      client_type: "pf" | "pj"
      process_status:
        | "lead"
        | "qualified"
        | "proposal_sent"
        | "proposal_refused"
        | "cancelled"
        | "proposal_signed"
        | "active_contract"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "collaborator"],
      client_type: ["pf", "pj"],
      process_status: [
        "lead",
        "qualified",
        "proposal_sent",
        "proposal_refused",
        "cancelled",
        "proposal_signed",
        "active_contract",
      ],
    },
  },
} as const
