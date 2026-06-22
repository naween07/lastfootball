// Supplementary table types for tables not present in the auto-generated types.ts.
// The generated file only covers a subset of tables; this fills in the rest so
// supabase.from('posts'/'predictions'/etc.) is fully typed. Generated from the live
// schema. If you later run `supabase gen types`, you can delete this file.

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface ExtraTables {
  posts: {
    Row: {
      id: string;
      type: string;
      status: string;
      title: string;
      slug: string;
      subtitle: string | null;
      body: string;
      excerpt: string | null;
      meta_title: string | null;
      meta_description: string | null;
      canonical_url: string | null;
      keywords: string[] | null;
      json_ld: Json | null;
      author_id: string | null;
      author_name: string;
      author_avatar: string | null;
      featured_image: string | null;
      featured_image_alt: string | null;
      featured_image_caption: string | null;
      category: string;
      tags: string[] | null;
      league: string | null;
      teams: string[] | null;
      reading_time_mins: number | null;
      view_count: number | null;
      published_at: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      type?: string;
      status?: string;
      title: string;
      slug: string;
      subtitle?: string | null;
      body: string;
      excerpt?: string | null;
      meta_title?: string | null;
      meta_description?: string | null;
      canonical_url?: string | null;
      keywords?: string[] | null;
      json_ld?: Json | null;
      author_id?: string | null;
      author_name?: string;
      author_avatar?: string | null;
      featured_image?: string | null;
      featured_image_alt?: string | null;
      featured_image_caption?: string | null;
      category?: string;
      tags?: string[] | null;
      league?: string | null;
      teams?: string[] | null;
      reading_time_mins?: number | null;
      view_count?: number | null;
      published_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: Partial<ExtraTables['posts']['Insert']>;
    Relationships: [];
  };
  external_news: {
    Row: {
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      url: string;
      image_url: string | null;
      source_name: string;
      source_id: string | null;
      author: string | null;
      category: string | null;
      league_id: number | null;
      league_name: string | null;
      teams: string[] | null;
      players: string[] | null;
      published_at: string | null;
      fetched_at: string | null;
      read_count: number | null;
      saved_count: number | null;
      is_featured: boolean | null;
      is_archived: boolean | null;
      created_at: string | null;
      updated_at: string | null;
      raw_data: Json | null;
    };
    Insert: {
      id?: string;
      title: string;
      description?: string | null;
      content?: string | null;
      url: string;
      image_url?: string | null;
      source_name: string;
      source_id?: string | null;
      author?: string | null;
      category?: string | null;
      league_id?: number | null;
      league_name?: string | null;
      teams?: string[] | null;
      players?: string[] | null;
      published_at?: string | null;
      fetched_at?: string | null;
      read_count?: number | null;
      saved_count?: number | null;
      is_featured?: boolean | null;
      is_archived?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
      raw_data?: Json | null;
    };
    Update: Partial<ExtraTables['external_news']['Insert']>;
    Relationships: [];
  };
  predictions: {
    Row: {
      id: string;
      user_id: string;
      match_id: number;
      home_score: number;
      away_score: number;
      home_team: string;
      away_team: string;
      league_name: string | null;
      match_date: string | null;
      predicted_at: string | null;
      points: number | null;
      scored_at: string | null;
      kickoff_time: string | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      match_id: number;
      home_score: number;
      away_score: number;
      home_team: string;
      away_team: string;
      league_name?: string | null;
      match_date?: string | null;
      predicted_at?: string | null;
      points?: number | null;
      scored_at?: string | null;
      kickoff_time?: string | null;
    };
    Update: Partial<ExtraTables['predictions']['Insert']>;
    Relationships: [];
  };
  prediction_leaderboard: {
    Row: {
      user_id: string;
      username: string;
      total_points: number | null;
      total_predictions: number | null;
      correct_scores: number | null;
      correct_winners: number | null;
      current_streak: number | null;
      best_streak: number | null;
      updated_at: string | null;
    };
    Insert: {
      user_id: string;
      username: string;
      total_points?: number | null;
      total_predictions?: number | null;
      correct_scores?: number | null;
      correct_winners?: number | null;
      current_streak?: number | null;
      best_streak?: number | null;
      updated_at?: string | null;
    };
    Update: Partial<ExtraTables['prediction_leaderboard']['Insert']>;
    Relationships: [];
  };
  prediction_stats: {
    Row: {
      user_id: string | null;
      username: string | null;
      total_predictions: number | null;
      scored_predictions: number | null;
      pending_predictions: number | null;
      total_points: number | null;
      correct_scores: number | null;
      correct_winners: number | null;
      wrong_predictions: number | null;
    };
    Insert: { [key: string]: never };
    Update: { [key: string]: never };
    Relationships: [];
  };
  cache_snapshots: {
    Row: { key: string; data: Json; updated_at: string };
    Insert: { key: string; data: Json; updated_at?: string };
    Update: Partial<ExtraTables['cache_snapshots']['Insert']>;
    Relationships: [];
  };
  wc_enrollments: {
    Row: { id: string; user_id: string; team_code: string; team_name: string; created_at: string | null };
    Insert: { id?: string; user_id: string; team_code: string; team_name: string; created_at?: string | null };
    Update: Partial<ExtraTables['wc_enrollments']['Insert']>;
    Relationships: [];
  };
  post_assets: {
    Row: { id: string; post_id: string; type: string; url: string; alt_text: string | null; caption: string | null; embed_code: string | null; position: number | null; created_at: string | null };
    Insert: { id?: string; post_id: string; type: string; url: string; alt_text?: string | null; caption?: string | null; embed_code?: string | null; position?: number | null; created_at?: string | null };
    Update: Partial<ExtraTables['post_assets']['Insert']>;
    Relationships: [];
  };
  fantasy_teams: {
    Row: { id: string; user_id: string; team_name: string; budget_remaining: number | null; total_points: number | null; captain_id: number | null; vice_captain_id: number | null; matchday: number | null; free_transfers: number | null; created_at: string | null; updated_at: string | null };
    Insert: { id?: string; user_id: string; team_name?: string; budget_remaining?: number | null; total_points?: number | null; captain_id?: number | null; vice_captain_id?: number | null; matchday?: number | null; free_transfers?: number | null; created_at?: string | null; updated_at?: string | null };
    Update: Partial<ExtraTables['fantasy_teams']['Insert']>;
    Relationships: [];
  };
  fantasy_squad: {
    Row: { id: string; team_id: string; user_id: string; player_id: number; player_name: string; player_photo: string | null; team_name: string | null; team_logo: string | null; nation: string | null; nation_flag: string | null; position: string; price: number; is_starting: boolean | null; is_captain: boolean | null; is_vice_captain: boolean | null; points: number | null; added_at: string | null };
    Insert: { id?: string; team_id: string; user_id: string; player_id: number; player_name: string; player_photo?: string | null; team_name?: string | null; team_logo?: string | null; nation?: string | null; nation_flag?: string | null; position: string; price: number; is_starting?: boolean | null; is_captain?: boolean | null; is_vice_captain?: boolean | null; points?: number | null; added_at?: string | null };
    Update: Partial<ExtraTables['fantasy_squad']['Insert']>;
    Relationships: [];
  };
  fantasy_gameweeks: {
    Row: { gameweek: number; round_label: string | null; deadline: string | null; snapshotted: boolean | null };
    Insert: { gameweek: number; round_label?: string | null; deadline?: string | null; snapshotted?: boolean | null };
    Update: Partial<ExtraTables['fantasy_gameweeks']['Insert']>;
    Relationships: [];
  };
  fantasy_gw_points: {
    Row: { id: string; team_id: string; user_id: string | null; gameweek: number; points: number | null };
    Insert: { id?: string; team_id: string; user_id?: string | null; gameweek: number; points?: number | null };
    Update: Partial<ExtraTables['fantasy_gw_points']['Insert']>;
    Relationships: [];
  };
  fantasy_gw_squads: {
    Row: { id: string; team_id: string; user_id: string | null; gameweek: number; player_id: number | null; player_name: string | null; player_photo: string | null; nation: string | null; nation_flag: string | null; position: string | null; price: number | null; is_starting: boolean | null; is_captain: boolean | null; is_vice_captain: boolean | null; points: number | null };
    Insert: { [key: string]: Json | undefined };
    Update: { [key: string]: Json | undefined };
    Relationships: [];
  };
  fantasy_leagues: {
    Row: { id: string; name: string; code: string | null; created_by: string | null; is_public: boolean | null; max_members: number | null; created_at: string | null };
    Insert: { id?: string; name: string; code?: string | null; created_by?: string | null; is_public?: boolean | null; max_members?: number | null; created_at?: string | null };
    Update: Partial<ExtraTables['fantasy_leagues']['Insert']>;
    Relationships: [];
  };
  fantasy_league_members: {
    Row: { id: string; league_id: string | null; user_id: string | null; joined_at: string | null };
    Insert: { id?: string; league_id?: string | null; user_id?: string | null; joined_at?: string | null };
    Update: Partial<ExtraTables['fantasy_league_members']['Insert']>;
    Relationships: [];
  };
  fantasy_scored_fixtures: {
    Row: { fixture_id: number; scored_at: string | null };
    Insert: { fixture_id: number; scored_at?: string | null };
    Update: Partial<ExtraTables['fantasy_scored_fixtures']['Insert']>;
    Relationships: [];
  };
}
