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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_logs: {
        Row: {
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          contact_ids: string[]
          created_at: string
          id: string
          message_id: string | null
          name: string
          scheduled_at: string | null
          status: string | null
          webhook_url: string | null
        }
        Insert: {
          contact_ids?: string[]
          created_at?: string
          id?: string
          message_id?: string | null
          name: string
          scheduled_at?: string | null
          status?: string | null
          webhook_url?: string | null
        }
        Update: {
          contact_ids?: string[]
          created_at?: string
          id?: string
          message_id?: string | null
          name?: string
          scheduled_at?: string | null
          status?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      recovery_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_text: string
          trigger_type: string
          is_active: boolean
          timeout_minutes: number
          max_attempts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_text: string
          trigger_type?: string
          is_active?: boolean
          timeout_minutes?: number
          max_attempts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_text?: string
          trigger_type?: string
          is_active?: boolean
          timeout_minutes?: number
          max_attempts?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recovery_flows: {
        Row: {
          id: string
          rule_id: string
          sequence_order: number
          delay_minutes: number
          message_id: string
          webhook_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          rule_id: string
          sequence_order: number
          delay_minutes?: number
          message_id: string
          webhook_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string
          sequence_order?: number
          delay_minutes?: number
          message_id?: string
          webhook_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_flows_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "recovery_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_flows_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_conversations: {
        Row: {
          id: string
          contact_id: string
          rule_id: string
          trigger_message: string
          trigger_received_at: string
          current_flow_step: number
          attempts_count: number
          last_message_sent_at: string | null
          next_message_scheduled_at: string | null
          status: string
          completed_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          rule_id: string
          trigger_message: string
          trigger_received_at?: string
          current_flow_step?: number
          attempts_count?: number
          last_message_sent_at?: string | null
          next_message_scheduled_at?: string | null
          status?: string
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          rule_id?: string
          trigger_message?: string
          trigger_received_at?: string
          current_flow_step?: number
          attempts_count?: number
          last_message_sent_at?: string | null
          next_message_scheduled_at?: string | null
          status?: string
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_conversations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "recovery_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_logs: {
        Row: {
          id: string
          conversation_id: string
          action: string
          message: string | null
          data: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          action: string
          message?: string | null
          data?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          action?: string
          message?: string | null
          data?: Record<string, any> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "monitored_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
