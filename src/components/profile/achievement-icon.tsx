import { Award, BookOpen, Brain, Crown, Flame, Medal, RotateCcw, Swords, Zap, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  medal: Medal,
  brain: Brain,
  flame: Flame,
  swords: Swords,
  "book-open": BookOpen,
  "rotate-ccw": RotateCcw,
  zap: Zap,
  crown: Crown,
};

export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Award;
  return <Icon className={className} aria-hidden />;
}
