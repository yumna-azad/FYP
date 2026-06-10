// Local, offline business assistant for SmartLoc.
// Grounds answers in the same 12-area dataset and seasonality the ML service
// uses (backend/ml/features.py), so the chatbot stays useful even when the
// Gemini API is unavailable (no key, dead key, or regional `limit: 0` quota).
//
// Talks like a practical location advisor: "walk-in customers" not "footfall",
// "busy season" not "peak", "similar businesses nearby" not "competition".

const AREAS = [
  { name: "Town Centre / Main Street", rent: 110000, footfall: 0.95, competition: 0.95, note: "high traffic, right by the bus stand" },
  { name: "Gregory Lake Front",        rent: 220000, footfall: 1.0,  competition: 0.7,  note: "premium tourist hub" },
  { name: "Hakgala Road",              rent: 80000,  footfall: 0.65, competition: 0.4,  note: "tourist corridor with tea-estate views" },
  { name: "Pedro / Hill Club Area",    rent: 95000,  footfall: 0.6,  competition: 0.55, note: "heritage, upscale" },
  { name: "Nanu Oya",                  rent: 45000,  footfall: 0.5,  competition: 0.3,  note: "transit point by the train station" },
  { name: "Ambewela",                  rent: 30000,  footfall: 0.35, competition: 0.15, note: "rural and scenic, dairy country" },
  { name: "Kandapola",                 rent: 40000,  footfall: 0.4,  competition: 0.2,  note: "tea country, niche tourism" },
  { name: "Glencairn",                 rent: 35000,  footfall: 0.3,  competition: 0.15, note: "quiet, budget-friendly" },
  { name: "Hawa Eliya",                rent: 70000,  footfall: 0.55, competition: 0.35, note: "growing residential area" },
  { name: "Lover's Leap",              rent: 60000,  footfall: 0.45, competition: 0.25, note: "waterfall tourism" },
  { name: "Seetha Eliya",              rent: 50000,  footfall: 0.4,  competition: 0.2,  note: "temple tourism" },
  { name: "Tea estates belt",          rent: 25000,  footfall: 0.3,  competition: 0.1,  note: "tea estates, remote" },
];

const PEAK_MONTHS = "April, August and December";
const QUIET_MONTHS = "May, June, July, October and November";

const BUSINESS_TYPES = ["cafe", "restaurant", "retail", "wellness", "hotel"];

// How much each business type leans on walk-in traffic vs. low competition.
// Higher footfallWeight = more traffic-dependent.
const TYPE_PROFILE = {
  cafe:       { footfallWeight: 0.65, label: "cafe" },
  restaurant: { footfallWeight: 0.6,  label: "restaurant" },
  retail:     { footfallWeight: 0.55, label: "retail shop" },
  wellness:   { footfallWeight: 0.4,  label: "wellness center" },
  hotel:      { footfallWeight: 0.7,  label: "hotel" },
};

function lkr(n) {
  return "LKR " + n.toLocaleString();
}

function detectType(msg) {
  if (/\bcaf(e|é)\b|coffee/.test(msg)) return "cafe";
  if (/restaurant|diner|eatery|food/.test(msg)) return "restaurant";
  if (/retail|shop|store|boutique/.test(msg)) return "retail";
  if (/wellness|spa|yoga|salon|massage/.test(msg)) return "wellness";
  if (/hotel|guest\s*house|lodge|stay|accommodation/.test(msg)) return "hotel";
  return null;
}

function detectArea(msg) {
  return AREAS.find((a) => {
    const key = a.name.toLowerCase().split(/[\/]/)[0].trim();
    const firstWord = key.split(" ")[0];
    return msg.includes(key) || (firstWord.length > 3 && msg.includes(firstWord));
  });
}

// Parse a budget figure like "50000", "50,000", "rs 80k", "1.5 lakh".
function detectBudget(msg) {
  const k = msg.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const lakh = msg.match(/(\d+(?:\.\d+)?)\s*(lakh|lac)\b/);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000);
  const plain = msg.replace(/,/g, "").match(/\b(\d{4,8})\b/);
  if (plain) return parseInt(plain[1], 10);
  return null;
}

function scoreAreasForType(type, maxRent) {
  const fw = TYPE_PROFILE[type]?.footfallWeight ?? 0.55;
  let pool = AREAS;
  if (maxRent) pool = AREAS.filter((a) => a.rent <= maxRent * 1.05);
  if (pool.length === 0) pool = AREAS; // budget too low for anything — show all
  return pool
    .map((a) => ({ ...a, score: fw * a.footfall + (1 - fw) * (1 - a.competition) }))
    .sort((x, y) => y.score - x.score);
}

function recommendForType(type, maxRent) {
  const label = TYPE_PROFILE[type]?.label ?? "business";
  const ranked = scoreAreasForType(type, maxRent);
  const top = ranked.slice(0, 3);
  const budgetNote = maxRent
    ? ` within your ${lkr(maxRent)}/month budget`
    : "";
  const lines = top.map((a, i) => {
    const traffic = a.footfall >= 0.7 ? "strong walk-in traffic" : a.footfall >= 0.45 ? "steady walk-in traffic" : "quieter foot traffic";
    const comp = a.competition >= 0.6 ? "lots of similar businesses" : a.competition >= 0.35 ? "some competition" : "little competition";
    return `${i + 1}. ${a.name} — ${traffic}, ${comp}. Typical rent ${lkr(a.rent)}/mo (${a.note}).`;
  });
  return `For a ${label}${budgetNote}, the strongest fits are:\n\n${lines.join("\n")}\n\nTip: busy season is ${PEAK_MONTHS}; expect a dip during ${QUIET_MONTHS}.`;
}

function areaProfile(a, type) {
  const traffic = a.footfall >= 0.7 ? "Strong walk-in traffic" : a.footfall >= 0.45 ? "Steady walk-in traffic" : "Quieter, low foot traffic";
  const comp = a.competition >= 0.6 ? "crowded with similar businesses" : a.competition >= 0.35 ? "moderate competition" : "very little competition";
  let verdict = "";
  if (type) {
    const ranked = scoreAreasForType(type);
    const rank = ranked.findIndex((x) => x.name === a.name) + 1;
    verdict = `\n\nFor a ${TYPE_PROFILE[type].label}, it ranks around #${rank} of 12 on our list.`;
  }
  return `${a.name} (${a.note}). ${traffic}, and it's ${comp}. Typical rent is ${lkr(a.rent)}/month. Busy season is ${PEAK_MONTHS}; quieter during ${QUIET_MONTHS}.${verdict}`;
}

function cheapestAreas() {
  const cheap = [...AREAS].sort((a, b) => a.rent - b.rent).slice(0, 4);
  return (
    "If budget is tight, these are the most affordable areas:\n\n" +
    cheap.map((a, i) => `${i + 1}. ${a.name} — ${lkr(a.rent)}/mo (${a.note}).`).join("\n") +
    "\n\nThey trade lower rent for quieter foot traffic, so they suit businesses that don't live on walk-ins."
  );
}

function lowCompetitionAreas() {
  const low = [...AREAS].sort((a, b) => a.competition - b.competition).slice(0, 4);
  return (
    "Areas with the least competition (room for a new entrant):\n\n" +
    low.map((a, i) => `${i + 1}. ${a.name} — ${a.note}, rent ${lkr(a.rent)}/mo.`).join("\n") +
    "\n\nTown Centre is the most saturated, so a newcomer fights harder there."
  );
}

function highTrafficAreas() {
  const hi = [...AREAS].sort((a, b) => b.footfall - a.footfall).slice(0, 3);
  return (
    "Best for visibility and walk-in customers:\n\n" +
    hi.map((a, i) => `${i + 1}. ${a.name} — ${a.note}, rent ${lkr(a.rent)}/mo.`).join("\n")
  );
}

function safeForFirstTimer() {
  // Moderate rent, decent traffic, manageable competition.
  const safe = AREAS
    .map((a) => ({ ...a, s: a.footfall * 0.5 + (1 - a.competition) * 0.3 - (a.rent / 220000) * 0.2 }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3);
  return (
    "For a first-time owner, I'd lean toward areas with steady traffic but manageable rent and competition:\n\n" +
    safe.map((a, i) => `${i + 1}. ${a.name} — ${a.note}, rent ${lkr(a.rent)}/mo.`).join("\n") +
    "\n\nThey're easier to break even on than premium spots like Gregory Lake Front."
  );
}

// Main entry point. Returns a helpful answer string for any question.
export function answerLocally(rawText) {
  const msg = (rawText || "").toLowerCase().trim();

  if (!msg) return "Ask me about areas, budgets, the best month to open, competition, or risks.";

  if (/^(hi|hello|hey|hiya|yo|howdy|good\s*(morning|afternoon|evening)|hola|sup)\b/.test(msg))
    return "Hey! I can help you pick an area in Nuwara Eliya, weigh budget vs. walk-in traffic, find the best month to open, or talk through risks. What are you planning?";
  if (/^(thanks|thank you|ty|thx|cheers|appreciate)/.test(msg))
    return "Anytime. Want me to compare a couple of specific areas?";
  if (/^(bye|goodbye|see ya|later|cya|ok bye)/.test(msg))
    return "Good luck with the business! Come back to run more recommendations any time.";
  if (/\b(help|what can you do|capabilities|menu|options)\b/.test(msg))
    return "I can help with:\n• Which area suits your business type\n• Affordable vs. premium areas\n• Areas with low competition\n• Best month to open\n• Risks to watch\nJust ask in your own words.";

  const type = detectType(msg);
  const area = detectArea(msg);
  const budget = detectBudget(msg);

  // Specific area question
  if (area && !/best|which|recommend|where|compare/.test(msg)) {
    return areaProfile(area, type);
  }

  // Timing / season
  if (/\b(month|when|time|season|open|launch)\b/.test(msg))
    return `Busy season in Nuwara Eliya is ${PEAK_MONTHS} — that's when tourist demand peaks, so aim to open just before. Expect a slowdown during the monsoon months: ${QUIET_MONTHS}.${type ? ` That swing hits a ${TYPE_PROFILE[type].label} harder if it relies on tourists.` : ""}`;

  // Budget / affordability
  if (/\b(budget|cheap|affordable|low\s*cost|tight|small\s*budget)\b/.test(msg) || budget) {
    if (type) return recommendForType(type, budget);
    return cheapestAreas();
  }

  // Competition
  if (/\b(competition|competitor|saturated|crowded|rivals)\b/.test(msg))
    return lowCompetitionAreas();

  // Visibility / tourists
  if (/\b(tourist|visibility|foot\s*fall|footfall|walk\s*-?in|traffic|busy)\b/.test(msg))
    return highTrafficAreas();

  // Risk / safe
  if (/\b(risk|safe|safer|first\s*-?time|beginner|new\s*owner|mistake)\b/.test(msg))
    return safeForFirstTimer();

  // Best area for a business type
  if (type) return recommendForType(type, budget);

  // Generic "which area is best"
  if (/\b(best|which|recommend|where|good area|suggest)\b/.test(msg))
    return "It depends on your business and budget. Tell me the type (cafe, restaurant, retail, wellness, or hotel) and roughly your monthly budget, and I'll rank the areas for you. For example: \"best area for a cafe under 80k\".";

  // Fallback — still useful, points to what I can do
  return "I can rank areas for your business type, weigh budget vs. walk-in traffic, flag competition, and pick the best month to open. Try: \"best area for a small-budget cafe\" or \"which place has lower competition\".";
}

export { BUSINESS_TYPES };
