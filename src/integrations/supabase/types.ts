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
      ai_insights: {
        Row: {
          action_route: string | null
          category: string
          created_at: string
          id: string
          insight_key: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_route?: string | null
          category?: string
          created_at?: string
          id?: string
          insight_key: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_route?: string | null
          category?: string
          created_at?: string
          id?: string
          insight_key?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          content: string
          created_at?: string
          id?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      food_favorites: {
        Row: {
          calories: number
          carbs: number
          category: string | null
          created_at: string
          emoji: string | null
          fat: number
          fiber: number
          food_name: string
          id: string
          portion_g: number
          protein: number
          sodium_mg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          category?: string | null
          created_at?: string
          emoji?: string | null
          fat?: number
          fiber?: number
          food_name: string
          id?: string
          portion_g?: number
          protein?: number
          sodium_mg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          category?: string | null
          created_at?: string
          emoji?: string | null
          fat?: number
          fiber?: number
          food_name?: string
          id?: string
          portion_g?: number
          protein?: number
          sodium_mg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_log: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          fiber: number | null
          food_name: string
          id: string
          logged_at: string
          meal_type: string
          protein: number | null
          quantity: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          food_name: string
          id?: string
          logged_at?: string
          meal_type?: string
          protein?: number | null
          quantity: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          food_name?: string
          id?: string
          logged_at?: string
          meal_type?: string
          protein?: number | null
          quantity?: string
          user_id?: string
        }
        Relationships: []
      }
      global_favorites: {
        Row: {
          category: string
          created_at: string
          id: string
          item_id: string
          route: string | null
          subtitle: string | null
          title: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          item_id: string
          route?: string | null
          subtitle?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_id?: string
          route?: string | null
          subtitle?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          plan_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          plan_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          plan_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string
          full_name: string | null
          height_cm: number | null
          id: string
          is_premium: boolean
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          sex: string | null
          sports: string[]
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          full_name?: string | null
          height_cm?: number | null
          id: string
          is_premium?: boolean
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          sex?: string | null
          sports?: string[]
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          full_name?: string | null
          height_cm?: number | null
          id?: string
          is_premium?: boolean
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          sex?: string | null
          sports?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_type: string
          photo_url: string
          user_id: string
          weight_log_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_type?: string
          photo_url: string
          user_id: string
          weight_log_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_type?: string
          photo_url?: string
          user_id?: string
          weight_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_weight_log_id_fkey"
            columns: ["weight_log_id"]
            isOneToOne: false
            referencedRelation: "weight_log"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_history: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          result: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          result: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          bmr: number | null
          calories_goal: number
          carbs_goal: number | null
          created_at: string
          fat_goal: number | null
          id: string
          protein_goal: number
          target_weight: number | null
          tdee: number | null
          updated_at: string
          user_id: string
          water_goal_ml: number
        }
        Insert: {
          bmr?: number | null
          calories_goal?: number
          carbs_goal?: number | null
          created_at?: string
          fat_goal?: number | null
          id?: string
          protein_goal?: number
          target_weight?: number | null
          tdee?: number | null
          updated_at?: string
          user_id: string
          water_goal_ml?: number
        }
        Update: {
          bmr?: number | null
          calories_goal?: number
          carbs_goal?: number | null
          created_at?: string
          fat_goal?: number | null
          id?: string
          protein_goal?: number
          target_weight?: number | null
          tdee?: number | null
          updated_at?: string
          user_id?: string
          water_goal_ml?: number
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          disliked_foods: string[] | null
          id: string
          liked_foods: string[] | null
          objective: string | null
          restrictions: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disliked_foods?: string[] | null
          id?: string
          liked_foods?: string[] | null
          objective?: string | null
          restrictions?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disliked_foods?: string[] | null
          id?: string
          liked_foods?: string[] | null
          objective?: string | null
          restrictions?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_log: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_log: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          height_cm: number | null
          hip_cm: number | null
          id: string
          logged_at: string
          neck_cm: number | null
          notes: string | null
          thigh_cm: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          logged_at?: string
          neck_cm?: number | null
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg: number
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          logged_at?: string
          neck_cm?: number | null
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number
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
    Enums: {},
  },
} as const
