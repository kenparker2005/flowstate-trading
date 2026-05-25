export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          is_subscribed: boolean | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          is_subscribed?: boolean | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          username?: string | null;
          is_subscribed?: boolean | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      pairs: {
        Row: {
          id: number;
          symbol: string;
          display_name: string | null;
          is_active: boolean | null;
        };
        Insert: {
          symbol: string;
          display_name?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          symbol?: string;
          display_name?: string | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string | null;
          pair_id: number | null;
          timeframe: string | null;
          session_name: string | null;
          session_date: string | null;
          date_is_hidden: boolean;
          started_at: string | null;
          ended_at: string | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          pair_id?: number | null;
          timeframe?: string | null;
          session_name?: string | null;
          session_date?: string | null;
          date_is_hidden?: boolean;
          started_at?: string | null;
          ended_at?: string | null;
          status?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          pair_id?: number | null;
          timeframe?: string | null;
          session_name?: string | null;
          session_date?: string | null;
          date_is_hidden?: boolean;
          started_at?: string | null;
          ended_at?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          direction: string | null;
          entry_price: number | null;
          exit_price: number | null;
          stop_loss: number | null;
          take_profit: number | null;
          entry_bar: number | null;
          exit_bar: number | null;
          outcome: string | null;
          pnl_pips: number | null;
          rr_achieved: number | null;
          bias_checked: Record<string, boolean> | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          direction?: string | null;
          entry_price?: number | null;
          exit_price?: number | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          entry_bar?: number | null;
          exit_bar?: number | null;
          outcome?: string | null;
          pnl_pips?: number | null;
          rr_achieved?: number | null;
          bias_checked?: Record<string, boolean> | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          direction?: string | null;
          entry_price?: number | null;
          exit_price?: number | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          entry_bar?: number | null;
          exit_bar?: number | null;
          outcome?: string | null;
          pnl_pips?: number | null;
          rr_achieved?: number | null;
          bias_checked?: Record<string, boolean> | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          market: string;
          session: string;
          account_size: number;
          bias_items: string[];
          max_risk: number;
          target_rr: number;
          strategy_notes: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          market?: string;
          session?: string;
          account_size?: number;
          bias_items?: string[];
          max_risk?: number;
          target_rr?: number;
          strategy_notes?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          market?: string;
          session?: string;
          account_size?: number;
          bias_items?: string[];
          max_risk?: number;
          target_rr?: number;
          strategy_notes?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          total_sessions: number | null;
          total_trades: number | null;
          wins: number | null;
          losses: number | null;
          breakevens: number | null;
          total_pips: number | null;
          best_streak: number | null;
          current_streak: number | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          total_sessions?: number | null;
          total_trades?: number | null;
          wins?: number | null;
          losses?: number | null;
          breakevens?: number | null;
          total_pips?: number | null;
          best_streak?: number | null;
          current_streak?: number | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          total_sessions?: number | null;
          total_trades?: number | null;
          wins?: number | null;
          losses?: number | null;
          breakevens?: number | null;
          total_pips?: number | null;
          best_streak?: number | null;
          current_streak?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
