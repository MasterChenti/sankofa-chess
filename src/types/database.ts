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
  locale: string;
  stories_read: number;
  thoughts_answered: number;
  reflections: number;
  days_sharpened: number;
  online_games: number;
  rest_week: string | null;
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

export type StoryRegion = "west" | "east" | "north" | "central" | "southern" | "diaspora" | "pan-african";

export type StoryStructure = {
  sections: { title: string; body: string[] }[];
  think: { question: string; options: { key: string; text: string; reflection: string }[] };
  outcome: { title: string; body: string[] };
  sankofa: string;
  known: string[];
  debated: string[];
};

export type Story = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  symbol: string | null;
  image_url: string | null;
  read_minutes: number;
  source: string | null;
  region: StoryRegion | null;
  country: string | null;
  place: string | null;
  era: string | null;
  kind: "decision" | "idea";
  structure: StoryStructure | null;
  published_at: string;
};

export type ThinkingStyle = "patient" | "bold" | "diplomatic" | "adaptive" | "principled";

export type Thought = {
  id: string;
  slug: string;
  locale: string;
  prompt: string;
  context: string | null;
  options: { key: string; text: string; style: ThinkingStyle; perspective: string }[];
  takeaway: string;
  lesson_slug: string | null;
  sort_order: number;
};

export type DailyPlan = { puzzleId: string | null; storyId: string | null; thoughtId: string | null };

export type DailySession = {
  id: string;
  user_id: string;
  day_key: string;
  plan: DailyPlan;
  reflection_choice: string | null;
  reflection: string | null;
  reflected_at: string | null;
  completed_at: string | null;
};

export type LiveMode = "blitz" | "rapid" | "daily";

export type LiveGame = {
  id: string;
  white_id: string | null;
  black_id: string | null;
  created_by: string | null;
  status: "waiting" | "active" | "finished" | "aborted";
  mode: LiveMode;
  initial_ms: number;
  increment_ms: number;
  white_ms: number;
  black_ms: number;
  turn_started_at: string | null;
  moves: string[];
  ply: number;
  fen: string;
  result: "1-0" | "0-1" | "1/2-1/2" | null;
  termination: string | null;
  draw_offer_by: string | null;
  invite_code: string | null;
  rated: boolean;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "learning" | "strategy";
  metric: "puzzles_solved" | "games_played" | "lessons_completed" | "win_after_lesson" | "stories_read";
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
  source: "vs_computer" | "pass_and_play" | "online";
  opponent_id: string | null;
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
