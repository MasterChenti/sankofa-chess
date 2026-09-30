/** Computer opponents. Ratings are nominal Sankofa ratings, not FIDE ratings. */
export type PersonaId = "abena" | "kwaku" | "nana";

export type Persona = {
  id: PersonaId;
  name: string;
  label: string;
  rating: number;
  blurb: string;
  /** Engine behaviour — interpreted by the ChessEngine implementation. */
  play: {
    skill: number; // Stockfish "Skill Level" 0–20
    depth: number;
    movetimeMs: number;
    multiPv: number;
    /** 0–1: chance to pick a non-best line from the MultiPV list */
    randomness: number;
    /** 0–1: chance to play a random legal move instead (beginner-friendly slips) */
    blunderRate: number;
    limitElo?: number;
  };
};

export const PERSONAS: Record<PersonaId, Persona> = {
  abena: {
    id: "abena",
    name: "Abena",
    label: "Easy",
    rating: 800,
    blurb: "Friendly. Leaves chances.",
    play: { skill: 0, depth: 2, movetimeMs: 150, multiPv: 4, randomness: 0.55, blunderRate: 0.12 },
  },
  kwaku: {
    id: "kwaku",
    name: "Kwaku",
    label: "Medium",
    rating: 1200,
    blurb: "Solid club player.",
    play: { skill: 4, depth: 5, movetimeMs: 300, multiPv: 3, randomness: 0.25, blunderRate: 0.03 },
  },
  nana: {
    id: "nana",
    name: "Nana",
    label: "Hard",
    rating: 1600,
    blurb: "The elder. Punishes mistakes.",
    play: { skill: 10, depth: 10, movetimeMs: 600, multiPv: 1, randomness: 0, blunderRate: 0, limitElo: 1600 },
  },
};

export const PERSONA_LIST = [PERSONAS.abena, PERSONAS.kwaku, PERSONAS.nana];

export const TIME_CONTROLS = {
  "5+0": { label: "5 min", initialMs: 5 * 60_000, incrementMs: 0 },
  "10+0": { label: "10 min", initialMs: 10 * 60_000, incrementMs: 0 },
  "15+10": { label: "15 + 10", initialMs: 15 * 60_000, incrementMs: 10_000 },
  none: { label: "No clock", initialMs: null, incrementMs: 0 },
} as const;
export type TimeControlId = keyof typeof TIME_CONTROLS;
