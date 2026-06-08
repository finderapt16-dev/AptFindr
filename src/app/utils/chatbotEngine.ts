import type { Apartment } from '../data/apartments';

export type TenantRole = 'student' | 'employee' | 'landlord' | 'admin' | null;

export interface ChatbotContext {
  apartments: Apartment[];
  isLoading: boolean;
  error: string | null;
  userRole: TenantRole;
  userName?: string;
  favoriteCount?: number;
}

export interface ChatbotReply {
  text: string;
  actions?: { label: string; path: string }[];
}

export interface QuickPrompt {
  id: string;
  label: string;
  message: string;
}

export const TENANT_QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'available', label: 'What’s available?', message: 'How many apartments are available right now?' },
  { id: 'cheapest', label: 'Cheapest listings', message: 'What are the cheapest apartments?' },
  { id: 'budget', label: 'Under ₱5,000', message: 'Show apartments under 5000 pesos' },
  { id: 'favorites', label: 'Favorites', message: 'How do I save and view favorites?' },
  { id: 'contact', label: 'Contact landlord', message: 'How do I contact a landlord?' },
  { id: 'map', label: 'Map view', message: 'Why can’t I see the map on browse?' },
];

function publishedListings(apartments: Apartment[]): Apartment[] {
  return apartments.filter((apt) => apt.isPublished !== false);
}

function formatPrice(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}

function listingLine(apt: Apartment, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : '• ';
  return `${prefix}**${apt.title}** — ${formatPrice(apt.price)}/mo · ${apt.bedrooms} bed · ${apt.city || 'La Paz'}`;
}

function topListings(list: Apartment[], limit = 3): string {
  if (list.length === 0) {
    return '';
  }

  return list
    .slice(0, limit)
    .map((apt, i) => listingLine(apt, i))
    .join('\n');
}

function extractMaxBudget(message: string): number | null {
  const normalized = message.toLowerCase().replace(/,/g, '');
  const patterns = [
    /(?:under|below|less than|max|maximum|up to)\s*(?:₱|php|peso?s?)?\s*(\d{3,6})/i,
    /(?:₱|php)\s*(\d{3,6})/i,
    /\b(\d{3,6})\s*(?:pesos?|php|₱)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

function matchesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function findApartmentByName(list: Apartment[], query: string): Apartment | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  return (
    list.find((apt) => apt.title.toLowerCase() === q) ||
    list.find((apt) => apt.title.toLowerCase().includes(q)) ||
    list.find((apt) => apt.address.toLowerCase().includes(q))
  );
}

export function getTenantWelcome(userName?: string): string {
  const greeting = userName ? `Hi ${userName.split(' ')[0]}!` : 'Hi there!';
  return `${greeting} I'm your **Apartment Finder** assistant for La Paz, Iloilo City.

I can answer questions using **live listings** from the database — availability, prices, favorites, maps, and how to reach landlords.

Tap a quick question below, or type anything on your mind.`;
}

export function generateChatbotReply(userMessage: string, ctx: ChatbotContext): ChatbotReply {
  const text = userMessage.trim();
  const lower = text.toLowerCase();

  if (ctx.isLoading) {
    return {
      text: 'I’m still loading the latest apartments from the database. Give me a moment, then ask again — for example: “How many apartments are available?”',
    };
  }

  if (ctx.error) {
    return {
      text: `I couldn’t load listings right now (${ctx.error}). Check your internet connection and Supabase settings, then refresh the page. You can still browse help topics like favorites, contacting landlords, or using filters.`,
      actions: [{ label: 'Open Browse', path: '/browse' }],
    };
  }

  const listings = publishedListings(ctx.apartments);
  const isTenant = ctx.userRole === 'student' || ctx.userRole === 'employee';

  // Greetings
  if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening|kumusta)/)) {
    return {
      text: isTenant
        ? `Hello! I’m here to help you find a place in La Paz. Right now there ${listings.length === 1 ? 'is' : 'are'} **${listings.length}** published listing${listings.length === 1 ? '' : 's'}.\n\nAsk about price, location, favorites, or how to contact a landlord.`
        : 'Hello! I can help with apartment search tips and how this platform works in La Paz, Iloilo City.',
      actions: listings.length > 0 ? [{ label: 'Browse listings', path: '/browse' }] : undefined,
    };
  }

  // Availability / count
  if (
    matchesAny(lower, [
      'how many',
      'any apartment',
      'any listing',
      'available now',
      'what is available',
      "what's available",
      'are there apartments',
      'do you have',
    ])
  ) {
    if (listings.length === 0) {
      return {
        text: 'There are **no published apartments** in the database yet. That’s why Browse may look empty and the map won’t appear until at least one listing exists.\n\nOnce landlords add listings, you’ll see them on **Browse** (Grid or Map). Check back soon or ask your landlord to post a unit.',
        actions: [{ label: 'Go to Browse', path: '/browse' }],
      };
    }

    const prices = listings.map((a) => a.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return {
      text: `There are **${listings.length}** published apartment${listings.length === 1 ? '' : 's'} right now.\n\nRent ranges from **${formatPrice(min)}** to **${formatPrice(max)}** per month.\n\nOpen **Browse** to filter by price, bedrooms, parking, and more.`,
      actions: [
        { label: 'Browse all', path: '/browse' },
        { label: 'My dashboard', path: '/dashboard' },
      ],
    };
  }

  // Cheapest / affordable
  if (
    matchesAny(lower, ['cheapest', 'lowest price', 'most affordable', 'budget friendly', 'affordable'])
  ) {
    if (listings.length === 0) {
      return {
        text: 'No listings to compare yet. When apartments are added, I can show you the cheapest options instantly.',
        actions: [{ label: 'Browse', path: '/browse' }],
      };
    }

    const sorted = [...listings].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];

    return {
      text: `Here are the **lowest-priced** options I see:\n\n${topListings(sorted)}\n\nCheapest overall: **${cheapest.title}** at **${formatPrice(cheapest.price)}/month**.`,
      actions: [{ label: 'View on Browse', path: '/browse' }],
    };
  }

  // Budget filter from natural language
  const maxBudget = extractMaxBudget(lower);
  if (
    maxBudget !== null ||
    matchesAny(lower, ['under', 'below', 'less than', 'budget', 'afford'])
  ) {
    const cap = maxBudget ?? 5000;
    const affordable = listings.filter((a) => a.price <= cap).sort((a, b) => a.price - b.price);

    if (listings.length === 0) {
      return {
        text: 'No apartments in the database yet. Try again after listings are published.',
      };
    }

    if (affordable.length === 0) {
      const cheapest = [...listings].sort((a, b) => a.price - b.price)[0];
      return {
        text: `Nothing is listed at or below **${formatPrice(cap)}**/month right now.\n\nThe cheapest option is **${cheapest.title}** at **${formatPrice(cheapest.price)}/month**. Try raising your budget filter on Browse.`,
        actions: [{ label: 'Adjust filters on Browse', path: '/browse' }],
      };
    }

    return {
      text: `**${affordable.length}** listing${affordable.length === 1 ? '' : 's'} at or below **${formatPrice(cap)}**/month:\n\n${topListings(affordable)}\n\nUse the price slider on Browse to narrow results further.`,
      actions: [{ label: 'Open Browse', path: '/browse' }],
    };
  }

  // Search by name / “tell me about …”
  const aboutMatch = lower.match(/(?:about|named|called|listing)\s+(.+)$/);
  if (aboutMatch?.[1] || lower.startsWith('show me ')) {
    const query = (aboutMatch?.[1] ?? lower.replace('show me ', '')).trim();
    const match = findApartmentByName(listings, query);

    if (match) {
      return {
        text: `**${match.title}**\n${formatPrice(match.price)}/month · ${match.bedrooms} bed · ${match.bathrooms} bath\n${match.address}, ${match.city}\n\n${match.description.slice(0, 200)}${match.description.length > 200 ? '…' : ''}`,
        actions: [{ label: 'View details', path: `/apartment/${match.id}` }],
      };
    }

    if (listings.length > 0) {
      return {
        text: `I couldn’t find a listing matching “${query}”. Try the exact title from Browse, or ask “What’s available?” to see current options.`,
        actions: [{ label: 'Browse listings', path: '/browse' }],
      };
    }
  }

  // Map visibility (common tenant question)
  if (matchesAny(lower, ['map', 'pin', 'location on map', 'see the map', "can't see map", 'cannot see map'])) {
    if (listings.length === 0) {
      return {
        text: 'On **Browse**, the map only appears when at least one apartment matches your filters. With **zero listings** in the database, you’ll see “No apartments match your filters” instead of the map.\n\nEach listing’s **detail page** still has its own map once data exists.',
        actions: [{ label: 'Go to Browse', path: '/browse' }],
      };
    }

    return {
      text: `**${listings.length}** listing${listings.length === 1 ? '' : 's'} can show on the map. On Browse, switch to **Map** view (next to Grid). If filters hide everything, click **Reset Filters**.\n\nOpen any apartment to see its exact pin in La Paz.`,
      actions: [{ label: 'Open Browse (Map)', path: '/browse' }],
    };
  }

  // Favorites
  if (matchesAny(lower, ['favorite', 'favourites', 'save', 'heart', 'wishlist', 'saved'])) {
    const count =
      ctx.favoriteCount !== undefined
        ? `\n\nYou currently have **${ctx.favoriteCount}** saved.`
        : '';

    return {
      text: `Tap the **heart** on any listing card or detail page to save it. View everything under **Favorites** in your dashboard or the Favorites page.${count}`,
      actions: [
        { label: 'My favorites', path: '/favorites' },
        { label: 'Browse', path: '/browse' },
      ],
    };
  }

  // Contact landlord
  if (
    matchesAny(lower, [
      'contact',
      'call',
      'phone',
      'text',
      'message landlord',
      'reach landlord',
      'owner',
      'inquire',
      'viewing',
      'schedule',
      'book',
    ])
  ) {
    return {
      text: 'Open the apartment you like → **View details**. You’ll find the landlord’s **phone number** and email there (when provided). Contact them directly to ask about availability, rent terms, or a viewing.\n\nThis app does not process payments or bookings — you arrange everything with the landlord.',
      actions: [{ label: 'Browse listings', path: '/browse' }],
    };
  }

  // Report listing
  if (matchesAny(lower, ['report', 'scam', 'fake', 'wrong info', 'misleading', 'problem listing'])) {
    return {
      text: 'On an apartment’s detail page, tap the **flag** icon to **Report a problem** (wrong price, fake photos, etc.). You must be signed in. Admins review reports in the dashboard.\n\nYou can also report general issues from **Dashboard → Report a Problem**.',
      actions: [{ label: 'Browse listings', path: '/browse' }],
    };
  }

  // Browse / search / filter
  if (
    matchesAny(lower, [
      'browse',
      'search',
      'filter',
      'find apartment',
      'looking for',
      'how do i find',
    ])
  ) {
    return {
      text: 'Go to **Browse** (`/browse`). Use the search bar for area or title, set **price range**, bedrooms, and toggles for parking, furnished, or pet-friendly. Sort by recommended, price, or newest.\n\nSave matches with the heart icon.',
      actions: [{ label: 'Open Browse', path: '/browse' }],
    };
  }

  // Price general
  if (matchesAny(lower, ['price', 'cost', 'rent', 'monthly', 'magkano', 'bayad'])) {
    if (listings.length === 0) {
      return {
        text: 'Typical rents in La Paz vary by size and amenities — often roughly **₱3,000–₱15,000+** per month. No live listings yet; check Browse again once landlords publish units.',
        actions: [{ label: 'Browse', path: '/browse' }],
      };
    }

    const prices = listings.map((a) => a.price);
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

    return {
      text: `From current listings: **${formatPrice(Math.min(...prices))}** – **${formatPrice(Math.max(...prices))}**/month (average about **${formatPrice(avg)}**).\n\nUse the price slider on Browse to stay within your budget.`,
      actions: [{ label: 'Browse with filters', path: '/browse' }],
    };
  }

  // Location
  if (matchesAny(lower, ['location', 'where', 'la paz', 'iloilo', 'area', 'address'])) {
    return {
      text: 'Listings focus on **La Paz, Iloilo City**. Each unit includes an address and a map pin. Use Browse → **Map** view to compare locations, or open a listing for the full map.',
      actions: [{ label: 'Browse', path: '/browse' }],
    };
  }

  // Bedrooms / studio
  if (matchesAny(lower, ['bedroom', 'bed ', 'studio', 'room', 'solo', 'shared'])) {
    const byBeds = new Map<number, number>();
    listings.forEach((a) => byBeds.set(a.bedrooms, (byBeds.get(a.bedrooms) ?? 0) + 1));

    if (listings.length === 0) {
      return {
        text: 'When listings are available, filter by minimum bedrooms on Browse — from studio-style units up to multi-bedroom places.',
        actions: [{ label: 'Browse', path: '/browse' }],
      };
    }

    const breakdown = [...byBeds.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([beds, count]) => `• ${beds} bed: **${count}** listing${count === 1 ? '' : 's'}`)
      .join('\n');

    return {
      text: `Bedroom breakdown from live data:\n${breakdown}\n\nSet **Minimum bedrooms** on Browse to narrow results.`,
      actions: [{ label: 'Browse', path: '/browse' }],
    };
  }

  // Amenities
  if (matchesAny(lower, ['amenities', 'wifi', 'internet', 'parking', 'pet', 'furnished', 'utilities', 'aircon', 'ac '])) {
    const withParking = listings.filter((a) => a.parking).length;
    const withPets = listings.filter((a) => a.petFriendly).length;
    const withFurnished = listings.filter((a) => a.furnished).length;

    if (listings.length === 0) {
      return {
        text: 'Use Browse filters for **parking**, **furnished**, and **pet-friendly** once listings exist. Many landlords also list WiFi, water, and security in the description.',
      };
    }

    return {
      text: `From **${listings.length}** current listings:\n• Parking: **${withParking}**\n• Pet-friendly: **${withPets}**\n• Furnished: **${withFurnished}**\n\nToggle these filters on Browse. For WiFi or AC, read each listing’s description and amenities.`,
      actions: [{ label: 'Browse', path: '/browse' }],
    };
  }

  // Dashboard / preferences / settings
  if (matchesAny(lower, ['dashboard', 'overview', 'suggested', 'popular', 'recommend'])) {
    return {
      text: 'Your **Dashboard** shows overview stats, favorites, suggested and popular picks, and recently added units — based on your activity and preferences.',
      actions: [{ label: 'Open dashboard', path: '/dashboard' }],
    };
  }

  if (matchesAny(lower, ['preference', 'settings', 'profile', 'password', 'notification', 'account'])) {
    return {
      text: 'Open **Settings** from the header or dashboard to update your profile, password, and notification preferences (e.g. when a favorited unit is available).',
      actions: [{ label: 'Settings', path: '/settings' }],
    };
  }

  // Student vs employee
  if (matchesAny(lower, ['student', 'employee', 'sign up', 'register', 'account type'])) {
    return {
      text: '**Students** and **employees** can both browse, save favorites, and contact landlords. Choose your role when you **Sign up**. Both use the same Browse experience; your dashboard personalizes suggestions.',
      actions: [{ label: 'Sign up', path: '/signup' }],
    };
  }

  // Help
  if (matchesAny(lower, ['help', 'support', 'assist', 'what can you', 'how does this work'])) {
    return {
      text: 'I can help with:\n\n• **Live availability** and price ranges\n• **Cheapest** or **budget** listings\n• **Browse**, filters, and **map** view\n• **Favorites** and **dashboard**\n• **Contacting landlords** and **reporting** listings\n• **Settings** and account tips\n\nTry a quick button below or ask in your own words.',
    };
  }

  if (matchesAny(lower, ['thank', 'salamat'])) {
    return { text: 'You’re welcome! Good luck finding the right place in La Paz. 🏠' };
  }

  if (matchesAny(lower, ['bye', 'goodbye'])) {
    return { text: 'Goodbye! I’m here whenever you need help apartment hunting.' };
  }

  // Landlord-specific (when role passed — rare in tenant UI)
  if (ctx.userRole === 'landlord') {
    if (matchesAny(lower, ['add', 'list', 'post'])) {
      return {
        text: 'Verified landlords can **Add New Apartment** from the dashboard. Include photos, price, amenities, and map location.',
        actions: [{ label: 'Add apartment', path: '/add-apartment' }],
      };
    }
  }

  // Default
  if (listings.length > 0) {
    const sample = [...listings].sort((a, b) => a.price - b.price).slice(0, 2);
    return {
      text: `I’m not sure I understood that. Here’s what I can do with **${listings.length}** live listing${listings.length === 1 ? '' : 's'}:\n\n${topListings(sample, 2)}\n\nTry asking:\n• “Cheapest apartments”\n• “Under 5000 pesos”\n• “How do I contact the landlord?”\n• “Why can’t I see the map?”`,
      actions: [{ label: 'Browse', path: '/browse' }],
    };
  }

  return {
    text: 'I’m not sure I understood. I can explain **Browse**, **favorites**, **contacting landlords**, **reports**, and **settings** — even before listings are added.\n\nTry: “How many apartments are available?” or use a quick question below.',
    actions: [{ label: 'Browse', path: '/browse' }],
  };
}
