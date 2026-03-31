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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      api_key_usage: {
        Row: {
          api_key_id: string
          id: string
          last_request_at: string | null
          minute_requests: number
          minute_window: string | null
          request_count: number
          usage_date: string
        }
        Insert: {
          api_key_id: string
          id?: string
          last_request_at?: string | null
          minute_requests?: number
          minute_window?: string | null
          request_count?: number
          usage_date?: string
        }
        Update: {
          api_key_id?: string
          id?: string
          last_request_at?: string | null
          minute_requests?: number
          minute_window?: string | null
          request_count?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          can_create_collections: boolean
          can_create_pages: boolean
          can_delete_collections: boolean
          can_delete_pages: boolean
          can_read_pages: boolean
          can_write_blocks: boolean
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked: boolean
          user_id: string
        }
        Insert: {
          can_create_collections?: boolean
          can_create_pages?: boolean
          can_delete_collections?: boolean
          can_delete_pages?: boolean
          can_read_pages?: boolean
          can_write_blocks?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked?: boolean
          user_id: string
        }
        Update: {
          can_create_collections?: boolean
          can_create_pages?: boolean
          can_delete_collections?: boolean
          can_delete_pages?: boolean
          can_read_pages?: boolean
          can_write_blocks?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked?: boolean
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          checked: boolean | null
          content: string
          created_at: string
          group_id: string | null
          id: string
          indent_level: number
          list_start: boolean | null
          page_id: string
          position: number
          type: string
        }
        Insert: {
          checked?: boolean | null
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          indent_level?: number
          list_start?: boolean | null
          page_id: string
          position?: number
          type?: string
        }
        Update: {
          checked?: boolean | null
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          indent_level?: number
          list_start?: boolean | null
          page_id?: string
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          deleted_at: string | null
          icon: string | null
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled_for: string[]
          flag: string
          globally_enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_for?: string[]
          flag: string
          globally_enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_for?: string[]
          flag?: string
          globally_enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          contact_ok: boolean
          created_at: string
          email: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          contact_ok?: boolean
          created_at?: string
          email: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          contact_ok?: boolean
          created_at?: string
          email?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_blocked: {
        Row: {
          blocked_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          collection_id: string
          created_at: string
          deleted_at: string | null
          id: string
          share_enabled: boolean
          share_mode: string
          share_token: string | null
          shared_with_emails: string[]
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          share_enabled?: boolean
          share_mode?: string
          share_token?: string | null
          shared_with_emails?: string[]
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          share_enabled?: boolean
          share_mode?: string
          share_token?: string | null
          shared_with_emails?: string[]
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          beta_tester: boolean
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_seen_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          beta_tester?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          beta_tester?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_rate_limit: {
        Args: {
          p_api_key_id: string
          p_max_per_day?: number
          p_max_per_minute?: number
        }
        Returns: Json
      }
      cleanup_old_trash: { Args: never; Returns: undefined }
      validate_api_key: { Args: { p_key: string }; Returns: Json }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

