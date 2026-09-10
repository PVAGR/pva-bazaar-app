/**
 * Static route catalog for universal search.
 * Admin/authenticated routes are excluded — only public navigation surfaces.
 */
export const STATIC_ROUTES = [
  // Core commerce + archive
  { path: '/marketplace', title: 'Marketplace', keywords: ['shop', 'buy', 'sell', 'trade', 'commerce', 'goods', 'items'] },
  { path: '/archive', title: 'Archive', keywords: ['library', 'writings', 'knowledge', 'documents', 'entries'] },
  { path: '/writings', title: 'Writings', keywords: ['essays', 'notes', 'long-form', 'archive'] },
  { path: '/library', title: 'Library', keywords: ['archive', 'writings', 'documents', 'knowledge'] },

  // Books
  { path: '/books', title: 'Books', keywords: ['publishing', 'read', 'manuscripts', 'publications'] },
  { path: '/books/published', title: 'Published Books', keywords: ['shelf', 'read', 'download', 'pdf', 'epub'] },

  // Blog
  { path: '/blog', title: 'Blog', keywords: ['posts', 'articles', 'news', 'updates'] },

  // Partners + community
  { path: '/partnerships', title: 'Partnerships', keywords: ['suppliers', 'institutions', 'collaboration', 'schools', 'museums'] },
  { path: '/partners', title: 'Partner Program', keywords: ['makers', 'artisans', 'network', 'join'] },

  // Support + about
  { path: '/about', title: 'About', keywords: ['pva', 'bazaar', 'pure life', 'knowledge', 'mission'] },
  { path: '/contact', title: 'Contact', keywords: ['support', 'inquiries', 'help', 'email'] },
  { path: '/get-started', title: 'Get Started', keywords: ['register', 'join', 'account', 'sign up'] },
  { path: '/referral', title: 'Referral Rewards', keywords: ['earn', 'kickback', 'code', 'share'] },
  { path: '/provenance', title: 'Provenance', keywords: ['trust', 'origins', 'supply chain', 'verification', 'sourcing'] },
  { path: '/portfolio', title: 'Portfolio', keywords: ['projects', 'work', 'samples', 'partnerships'] },
  { path: '/recovery', title: 'Recovery', keywords: ['continuity', 'install', 'backup', 'restore'] },

  // Civilization/atlas category routes
  { path: '/marketplace/civilization/agriculture', title: 'Agriculture', keywords: ['coffee', 'tea', 'spices', 'herbs', 'seeds', 'plants'] },
  { path: '/marketplace/civilization/geology', title: 'Geology', keywords: ['minerals', 'gemstones', 'fossils', 'meteorites', 'mining'] },
  { path: '/marketplace/civilization/materials', title: 'Materials', keywords: ['wood', 'stone', 'metals', 'fibers', 'leather', 'dyes'] },
  { path: '/marketplace/civilization/education', title: 'Education', keywords: ['kits', 'curricula', 'lab', 'supplies', 'museum', 'replicas'] },
  { path: '/marketplace/civilization/craft', title: 'Craft', keywords: ['textiles', 'ceramics', 'glass', 'woodworking', 'artisan'] },
  { path: '/marketplace/civilization/trade', title: 'Trade', keywords: ['import', 'export', 'shipping', 'sourcing', 'fulfillment', 'logistics'] },
  { path: '/institutions', title: 'Institutions', keywords: ['universities', 'schools', 'museums', 'governments', 'labs', 'libraries', 'ngos'] },
  { path: '/civilization-library', title: 'Civilization Library', keywords: ['collaborative', 'articles', 'knowledge', 'editor', 'moderation'] },
  { path: '/showroom', title: 'Showroom', keywords: ['featured', 'collections', 'showcase', 'display'] },

  // Governance
  { path: '/proposals', title: 'Governance', keywords: ['proposal', 'board', 'endorsement', 'civic', 'vote'] },
  { path: '/forum', title: 'Forum', keywords: ['discussion', 'civic', 'community', 'vote'] },
  { path: '/treasury', title: 'Treasury', keywords: ['balances', 'transparency', 'ledger', 'finance'] },

  // Misc
  { path: '/creator', title: 'Supplier Portal', keywords: ['artisan', 'maker', 'submit', 'products'] },
  { path: '/cart', title: 'Cart', keywords: ['checkout', 'shopping', 'buy'] },
  { path: '/heelkawn', title: 'HeelKawn', keywords: ['game', 'armory', 'hub', 'download'] },
];

/**
 * Search static routes for matches against query.
 * @param {string} query - Search query (min 2 chars)
 * @param {number} limit - Max results (default 10)
 * @returns {Array<{type:'route', id:string, title:string, subtitle:string, path:string}>}
 */
export function searchRoutes(query, limit = 10) {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase();
  const results = [];

  for (const route of STATIC_ROUTES) {
    const titleMatch = route.title.toLowerCase().includes(q);
    const pathMatch = route.path.toLowerCase().includes(q);
    const keywordMatch = route.keywords?.some(k => k.includes(q));

    if (titleMatch || pathMatch || keywordMatch) {
      results.push({
        type: 'route',
        id: route.path,
        title: route.title,
        subtitle: route.path,
        path: route.path,
      });
    }

    if (results.length >= limit) break;
  }

  return results;
}
