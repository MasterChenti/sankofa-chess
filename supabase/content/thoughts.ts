/**
 * Strategic thoughts: the "Think" pillar.
 * Scenarios have no single right answer. Each option shows how strategists see it,
 * and is tagged with a playful "thinking style" (never presented as psychology).
 */
export type ThinkingStyle = "patient" | "bold" | "diplomatic" | "adaptive" | "principled";

export type SeedThought = {
  slug: string;
  prompt: string;
  context: string;
  options: { key: string; text: string; style: ThinkingStyle; perspective: string }[];
  takeaway: string;
  lessonSlug: string | null; // a related chess lesson
};

export const THOUGHTS: SeedThought[] = [
  {
    slug: "stronger-army-weaker-ground",
    prompt: "You have the stronger army, but your opponent holds the better terrain. Do you attack now or reposition?",
    context: "Strength on paper means little if the ground fights against you.",
    options: [
      { key: "a", text: "Attack now, before they dig in further", style: "bold", perspective: "Sometimes right: time can favour the defender. But attacking uphill wastes your advantage." },
      { key: "b", text: "Reposition and make them come to you", style: "patient", perspective: "Often wisest. Make your strength count by choosing where the fight happens." },
      { key: "c", text: "Cut their supplies and wait", style: "adaptive", perspective: "Indirect pressure can win without a battle, if you can afford the time." },
    ],
    takeaway: "In chess: before attacking, improve your worst-placed piece. Fight where your pieces are strongest.",
    lessonSlug: "develop-your-pieces",
  },
  {
    slug: "ally-asks-too-much",
    prompt: "An ally offers help you badly need, but asks for something that weakens you later. Do you accept?",
    context: "Short-term rescue, long-term cost.",
    options: [
      { key: "a", text: "Accept: survive today, deal with tomorrow later", style: "adaptive", perspective: "Survival matters. But many kingdoms lost their independence one ‘temporary’ concession at a time." },
      { key: "b", text: "Negotiate the terms down before accepting", style: "diplomatic", perspective: "Usually the best move: you rarely have to accept the first offer." },
      { key: "c", text: "Refuse and find another way", style: "principled", perspective: "Protects your position, if another way really exists." },
    ],
    takeaway: "In chess: a pawn grab that weakens your king is rarely free. Count the long-term cost.",
    lessonSlug: "king-safety",
  },
  {
    slug: "ahead-what-now",
    prompt: "You are clearly winning. Your opponent starts making wild, risky moves. What do you do?",
    context: "The most dangerous moment is often just after you take the lead.",
    options: [
      { key: "a", text: "Go for a quick knockout", style: "bold", perspective: "Fine if it is safe. But chaos is exactly what the losing side wants." },
      { key: "b", text: "Simplify: trade pieces, remove their chances", style: "patient", perspective: "The classic winning method. Fewer pieces means fewer tricks." },
      { key: "c", text: "Check every threat before each move", style: "principled", perspective: "Essential either way. Most won games are lost to one unchecked threat." },
    ],
    takeaway: "When ahead, trade pieces. When behind, keep pieces and complicate.",
    lessonSlug: "exchanges",
  },
  {
    slug: "two-problems-one-move",
    prompt: "You face two problems at once and can only solve one today. How do you choose?",
    context: "Every move is also a decision about what not to do.",
    options: [
      { key: "a", text: "Fix the most urgent", style: "adaptive", perspective: "Usually right: an immediate threat outranks a long-term one." },
      { key: "b", text: "Fix the one that creates the most options afterwards", style: "patient", perspective: "Strong players think this way: choose the move that keeps the most good moves available." },
      { key: "c", text: "Look for one move that helps with both", style: "bold", perspective: "The best answer when it exists, and in chess it often does." },
    ],
    takeaway: "Look for moves that do two jobs: a developing move that also defends, a check that also attacks.",
    lessonSlug: "double-attack",
  },
  {
    slug: "rival-makes-mistake",
    prompt: "Your rival makes a public mistake. You could exploit it now, or quietly let it pass. What do you do?",
    context: "How you win shapes who wants to work with you later.",
    options: [
      { key: "a", text: "Take full advantage: that is competition", style: "bold", perspective: "On a chessboard, absolutely. In life, relationships often matter more than one win." },
      { key: "b", text: "Take the advantage, but with respect", style: "principled", perspective: "Win cleanly, without humiliation. Most respected leaders do this." },
      { key: "c", text: "Let it pass and build trust", style: "diplomatic", perspective: "Sometimes the long game is worth more than the point." },
    ],
    takeaway: "At the board: punish mistakes, every time. After the game: shake hands and learn together.",
    lessonSlug: null,
  },
  {
    slug: "plan-not-working",
    prompt: "You have followed a plan for weeks and it isn’t working. Do you stay the course or change it?",
    context: "Stubbornness and persistence look the same from the inside.",
    options: [
      { key: "a", text: "Stay the course: plans need time", style: "principled", perspective: "Right if the reasons behind the plan are still true." },
      { key: "b", text: "Change it: the situation has changed", style: "adaptive", perspective: "Right if you can name what changed. Changing plans every week is its own mistake." },
      { key: "c", text: "Keep the goal, change the method", style: "patient", perspective: "Often the wisest: be firm on direction, flexible on route." },
    ],
    takeaway: "In chess: if the position changes, your plan must change with it. Ask ‘what does the position need now?’",
    lessonSlug: "control-the-centre",
  },
  {
    slug: "information-or-speed",
    prompt: "You can decide now with half the information, or wait a week for the full picture. Which?",
    context: "Waiting has a cost too.",
    options: [
      { key: "a", text: "Decide now: speed is an advantage", style: "bold", perspective: "Good when the decision can be corrected later." },
      { key: "b", text: "Wait for the full picture", style: "patient", perspective: "Good when the decision is hard to reverse." },
      { key: "c", text: "Decide now, but in a way you can adjust", style: "adaptive", perspective: "Often the best of both: a flexible first step." },
    ],
    takeaway: "In time trouble, pick a safe, flexible move rather than the perfect one.",
    lessonSlug: null,
  },
  {
    slug: "team-of-stars",
    prompt: "You can build a team of brilliant individuals who don’t get along, or solid players who trust each other. Which wins?",
    context: "Ibn Khaldun called the second thing asabiyya: group solidarity.",
    options: [
      { key: "a", text: "The brilliant individuals", style: "bold", perspective: "Talent wins moments. Without coordination, it often loses seasons." },
      { key: "b", text: "The team that trusts each other", style: "principled", perspective: "History is full of cohesive groups beating stronger rivals." },
      { key: "c", text: "Start with trust, then add talent carefully", style: "patient", perspective: "Most lasting teams are built this way." },
    ],
    takeaway: "On the board: pieces that protect each other beat pieces that work alone.",
    lessonSlug: "develop-your-pieces",
  },
  {
    slug: "losing-position",
    prompt: "You are losing badly. Do you resign with dignity or fight on?",
    context: "Hope and stubbornness again look alike.",
    options: [
      { key: "a", text: "Fight on: make them prove it", style: "principled", perspective: "At most levels, opponents miss wins. Many games are saved by refusing to give up." },
      { key: "b", text: "Resign and learn from it", style: "adaptive", perspective: "Reasonable when the result is truly certain, especially against strong players." },
      { key: "c", text: "Set a practical trap and see if they find the answer", style: "bold", perspective: "A fighting mindset: give them a problem to solve." },
    ],
    takeaway: "Before resigning, ask: what is the hardest problem I can still give my opponent?",
    lessonSlug: null,
  },
  {
    slug: "copy-or-create",
    prompt: "A competitor is successful. Do you copy what they do or build something different?",
    context: "The question behind every new venture, including this one.",
    options: [
      { key: "a", text: "Copy the parts that work", style: "adaptive", perspective: "Learning from others is smart, but a copy is always one step behind." },
      { key: "b", text: "Build something different", style: "bold", perspective: "Harder, riskier, and the only way to lead rather than follow." },
      { key: "c", text: "Learn their principles, apply them your own way", style: "patient", perspective: "Sankofa: take what is valuable, make it yours." },
    ],
    takeaway: "Study master games for their ideas, not to memorise their moves.",
    lessonSlug: null,
  },
  {
    slug: "invitation-to-attack",
    prompt: "Your opponent leaves something valuable undefended. It looks too easy. Do you take it?",
    context: "Free things are sometimes the most expensive.",
    options: [
      { key: "a", text: "Take it: a gift is a gift", style: "bold", perspective: "Often correct. But check first: what does their next move do?" },
      { key: "b", text: "Ask why it is undefended before deciding", style: "patient", perspective: "The habit of strong players. Most traps rely on you not asking." },
      { key: "c", text: "Ignore it and stick to your plan", style: "principled", perspective: "Sometimes wise, but turning down real material is also a mistake." },
    ],
    takeaway: "Before any capture: list your opponent’s checks, captures and threats after it.",
    lessonSlug: "legal-moves-and-captures",
  },
  {
    slug: "small-daily-or-big-once",
    prompt: "Which builds more skill: one long session a week, or ten minutes every day?",
    context: "The river is filled by many small streams.",
    options: [
      { key: "a", text: "One long, deep session", style: "bold", perspective: "Depth matters for hard topics, but memory fades between sessions." },
      { key: "b", text: "Ten minutes every day", style: "patient", perspective: "Learning research tends to favour spacing and repetition for retention." },
      { key: "c", text: "Daily practice, plus an occasional deep dive", style: "adaptive", perspective: "Probably the strongest combination." },
    ],
    takeaway: "That is why Sankofa is a daily ritual, not a binge.",
    lessonSlug: null,
  },
  {
    slug: "leader-in-crisis",
    prompt: "In a crisis, a leader can speak first to calm people, or wait until they have the full facts. What matters more?",
    context: "Silence can look like weakness; speed can spread errors.",
    options: [
      { key: "a", text: "Speak early, be honest about what is unknown", style: "diplomatic", perspective: "Usually best: people trust leaders who say what they don’t know." },
      { key: "b", text: "Wait until certain", style: "patient", perspective: "Avoids mistakes, but others will fill the silence." },
      { key: "c", text: "Act first, explain later", style: "bold", perspective: "Effective in emergencies, risky for trust." },
    ],
    takeaway: "At the board: when surprised, don’t react instantly. Take a breath, check the threats, then act.",
    lessonSlug: null,
  },
  {
    slug: "sacrifice",
    prompt: "Would you give up something valuable today for a stronger position tomorrow?",
    context: "Every chess sacrifice asks this question.",
    options: [
      { key: "a", text: "Yes, if I can see what I gain", style: "bold", perspective: "A calculated sacrifice is an investment." },
      { key: "b", text: "Only if I’m sure", style: "patient", perspective: "Careful, but certainty is rare, and opportunities pass." },
      { key: "c", text: "No: hold what you have", style: "principled", perspective: "Solid, but positions that never take risks often drift into passivity." },
    ],
    takeaway: "A sacrifice is only good if you can name what you get: time, an open king, a decisive attack.",
    lessonSlug: "fork",
  },
];
