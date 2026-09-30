/**
 * Source of truth for Sankofa Chess seed content.
 * `npm run db:seed:generate` turns this into supabase/seed.sql.
 * Every FEN and solution here is validated by src/content.test.ts.
 */

export type SeedPuzzle = {
  slug: string;
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  rating: number;
  fen: string;
  solution: string[]; // UCI moves, alternating solver / opponent
  isMate: boolean;
  hint: string;
  description: string; // the idea, shown after solving
};

export type SeedLesson = {
  slug: string;
  title: string;
  category: "beginner" | "strategy" | "tactics" | "endgame";
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  durationMinutes: number;
  content: { paragraphs: string[]; fen: string; task: string; accept: string[]; requireMate: boolean };
};

export type SeedStory = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  symbol: string;
  readMinutes: number;
  paragraphs: string[];
  source: string;
};

export type SeedChallenge = {
  slug: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "learning" | "strategy";
  metric: "puzzles_solved" | "games_played" | "lessons_completed" | "win_after_lesson";
  period: "day" | "week";
  target: number;
  rewardXp: number;
  href: string;
};

export type SeedAchievement = {
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  requirement: { metric: string; count: number };
};

export const PUZZLES: SeedPuzzle[] = [
  { slug: "the-oldest-trap", title: "The oldest trap", category: "Arabian mate", difficulty: "beginner", rating: 700, fen: "7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1", solution: ["b7h7"], isMate: true,
    hint: "Your knight already guards two key squares next to the king.", description: "Rook and knight working together: the knight protects the rook and seals g8." },
  { slug: "back-rank", title: "Back rank", category: "Back-rank mate", difficulty: "beginner", rating: 650, fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", solution: ["d1d8"], isMate: true,
    hint: "Black’s own pawns are boxing the king in.", description: "A king with no escape square on the back rank is vulnerable to any rook or queen check." },
  { slug: "smothered", title: "Smothered", category: "Smothered mate", difficulty: "beginner", rating: 800, fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", solution: ["g5f7"], isMate: true,
    hint: "Only one piece can check a king that is surrounded by its own army.", description: "The knight is the only piece that jumps — a king buried by its own pieces cannot escape its check." },
  { slug: "four-move-lesson", title: "Four-move lesson", category: "Weak f7", difficulty: "beginner", rating: 600, fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", solution: ["h5f7"], isMate: true,
    hint: "Which black square is defended only by the king?", description: "f7 is guarded only by the king at the start. Queen plus bishop on it is deadly." },
  { slug: "the-ladder", title: "The ladder", category: "Two-rook mate", difficulty: "beginner", rating: 550, fen: "k7/7R/8/8/8/8/8/6RK w - - 0 1", solution: ["g1g8"], isMate: true,
    hint: "One rook already holds the seventh rank.", description: "Rooks take turns controlling ranks: one cuts off, the other delivers mate." },
  { slug: "pawn-with-a-purpose", title: "Pawn with a purpose", category: "Pawn fork", difficulty: "beginner", rating: 750, fen: "4k3/8/3n1b2/8/3PP3/8/8/4K3 w - - 0 1", solution: ["e4e5", "d6c4", "e5f6"], isMate: false,
    hint: "Even the smallest piece can attack two at once.", description: "Pawn forks are cheap and powerful: a pawn attacking two pieces always wins material." },
  { slug: "double-duty", title: "Double duty", category: "Double attack", difficulty: "intermediate", rating: 950, fen: "r3k3/8/8/8/8/3Q4/8/4K3 w - - 0 1", solution: ["d3e4", "e8d7", "e4a8"], isMate: false,
    hint: "Find a queen move that checks and hits the corner.", description: "A queen checking the king along one line while attacking along another wins material." },
  { slug: "royal-fork", title: "Royal fork", category: "Knight fork", difficulty: "intermediate", rating: 1000, fen: "r3k3/8/8/1N6/8/8/7P/4K3 w - - 0 1", solution: ["b5c7", "e8d7", "c7a8"], isMate: false,
    hint: "Look for a knight jump that hits the king and something valuable at once.", description: "A check plus an attack on a second piece: the opponent can only answer one." },
  { slug: "through-the-king", title: "Through the king", category: "Skewer", difficulty: "intermediate", rating: 1100, fen: "8/8/q2k4/8/8/8/6R1/7K w - - 0 1", solution: ["g2g6", "d6d5", "g6a6"], isMate: false,
    hint: "Line up your rook with the king and what stands behind it.", description: "A skewer attacks a valuable piece first; when it moves, you take what was behind." },
  { slug: "hidden-power", title: "Hidden power", category: "Discovered attack", difficulty: "intermediate", rating: 1150, fen: "8/4k1q1/8/5P2/3N4/8/8/B3K3 w - - 0 1", solution: ["d4c6", "e7d6", "a1g7"], isMate: false,
    hint: "Something is standing in your bishop’s way. Move it with tempo.", description: "Move one piece to give check, and the piece behind it strikes." },
  { slug: "queen-offering", title: "Queen offering", category: "Deflection", difficulty: "advanced", rating: 1500, fen: "r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 1 1", solution: ["d5d8", "e7d8", "e1e8"], isMate: false,
    hint: "Which defender stops your rook from reaching the back rank?", description: "Sacrifice to drag a defender away from the square that matters." },
];

const L = (
  slug: string,
  category: SeedLesson["category"],
  title: string,
  durationMinutes: number,
  paragraphs: string[],
  fen: string,
  task: string,
  accept: string[] | "mate",
): SeedLesson => ({
  slug,
  title,
  category,
  difficulty: category === "beginner" ? "beginner" : category === "endgame" ? "intermediate" : "intermediate",
  description: paragraphs[0],
  durationMinutes,
  content: { paragraphs, fen, task, accept: accept === "mate" ? [] : accept, requireMate: accept === "mate" },
});

export const LESSONS: SeedLesson[] = [
  L("the-chessboard", "beginner", "The chessboard", 3,
    ["The board has 64 squares in 8 files (a–h) and 8 ranks (1–8). Every square has a name, like e4.", "White always starts, and pawns move forward one square — or two on their very first move."],
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "Move the e-pawn two squares forward to e4.", ["e2e4"]),
  L("the-pieces", "beginner", "The pieces", 4,
    ["Rooks move in straight lines. Bishops move diagonally. The queen does both. The king moves one square in any direction.", "The knight is special: it moves in an L-shape and is the only piece that can jump over others."],
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "Jump the g1 knight to f3.", ["g1f3"]),
  L("legal-moves-and-captures", "beginner", "Legal moves and captures", 4,
    ["You capture by moving onto a square occupied by an opponent’s piece. The captured piece leaves the board.", "Before every move, ask: is anything of theirs undefended?"],
    "4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1", "Capture the undefended bishop with your rook.", ["d1d5"]),
  L("check-and-checkmate", "beginner", "Check and checkmate", 5,
    ["Check means the king is attacked. The player in check must escape it immediately.", "Checkmate is a check with no escape — the game ends."],
    "6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1", "Deliver checkmate in one move.", "mate"),
  L("castling", "beginner", "Castling", 4,
    ["Castling moves your king two squares toward a rook, and the rook jumps to the other side of it. It tucks the king away and activates the rook.", "You can’t castle out of check, through an attacked square, or after the king or that rook has moved."],
    "r3k2r/pppq1ppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R2QK2R w KQkq - 0 1", "Castle kingside: move the king from e1 to g1.", ["e1g1"]),
  L("opening-principles", "beginner", "Opening principles", 5,
    ["In the opening: control the centre, develop knights and bishops, and castle early.", "Knights usually belong on f3 and c3 — pointing at the centre, not the edge."],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", "Develop a knight toward the centre.", ["g1f3", "b1c3"]),
  L("control-the-centre", "strategy", "Control the centre", 5,
    ["The four central squares — d4, e4, d5, e5 — are the high ground. Pieces placed near them reach more of the board.", "Claiming the centre with pawns gives your pieces room to breathe."],
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "Place a pawn in the centre with your first move.", ["e2e4", "d2d4"]),
  L("develop-your-pieces", "strategy", "Develop your pieces", 5,
    ["A piece still on its starting square is a soldier who hasn’t joined the fight.", "Bring out a new piece with nearly every opening move. Don’t move the same piece twice without a reason."],
    "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "Develop a new minor piece to an active square.", ["f1c4", "f1b5", "b1c3"]),
  L("king-safety", "strategy", "King safety", 5,
    ["A king in the centre is a target once the position opens. Castle before you attack.", "Keep the pawns in front of your castled king where they are unless you have a clear reason."],
    "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "Get your king to safety.", ["e1g1"]),
  L("pawn-structure", "strategy", "Pawn structure", 6,
    ["Pawns can’t move backwards, so every pawn decision is permanent.", "When you have a choice of recapture, capturing toward the centre usually keeps a healthier structure."],
    "r1bqkb1r/pppp1ppp/8/4p3/4P3/2n5/PPPP1PPP/R1BQKBNR w KQkq - 0 5", "Recapture the knight on c3 — toward the centre.", ["b2c3"]),
  L("space", "strategy", "Space", 5,
    ["Advanced pawns claim territory. The side with more space has easier manoeuvres; the cramped side struggles to coordinate.", "Space is only an advantage if you can support your advanced pawns."],
    "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3", "Gain space by advancing your e-pawn.", ["e4e5"]),
  L("exchanges", "strategy", "Exchanges", 5,
    ["When you are ahead in material, trade pieces. Every exchange makes your extra material count for more.", "When you are behind, avoid trades and look for complications."],
    "3r2k1/5pp1/7p/8/8/8/5PPP/R2R2K1 w - - 0 1", "You are a rook up. Offer the trade.", ["d1d8"]),
  L("fork", "tactics", "Fork", 4,
    ["A fork is one piece attacking two targets at once. Knights are the classic forking piece.", "The most powerful forks include a check, so the opponent has no time to save the other piece."],
    "r3k3/8/8/1N6/8/8/7P/4K3 w - - 0 1", "Fork the king and rook.", ["b5c7"]),
  L("pin", "tactics", "Pin", 4,
    ["A pin freezes a piece because moving it would expose something more valuable behind it.", "If the piece behind is the king, the pinned piece cannot legally move at all."],
    "4k3/3n4/8/8/8/8/8/4KB2 w - - 0 1", "Pin the knight to the king.", ["f1b5"]),
  L("skewer", "tactics", "Skewer", 4,
    ["A skewer is a pin in reverse: the valuable piece is in front, and when it moves you take the piece behind."],
    "8/8/q2k4/8/8/8/6R1/7K w - - 0 1", "Skewer the king and queen.", ["g2g6"]),
  L("discovered-attack", "tactics", "Discovered attack", 5,
    ["When one piece moves out of the way, the piece behind it attacks. If the moving piece gives check too, it is a discovered attack with check."],
    "8/4k1q1/8/5P2/3N4/8/8/B3K3 w - - 0 1", "Move the knight with check to uncover your bishop.", ["d4c6"]),
  L("double-attack", "tactics", "Double attack", 4,
    ["The queen can attack in eight directions. Combine a check with a second threat and something falls."],
    "r3k3/8/8/8/8/3Q4/8/4K3 w - - 0 1", "Check the king and attack the rook in one move.", ["d3e4"]),
  L("checkmate-patterns", "tactics", "Checkmate patterns", 5,
    ["Strong players don’t calculate every mate — they recognise patterns. The back-rank mate is one of the most common in real games.", "Give your own king an escape square (called luft) to avoid it."],
    "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", "Find the back-rank mate.", "mate"),
  L("king-and-pawn", "endgame", "King and pawn", 5,
    ["The rule of the square: draw a square from the pawn to the promotion rank. If the enemy king can’t step inside it, the pawn runs through alone."],
    "8/8/8/8/k7/8/7P/7K w - - 0 1", "The king is outside the square. Push the pawn as far as you can.", ["h2h4"]),
  L("opposition", "endgame", "Opposition", 6,
    ["When kings face each other with one square between them, the player who does not have to move has the opposition.", "Taking the opposition forces the enemy king to give way."],
    "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1", "Take the opposition by stepping your king forward.", ["e3e4"]),
  L("basic-rook-endings", "endgame", "Basic rook endings", 6,
    ["A rook is at its best cutting off the enemy king. A king kept away from your pawn cannot stop it."],
    "8/8/8/8/2k5/8/4P3/R3K3 w - - 0 1", "Cut the black king off along the d-file.", ["a1d1"]),
];

export const STORIES: SeedStory[] = [
  { slug: "go-back-and-get-it", title: "Go back and get it", category: "Philosophy", readMinutes: 3, symbol: "sankofa",
    excerpt: "The Akan word behind this platform, and why it fits a game built on memory.",
    paragraphs: [
      "Sankofa comes from the Akan people of Ghana. The word is usually explained as a joining of san (return), ko (go) and fa (fetch): go back and get it.",
      "It is tied to a proverb: “Se wo were fi na wosankofa a yenkyi” — it is not wrong to go back for that which you have forgotten.",
      "The Adinkra symbol shows a bird whose feet face forward while its head turns back to pick up an egg from its back. The egg is the knowledge of the past; the forward-facing feet say that you keep moving.",
      "Chess players live this idea every day. The games you lost, the patterns you almost saw, the openings that went wrong — reviewing them is how you get stronger. Every game review in Sankofa Chess is a small act of sankofa.",
    ],
    source: "W. Bruce Willis, The Adinkra Dictionary (1998); Akan oral tradition." },
  { slug: "the-wisdom-knot", title: "The wisdom knot", category: "Adinkra", readMinutes: 3, symbol: "nyansapo",
    excerpt: "Adinkra symbols carry whole ideas in a single shape. One of them describes a strong chess player.",
    paragraphs: [
      "Adinkra symbols come from the Asante (Ashanti) region of Ghana, where they were traditionally stamped onto cloth. Each symbol stands for a proverb, a value or a historical idea.",
      "Nyansapo — the wisdom knot — is associated with the idea that a wise person can choose the best means to reach a goal. That is close to a definition of good chess: not the most brilliant move, but the right one for the position.",
      "Dwennimmen, the ram’s horns, stands for strength combined with humility. Anyone who has lost a won game through overconfidence knows why that pairing matters.",
    ],
    source: "W. Bruce Willis, The Adinkra Dictionary (1998)." },
  { slug: "senterej-chess-at-the-ethiopian-court", title: "Senterej: chess at the Ethiopian court", category: "History", readMinutes: 4, symbol: "board",
    excerpt: "Long before online blitz, Ethiopia had its own version of the game.",
    paragraphs: [
      "Senterej is a traditional Ethiopian form of chess descended from the older shatranj family of games. It was played in Ethiopia for centuries, including at the royal court.",
      "One of its best-known features is its opening: rather than strictly alternating single moves from the first turn, players could develop freely at their own pace until the first capture, after which play alternated normally.",
      "That opening rewards exactly what modern coaches teach: quick, purposeful development. Senterej faded in the twentieth century as international rules spread, but it remains part of Africa’s chess story.",
    ],
    source: "H. J. R. Murray, A History of Chess (1913); Richard Pankhurst’s writings on Ethiopian games." },
  { slug: "oware-and-the-art-of-counting-ahead", title: "Oware and the art of counting ahead", category: "Strategy traditions", readMinutes: 3, symbol: "oware",
    excerpt: "A West African board game that trains the same muscles as chess calculation.",
    paragraphs: [
      "Oware is a mancala game played across Ghana and West Africa; the Yoruba version in Nigeria is known as ayo. Two players sow seeds around a board of pits and capture by landing on the right count.",
      "Good oware players count many sowings ahead and set up captures their opponent doesn’t see coming. It is calculation without pieces — a skill that transfers directly to chess tactics.",
      "Games like oware remind us that strategic thinking has deep roots on the continent. Chess is one vehicle among many.",
    ],
    source: "General ethnographic literature on mancala games (editorial review pending before launch)." },
  { slug: "africas-modern-masters", title: "Africa’s modern masters", category: "Innovators", readMinutes: 4, symbol: "crown",
    excerpt: "The players who put African chess on the world map.",
    paragraphs: [
      "Egypt’s Bassem Amin is widely regarded as Africa’s strongest player of recent years and a multiple African champion.",
      "Zambia’s Amon Simutowe became one of the first grandmasters from sub-Saharan Africa, and South Africa’s Kenny Solomon became the country’s first grandmaster in 2014.",
      "Uganda’s Phiona Mutesi learned the game in the Katwe neighbourhood of Kampala and represented her country at Chess Olympiads; her story was told in the 2016 film Queen of Katwe.",
      "Each of them started somewhere ordinary. The next one could be starting today.",
    ],
    source: "FIDE records and public reporting (editorial review pending before launch)." },
  { slug: "the-oldest-trap-on-the-board", title: "The oldest trap on the board", category: "History", readMinutes: 3, symbol: "arabian",
    excerpt: "A rook and knight pattern that has been winning games for over a thousand years.",
    paragraphs: [
      "The Arabian mate — rook and knight trapping a king in the corner — is one of the oldest checkmate patterns on record, found in early Arabic writings on shatranj, the ancestor of modern chess.",
      "Chess itself travelled through the Islamic world and across North Africa into Spain and the rest of Europe. The game Europe inherited had already passed through many African and Arab hands.",
      "You can solve this exact pattern in the puzzle set. Old wisdom still wins games.",
    ],
    source: "H. J. R. Murray, A History of Chess (1913)." },
];

export const CHALLENGES: SeedChallenge[] = [
  { slug: "daily-3-puzzles", title: "Solve 3 puzzles", description: "Keep your pattern memory sharp.", type: "daily", metric: "puzzles_solved", period: "day", target: 3, rewardXp: 50, href: "/app/puzzles" },
  { slug: "weekly-10-games", title: "Play 10 games", description: "Any time control, any opponent.", type: "weekly", metric: "games_played", period: "week", target: 10, rewardXp: 150, href: "/app/play" },
  { slug: "learning-2-lessons", title: "Complete 2 lessons", description: "Two new ideas this week.", type: "learning", metric: "lessons_completed", period: "week", target: 2, rewardXp: 80, href: "/app/learn" },
  { slug: "strategy-win-after-lesson", title: "Win a game after completing a lesson", description: "Learn it, then use it.", type: "strategy", metric: "win_after_lesson", period: "week", target: 1, rewardXp: 100, href: "/app/learn" },
];

export const ACHIEVEMENTS: SeedAchievement[] = [
  { slug: "first-victory", name: "First Victory", description: "Win your first game", icon: "medal", requirement: { metric: "wins", count: 1 } },
  { slug: "puzzle-solver", name: "Puzzle Solver", description: "Solve 5 different puzzles", icon: "brain", requirement: { metric: "puzzles_solved", count: 5 } },
  { slug: "seven-day-streak", name: "7 Day Streak", description: "Train 7 days in a row", icon: "flame", requirement: { metric: "best_streak", count: 7 } },
  { slug: "fifty-games", name: "50 Games", description: "Play 50 games", icon: "swords", requirement: { metric: "games_played", count: 50 } },
  { slug: "student", name: "Student", description: "Complete 5 lessons", icon: "book-open", requirement: { metric: "lessons_completed", count: 5 } },
  { slug: "go-back-and-get-it", name: "Go Back and Get It", description: "Review a game with the coach", icon: "rotate-ccw", requirement: { metric: "games_reviewed", count: 1 } },
  { slug: "sharp-eye", name: "Sharp Eye", description: "Solve 5 puzzles in a row first time", icon: "zap", requirement: { metric: "best_puzzle_run", count: 5 } },
  { slug: "strategist", name: "Strategist", description: "Reach Sankofa Level 4", icon: "crown", requirement: { metric: "sankofa_level", count: 4 } },
];

/** Seeded demo players so the leaderboard feels alive before real rated play. */
export const DEMO_PLAYERS: { username: string; displayName: string; country: string; rating: number; xp: number; games: number }[] = [
  { username: "kwame_opens", displayName: "Kwame", country: "GH", rating: 1842, xp: 2350, games: 212 },
  { username: "adaeze.k", displayName: "Adaeze", country: "NG", rating: 1795, xp: 2140, games: 190 },
  { username: "nairobi_knight", displayName: "Wanjiru", country: "KE", rating: 1760, xp: 1720, games: 164 },
  { username: "rook_of_rabat", displayName: "Youssef", country: "MA", rating: 1712, xp: 1610, games: 151 },
  { username: "tamale_tactics", displayName: "Fuseini", country: "GH", rating: 1655, xp: 1480, games: 140 },
  { username: "zanele_z", displayName: "Zanele", country: "ZA", rating: 1610, xp: 1210, games: 122 },
  { username: "bruxelles_b", displayName: "Bram", country: "BE", rating: 1588, xp: 1150, games: 118 },
  { username: "kofi_endgames", displayName: "Kofi", country: "GH", rating: 1540, xp: 980, games: 104 },
  { username: "lagos_lion", displayName: "Tunde", country: "NG", rating: 1497, xp: 940, games: 97 },
  { username: "addis_senterej", displayName: "Selam", country: "ET", rating: 1463, xp: 720, games: 88 },
  { username: "mariama.b", displayName: "Mariama", country: "SN", rating: 1420, xp: 650, games: 81 },
  { username: "antwerp_ama", displayName: "Ama", country: "BE", rating: 1388, xp: 610, games: 76 },
  { username: "kigali_queen", displayName: "Aline", country: "RW", rating: 1342, xp: 540, games: 70 },
  { username: "yaw_forks", displayName: "Yaw", country: "GH", rating: 1301, xp: 420, games: 61 },
  { username: "dakar_dev", displayName: "Moussa", country: "SN", rating: 1255, xp: 380, games: 55 },
  { username: "kl_castles", displayName: "Aiman", country: "MY", rating: 1214, xp: 300, games: 47 },
  { username: "abena_plays", displayName: "Abena", country: "GH", rating: 1170, xp: 260, games: 40 },
  { username: "accra_pawn", displayName: "Efua", country: "GH", rating: 1088, xp: 180, games: 29 },
  { username: "london_luft", displayName: "Sam", country: "GB", rating: 1046, xp: 140, games: 22 },
  { username: "new_seed_22", displayName: "Chidi", country: "NG", rating: 902, xp: 40, games: 6 },
];

/** A demo account you can actually log into (local/staging only — delete before public launch). */
export const DEMO_LOGIN = { email: "demo@sankofachess.app", password: "sankofa-demo-2026", username: "sankofa_demo", displayName: "Marwan", country: "GH" };
