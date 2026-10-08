import { Award, BookOpen, Brain, Crown, Flame, Handshake, Lightbulb, Medal, RotateCcw, ScrollText, Sunrise, Swords, Zap, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  medal: Medal,
  brain: Brain,
  flame: Flame,
  swords: Swords,
  "book-open": BookOpen,
  "rotate-ccw": RotateCcw,
  zap: Zap,
  crown: Crown,
  scroll: ScrollText,
  lightbulb: Lightbulb,
  sunrise: Sunrise,
  handshake: Handshake,
};

export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Award;
  return <Icon className={className} aria-hidden />;
}
