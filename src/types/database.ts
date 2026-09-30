/**
 * Row shapes for the Sankofa Chess schema (supabase/migrations).
 * Regenerate full typings later with `supabase gen types typescript` if desired.
 */
export type ChessLevel = "beginner" | "intermediate" | "advanced";
export type Goal = "basics" | "tactics" | "strategy" | "tournaments" | "fun";
export type Color = "w" | "b";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  country: string;
  chess_level: ChessLevel;
  goal: Goal | null;
  timezone: string;
  rating: number;
  peak_rating: number;
  xp: number;
  sankofa_level: number;
  streak: number;
  best_streak: number;
  last_active_date: string | null;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  puzzles_solved: number;
  puzzle_first_attempts: number;
  puzzle_first_correct: number;
  puzzle_run: number;
  best_puzzle_run: number;
  lessons_completed: number;
  games_reviewed: number;
  is_demo: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Puzzle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  hint: string | null;
  fen: string;
  solution: string[];
  difficulty: ChessLevel;
  category: string;
  rating: number;
  is_mate: boolean;
  sort_order: number;
};

export type LessonContent = {
  paragraphs: string[];
  fen: string;
  task: string;
  accept: string[];
  requireMate: boolean;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  category: "beginner" | "strategy" | "tactics" | "endgame";
  description: string;
  content: LessonContent;
  difficulty: ChessLevel;
  duration_minutes: number;
  order_index: number;
};

export type Story = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  symbol: string | null;
  image_url: string | null;
  read_minutes: number;
  source: string | null;
  published_at: string;
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "learning" | "strategy";
  metric: "puzzles_solved" | "games_played" | "lessons_completed" | "win_after_lesson";
  period: "day" | "week";
  target: number;
  reward_xp: number;
  href: string | null;
  sort_order: number;
};

export type UserChallenge = {
  id: string;
  user_id: string;
  challenge_id: string;
  period_key: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
};

export type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  requirement: { metric: string; count: number };
  sort_order: number;
};

export type GameRow = {
  id: string;
  user_id: string;
  source: "vs_computer" | "pass_and_play";
  opponent_name: string;
  opponent_rating: number | null;
  user_color: Color;
  result: "1-0" | "0-1" | "1/2-1/2";
  outcome: "win" | "loss" | "draw";
  termination: string;
  fen: string;
  pgn: string;
  moves: string[];
  time_control: string;
  rated: boolean;
  rating_before: number | null;
  rating_after: number | null;
  rating_change: number | null;
  accuracy: number | null;
  analysis: import("@/lib/chess/analysis-types").GameAnalysis | null;
  reviewed_at: string | null;
  created_at: string;
};
