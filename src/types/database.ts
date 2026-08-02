export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          mime_type: string
          original_filename: string
          post_id: string | null
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          mime_type: string
          original_filename: string
          post_id?: string | null
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          mime_type?: string
          original_filename?: string
          post_id?: string | null
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          position: number
          title: string
          updated_at: string
          youtube_video_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          position: number
          title: string
          updated_at?: string
          youtube_video_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: Json
          course_id: string | null
          created_at: string
          id: string
          is_notice: boolean
          search_text: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: Json
          course_id?: string | null
          created_at?: string
          id?: string
          is_notice?: boolean
          search_text: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: Json
          course_id?: string | null
          created_at?: string
          id?: string
          is_notice?: boolean
          search_text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nickname: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nickname: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      storage_settings: {
        Row: {
          created_at: string
          id: boolean
          last_warning_email_sent_at: string | null
          quota_bytes: number
          updated_at: string
          warning_state: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          last_warning_email_sent_at?: string | null
          quota_bytes?: number
          updated_at?: string
          warning_state?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          last_warning_email_sent_at?: string | null
          quota_bytes?: number
          updated_at?: string
          warning_state?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          id: string | null
          nickname: string | null
        }
        Insert: {
          id?: string | null
          nickname?: string | null
        }
        Update: {
          id?: string | null
          nickname?: string | null
        }
        Relationships: []
      }
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

