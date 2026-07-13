import type { Apartment } from "../data/apartments";
import {
  getAvailableRoomCount,
  getLowestAvailableRoomPrice,
  isTenantVisibleApartment,
} from "./listingVisibility";
import { hasValidApartmentCoordinates } from "./mapCoordinates";

export type UserRole = "student" | "employee" | "landlord" | "admin" | null;
export type ChatbotCategory =
  | "project_answer"
  | "clarification"
  | "unrelated"
  | "unauthorized"
  | "not_found"
  | "error";

export interface ChatHistoryTurn {
  sender: "user" | "bot";
  text: string;
}

export interface ChatbotContext {
  apartments: Apartment[];
  isLoading: boolean;
  error: string | null;
  userRole: UserRole;
  userId?: string;
  userName?: string;
  favoriteCount?: number;
  history?: ChatHistoryTurn[];
}

export interface ChatbotReply {
  success: boolean;
  message: string;
  category: ChatbotCategory;
  intent?: string;
  actions?: { label: string; path: string }[];
}

export interface QuickPrompt {
  id: string;
  label: string;
  message: string;
  roles: Exclude<UserRole, null>[];
}

const PROJECT_ONLY_MESSAGE =
  "I can only assist with this apartment-finder platform. Ask me about apartment listings, rooms, applications, verification, reports, inspections, notifications, maps, or account settings.";

const ROLE_LABEL: Record<Exclude<UserRole, null>, string> = {
  student: "Student",
  employee: "Employee",
  landlord: "Landlord",
  admin: "Admin",
};

export const QUICK_PROMPTS: QuickPrompt[] = [
  { id: "available", label: "What's available?", message: "How many apartments are available right now?", roles: ["student", "employee"] },
  { id: "cheapest", label: "Cheapest rooms", message: "What are the cheapest available rooms?", roles: ["student", "employee"] },
  { id: "map", label: "Map help", message: "How does the apartment map work?", roles: ["student", "employee"] },
  { id: "favorites", label: "Favorites", message: "How do I save and view favorites?", roles: ["student", "employee"] },
  { id: "add-property", label: "Add property", message: "How do I add a property?", roles: ["landlord"] },
  { id: "manage-rooms", label: "Manage rooms", message: "How do I add or update rooms?", roles: ["landlord"] },
  { id: "verification", label: "Verification", message: "How does landlord verification work?", roles: ["landlord", "admin"] },
  { id: "publish", label: "Publishing", message: "How does apartment approval and publishing work?", roles: ["landlord", "admin"] },
  { id: "reports", label: "Reports", message: "How are reports handled?", roles: ["student", "employee", "landlord", "admin"] },
  { id: "admin-inspection", label: "Inspections", message: "How do admin inspections work?", roles: ["admin"] },
];

export const TENANT_QUICK_PROMPTS = QUICK_PROMPTS.filter((prompt) =>
  prompt.roles.some((role) => role === "student" || role === "employee"),
);

const PROJECT_TERMS = [
  "apartment", "listing", "property", "room", "rent", "price", "availability", "available",
  "tenant", "student", "employee", "landlord", "admin", "dashboard", "browse", "search",
  "filter", "recommend", "favorite", "map", "gis", "location", "address", "pin", "verification",
  "verified", "permit", "tin", "document", "publish", "approve", "inspection", "report",
  "appeal", "violation", "notice", "notification", "settings", "profile", "account",
  "password", "signup", "login", "status", "occupied", "reserved", "maintenance", "view",
  "views", "support", "issue", "problem", "application", "apply", "booking", "preference",
];

const UNRELATED_TERMS = [
  "recipe", "cook", "weather", "stock", "crypto", "movie", "song", "lyrics", "poem",
  "essay", "homework", "math problem", "capital of", "president", "sports", "game score",
  "medical", "diagnose", "lawyer", "investment", "joke", "dating", "translate",
];

const UNSAFE_TERMS = [
  "password", "token", "secret key", "service role", "api key", "env", "environment variable",
  "bypass", "hack", "exploit", "sql injection", "disable rls", "admin password",
];

const INTENT_PATTERNS: Array<{ intent: string; terms: string[] }> = [
  { intent: "security_sensitive", terms: UNSAFE_TERMS },
  { intent: "search_apartments", terms: ["browse", "search", "find", "filter", "looking for", "recommend", "suggest"] },
  { intent: "apartment_availability", terms: ["available", "availability", "how many", "vacant", "open room", "available room"] },
  { intent: "pricing", terms: ["price", "rent", "cheapest", "affordable", "budget", "under", "below", "cost"] },
  { intent: "map_browsing", terms: ["map", "gis", "pin", "location", "coordinates", "address"] },
  { intent: "favorites", terms: ["favorite", "favourites", "heart", "saved", "wishlist"] },
  { intent: "applications", terms: ["application", "apply", "booking", "book", "reservation"] },
  { intent: "reports", terms: ["report", "problem", "fake", "scam", "misleading", "evidence"] },
  { intent: "appeals", terms: ["appeal", "dispute"] },
  { intent: "violations", terms: ["violation", "notice", "revoke", "suspended"] },
  { intent: "landlord_verification", terms: ["verify", "verification", "permit", "tin", "document", "landlord status"] },
  { intent: "publishing", terms: ["publish", "approve", "approval", "visible", "unpublish"] },
  { intent: "add_property", terms: ["add property", "add apartment", "create listing", "post listing", "list property"] },
  { intent: "manage_rooms", terms: ["room", "occupied", "reserved", "maintenance", "manage room", "add room"] },
  { intent: "admin_inspection", terms: ["inspection", "inspect", "admin review", "listing details"] },
  { intent: "notifications", terms: ["notification", "alert", "bell"] },
  { intent: "settings", terms: ["settings", "profile", "account", "password", "preference"] },
  { intent: "navigation", terms: ["where", "open", "go to", "find feature", "page", "route"] },
  { intent: "help", terms: ["help", "support", "what can you", "how does this work"] },
  { intent: "greeting", terms: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"] },
  { intent: "thanks", terms: ["thank", "thanks", "salamat"] },
];

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function normalize(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function visibleListings(apartments: Apartment[]): Apartment[] {
  return apartments.filter(isTenantVisibleApartment);
}

function landlordListings(apartments: Apartment[], landlordId?: string): Apartment[] {
  if (!landlordId) return [];
  return apartments.filter((apartment) => apartment.landlordId === landlordId);
}

function formatPrice(amount: number): string {
  return `PHP ${amount.toLocaleString("en-PH")}`;
}

function lowestRoomPrice(apartment: Apartment): number {
  return getLowestAvailableRoomPrice(apartment) ?? apartment.price ?? 0;
}

function listingLine(apartment: Apartment, index?: number): string {
  const prefix = index === undefined ? "- " : `${index + 1}. `;
  const rooms = getAvailableRoomCount(apartment);
  const price = getLowestAvailableRoomPrice(apartment);
  return `${prefix}**${apartment.title || "Untitled apartment"}** - ${price ? `${formatPrice(price)}/month` : "room price not set"} - ${rooms} available ${rooms === 1 ? "room" : "rooms"} - ${apartment.city || "La Paz"}`;
}

function topListings(apartments: Apartment[], limit = 3): string {
  return apartments.slice(0, limit).map((apartment, index) => listingLine(apartment, index)).join("\n");
}

function extractMaxBudget(message: string): number | null {
  const normalizedMessage = message.replace(/,/g, "");
  const patterns = [
    /(?:under|below|less than|max|maximum|up to)\s*(?:php|peso?s?)?\s*(\d{3,7})/i,
    /(?:php)\s*(\d{3,7})/i,
    /\b(\d{3,7})\s*(?:pesos?|php)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedMessage.match(pattern);
    if (match?.[1]) return Number.parseInt(match[1], 10);
  }

  return null;
}

function classifyMessage(message: string): "project-related" | "unrelated" | "unsafe" | "unclear" {
  const text = normalize(message);
  if (!text) return "unclear";
  if (text.length > 800) return "unsafe";
  if (includesAny(text, UNSAFE_TERMS)) return "unsafe";
  if (includesAny(text, PROJECT_TERMS)) return "project-related";
  if (/^(hi|hello|hey|thanks|thank you|salamat|help|support)\b/.test(text)) return "project-related";
  if (includesAny(text, UNRELATED_TERMS)) return "unrelated";
  if (text.split(" ").length <= 3) return "unclear";
  return "unrelated";
}

function detectIntent(message: string, history: ChatHistoryTurn[] = []): string {
  const text = normalize(message);
  for (const pattern of INTENT_PATTERNS) {
    if (includesAny(text, pattern.terms)) return pattern.intent;
  }

  const previousUserMessage = [...history].reverse().find((turn) => turn.sender === "user")?.text ?? "";
  const previousIntent = previousUserMessage ? detectIntent(previousUserMessage, []) : "";
  if (["what if it is occupied", "what if occupied", "if occupied", "how about occupied"].some((phrase) => text.includes(phrase))) {
    return previousIntent === "manage_rooms" ? "manage_rooms" : "apartment_availability";
  }

  return "unknown";
}

function roleCanAccess(intent: string, role: UserRole): boolean {
  if (!role) return false;
  if (role === "admin") return true;

  const landlordOnly = new Set(["add_property", "manage_rooms"]);
  const adminOnly = new Set(["admin_inspection", "violations"]);

  if (adminOnly.has(intent)) return false;
  if (landlordOnly.has(intent)) return role === "landlord";
  if (intent === "landlord_verification" || intent === "publishing" || intent === "appeals") {
    return role === "landlord";
  }

  return true;
}

function reply(message: string, category: ChatbotCategory, intent: string, actions?: ChatbotReply["actions"], success = true): ChatbotReply {
  return { success, message, category, intent, actions };
}

function currentRoleLabel(role: UserRole): string {
  return role ? ROLE_LABEL[role] : "Account";
}

export function getQuickPromptsForRole(role: UserRole): QuickPrompt[] {
  const resolvedRole = role ?? "student";
  return QUICK_PROMPTS.filter((prompt) => prompt.roles.includes(resolvedRole));
}

export function getChatbotWelcome(userName?: string, role: UserRole = null): string {
  const greeting = userName ? `Hi ${userName.split(" ")[0]}!` : "Hi there!";
  return `${greeting} I'm your **${currentRoleLabel(role)} platform assistant**.

I can help only with this apartment-finder platform: listings, rooms, maps, verification, reports, inspections, notifications, settings, and role-specific workflows.`;
}

export const getTenantWelcome = (userName?: string): string => getChatbotWelcome(userName, "student");

function tenantDataAnswer(intent: string, text: string, ctx: ChatbotContext): ChatbotReply | null {
  const listings = visibleListings(ctx.apartments);

  if (intent === "apartment_availability") {
    if (listings.length === 0) {
      return reply(
        "I could not find any tenant-visible apartments right now. A listing must be published, approved, active, owned by a verified landlord, and have at least one available room before tenants can see it.",
        "not_found",
        intent,
        [{ label: "Open Browse", path: "/browse" }],
      );
    }

    const rooms = listings.reduce((total, apartment) => total + getAvailableRoomCount(apartment), 0);
    return reply(
      `There are **${listings.length}** tenant-visible apartments with **${rooms}** available ${rooms === 1 ? "room" : "rooms"} right now.\n\n${topListings(listings.sort((a, b) => lowestRoomPrice(a) - lowestRoomPrice(b)))}`,
      "project_answer",
      intent,
      [{ label: "Browse apartments", path: "/browse" }],
    );
  }

  if (intent === "pricing") {
    const maxBudget = extractMaxBudget(text);
    const pricedListings = listings.filter((apartment) => getLowestAvailableRoomPrice(apartment) !== null);
    if (pricedListings.length === 0) {
      return reply("I could not find available room prices in the platform right now.", "not_found", intent);
    }

    const sorted = [...pricedListings].sort((a, b) => lowestRoomPrice(a) - lowestRoomPrice(b));
    const matches = maxBudget ? sorted.filter((apartment) => lowestRoomPrice(apartment) <= maxBudget) : sorted;
    if (matches.length === 0 && maxBudget) {
      return reply(
        `I could not find any available rooms at or below **${formatPrice(maxBudget)}**. The lowest available room I can see is **${formatPrice(lowestRoomPrice(sorted[0]))}** at **${sorted[0].title}**.`,
        "not_found",
        intent,
        [{ label: "Adjust filters", path: "/browse" }],
      );
    }

    return reply(
      `${maxBudget ? `Available rooms at or below **${formatPrice(maxBudget)}**:` : "Lowest available room rents:"}\n\n${topListings(matches)}`,
      "project_answer",
      intent,
      [{ label: "Open Browse", path: "/browse" }],
    );
  }

  if (intent === "map_browsing") {
    const mapped = listings.filter((apartment) => hasValidApartmentCoordinates(apartment.lat, apartment.lng));
    return reply(
      `Use **Browse -> Map** to view apartment pins. The map uses each apartment's saved latitude and longitude. Listings without a real map pin are not shown as fake markers.\n\nCurrent map-ready tenant listings: **${mapped.length}** of **${listings.length}**.`,
      "project_answer",
      intent,
      [{ label: "Open Browse", path: "/browse" }],
    );
  }

  if (intent === "favorites") {
    return reply(
      `Tap the heart button on a listing card or apartment details page to save it. Open **Favorites** to review saved apartments.\n\nYour current saved count is **${ctx.favoriteCount ?? 0}**.`,
      "project_answer",
      intent,
      [
        { label: "Favorites", path: "/favorites" },
        { label: "Browse", path: "/browse" },
      ],
    );
  }

  if (intent === "applications") {
    return reply(
      "I could not find tenant application tracking in this platform build. Tenants can browse listings, view apartment details, save favorites, contact landlords using the provided contact details, and report listing problems.",
      "not_found",
      intent,
      [{ label: "Browse apartments", path: "/browse" }],
    );
  }

  return null;
}

function workflowAnswer(intent: string, ctx: ChatbotContext): ChatbotReply | null {
  const role = ctx.userRole;

  if (intent === "search_apartments") {
    return reply(
      "Open **Browse** to search tenant-visible listings. You can filter by area, budget, bedrooms, parking, furnished, and pet-friendly options, then switch between Grid and Map view.",
      "project_answer",
      intent,
      [{ label: "Open Browse", path: "/browse" }],
    );
  }

  if (intent === "reports") {
    const message = role === "admin"
      ? "Admins handle reports from **Dashboard -> Reports**. You can review evidence, view the reported apartment, contact related users through the existing workflow, resolve or dismiss reports, and issue notices or violations when needed."
      : role === "landlord"
        ? "Landlords can review report-related notifications and respond through the landlord dashboard. If a violation or report decision is unfair, use the appeal workflow when available."
        : "Tenants can report a property from the apartment details page or the dashboard report section. Add clear details and optional evidence so admins can investigate.";
    return reply(message, "project_answer", intent, [{ label: "Dashboard", path: "/dashboard?section=reports" }]);
  }

  if (intent === "appeals") {
    return reply(
      role === "admin"
        ? "Admins review appeals from **Dashboard -> Appeals**. Appeals may relate to reports, notices, or violations, and should be handled without deleting the original records."
        : "Landlords can use appeals to respond to report decisions, notices, or violations when the appeal workflow is available in their dashboard.",
      "project_answer",
      intent,
      [{ label: "Open Dashboard", path: "/dashboard?section=appeals" }],
    );
  }

  if (intent === "landlord_verification") {
    return reply(
      role === "admin"
        ? "Admins verify landlords from **Dashboard -> Landlords**. Review permit details, TIN, uploaded verification documents, and violation status before marking a landlord verified."
        : "Landlord verification uses the submitted business permit, TIN when provided, valid ID details, and uploaded supporting documents. Apartments cannot be published to tenants unless the landlord is verified.",
      "project_answer",
      intent,
      [{ label: role === "admin" ? "Review landlords" : "Open Dashboard", path: role === "admin" ? "/dashboard?section=landlords" : "/dashboard?section=overview" }],
    );
  }

  if (intent === "publishing") {
    return reply(
      role === "admin"
        ? "Admins approve or publish apartments from the apartment inspection page. Publishing is blocked unless the owning landlord is verified. Tenant visibility also requires approved, published, active listings with available rooms."
        : "After a landlord submits a property, admins inspect and approve it. The listing becomes visible to tenants only when it is approved or published, active, has available rooms, and the landlord is verified.",
      "project_answer",
      intent,
      [{ label: "Open Dashboard", path: "/dashboard?section=apartments" }],
    );
  }

  if (intent === "add_property") {
    return reply(
      "Use **Add Property** to submit property photos, title, description, verification details, address, map pin, amenities, and features. The property enters admin review after submission.",
      "project_answer",
      intent,
      [{ label: "Add Property", path: "/add-apartment" }],
    );
  }

  if (intent === "manage_rooms") {
    return reply(
      "Use **Manage Rooms** from a landlord property to add rooms, set monthly rent, upload room photos, and mark each room as available, occupied, reserved, or maintenance. Tenant visibility depends on at least one available room.",
      "project_answer",
      intent,
      [{ label: "My Properties", path: "/dashboard?section=properties" }],
    );
  }

  if (intent === "admin_inspection") {
    return reply(
      "Admin inspections happen on the apartment inspection details page. Admins review the gallery, apartment details, rooms, location, landlord information, verification documents, reports count, notes, and approval or publish actions.",
      "project_answer",
      intent,
      [{ label: "Admin apartments", path: "/dashboard?section=apartments" }],
    );
  }

  if (intent === "violations") {
    return reply(
      role === "admin"
        ? "Admins can issue notices or violations from report or inspection workflows. Violations are linked to landlords and can be reviewed from the landlord verification and admin dashboard areas."
        : "If a landlord receives a notice or violation, it appears through the platform's report or notification workflow. Use the appeal option if you need to respond.",
      "project_answer",
      intent,
      [{ label: "Open Dashboard", path: "/dashboard" }],
    );
  }

  if (intent === "notifications") {
    return reply(
      "Notifications appear in the dashboard for role-specific events such as landlord verification updates, apartment submissions, reports, appeals, and admin review activity.",
      "project_answer",
      intent,
      [{ label: "Notifications", path: "/dashboard?section=notifications" }],
    );
  }

  if (intent === "settings") {
    return reply(
      "Open **Settings** to manage profile and account details. Tenant browse preferences are saved per authenticated account, so one tenant's preferences should not appear on another account.",
      "project_answer",
      intent,
      [{ label: "Settings", path: "/settings" }],
    );
  }

  return null;
}

function roleSummary(ctx: ChatbotContext): ChatbotReply {
  const role = ctx.userRole;
  const listings = visibleListings(ctx.apartments);
  const owned = landlordListings(ctx.apartments, ctx.userId);

  if (role === "admin") {
    return reply(
      "I can help admins with landlord verification, apartment inspection, publishing, reports, appeals, notices, violations, notifications, and user-management guidance.",
      "project_answer",
      "help",
      [{ label: "Admin dashboard", path: "/dashboard" }],
    );
  }

  if (role === "landlord") {
    return reply(
      `I can help landlords add properties, manage rooms, understand verification, read market overview metrics, handle reports or appeals, and manage notifications.${owned.length ? `\n\nI can see **${owned.length}** loaded property records for this session.` : ""}`,
      "project_answer",
      "help",
      [
        { label: "My Properties", path: "/dashboard?section=properties" },
        { label: "Add Property", path: "/add-apartment" },
      ],
    );
  }

  return reply(
    `I can help tenants find apartments, understand room availability, use map browsing, save favorites, report listing issues, and manage preferences.\n\nTenant-visible listings loaded now: **${listings.length}**.`,
    "project_answer",
    "help",
    [{ label: "Browse", path: "/browse" }],
  );
}

export function generateChatbotReply(userMessage: string, ctx: ChatbotContext): ChatbotReply {
  const raw = userMessage.trim();
  const text = normalize(raw);

  if (!raw) {
    return reply("Please enter a question about the platform.", "clarification", "empty", undefined, false);
  }

  if (!ctx.userRole) {
    return reply("Please sign in before using the platform assistant.", "unauthorized", "auth", undefined, false);
  }

  const classification = classifyMessage(raw);
  if (classification === "unrelated") {
    return reply(PROJECT_ONLY_MESSAGE, "unrelated", "unrelated", undefined, false);
  }
  if (classification === "unsafe") {
    return reply(
      "I cannot help with secrets, bypassing permissions, credentials, or unsafe access. I can still explain the platform's normal account, verification, and admin workflows.",
      "unauthorized",
      "security_sensitive",
      undefined,
      false,
    );
  }
  if (classification === "unclear") {
    return reply(
      "I need a little more information to help. Are you asking about apartments, rooms, verification, publishing, reports, maps, notifications, or account settings?",
      "clarification",
      "unclear",
    );
  }

  if (ctx.isLoading) {
    return reply("The assistant is loading platform data. Please try again in a moment.", "error", "loading", undefined, false);
  }

  if (ctx.error) {
    return reply(
      "The assistant cannot load live platform data right now. I can still explain general platform workflows, but I cannot verify current listing records until data loads.",
      "error",
      "data_unavailable",
      undefined,
      false,
    );
  }

  const intent = detectIntent(raw, ctx.history);

  if (intent === "greeting") return roleSummary(ctx);
  if (intent === "thanks") return reply("You're welcome. Ask me anytime about this platform's listings, rooms, verification, reports, maps, or settings.", "project_answer", intent);

  if (!roleCanAccess(intent, ctx.userRole)) {
    return reply("You do not have permission to access that information.", "unauthorized", intent, undefined, false);
  }

  const tenantAnswer = tenantDataAnswer(intent, text, ctx);
  if (tenantAnswer) return tenantAnswer;

  const workflow = workflowAnswer(intent, ctx);
  if (workflow) return workflow;

  if (intent === "help" || intent === "unknown" || intent === "navigation") {
    return roleSummary(ctx);
  }

  return reply(
    "I need a little more information to help. Which apartment or feature are you referring to?",
    "clarification",
    intent,
  );
}
