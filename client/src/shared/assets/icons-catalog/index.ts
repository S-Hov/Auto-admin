export type { IconMeta } from './icons-manifest.ts';
export { ICONS_CATALOG } from './icons-manifest.ts';
import type { IconMeta } from './icons-manifest.ts';
import { ICONS_CATALOG } from './icons-manifest.ts';

// Map of raw SVG markup keyed by filename (e.g. 'menu-hamburger-classic.svg')
const rawSvgModules = import.meta.glob('./svg/*.svg', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

// Map of SVG asset URLs keyed by filename
const urlSvgModules = import.meta.glob('./svg/*.svg', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>;

/**
 * Returns raw SVG string content for an icon component filename (e.g. 'menu-hamburger-classic.svg')
 */
export function getIconSvgContent(componentName: string): string | undefined {
    return rawSvgModules[`./svg/${componentName}`];
}

/**
 * Returns asset URL for an icon component filename
 */
export function getIconSvgUrl(componentName: string): string | undefined {
    return urlSvgModules[`./svg/${componentName}`];
}

/**
 * Get icon metadata by ID
 */
export function getIconById(id: string): IconMeta | undefined {
    return ICONS_CATALOG.find((icon) => icon.id === id);
}

/**
 * Get all available icon categories
 */
export function getAllCategories(): string[] {
    const categories = new Set<string>();
    for (const icon of ICONS_CATALOG) {
        categories.add(icon.category);
    }
    return Array.from(categories);
}

export interface SearchOptions {
    category?: string;
    limit?: number;
}

/**
 * Search icons in English across ID, Name, and Tags.
 * Ranks exact matches higher than partial tag matches.
 */
export function searchIcons(query: string, options: SearchOptions = {}): IconMeta[] {
    const normalized = query.trim().toLowerCase();
    let candidates = ICONS_CATALOG;

    if (options.category) {
        const cat = options.category.toLowerCase();
        candidates = candidates.filter((item) => item.category.toLowerCase() === cat);
    }

    if (!normalized) {
        return options.limit ? candidates.slice(0, options.limit) : candidates;
    }

    const searchTokens = normalized.split(/\s+/).filter(Boolean);

    const scored = candidates
        .map((icon) => {
            const idLower = icon.id.toLowerCase();
            const nameLower = icon.name.toLowerCase();
            const tagsLower = icon.tags.map((t) => t.toLowerCase());

            let score = 0;

            for (const token of searchTokens) {
                if (idLower === token) {
                    score += 100;
                } else if (idLower.includes(token)) {
                    score += 50;
                }

                if (nameLower === token) {
                    score += 80;
                } else if (nameLower.includes(token)) {
                    score += 40;
                }

                const tagExact = tagsLower.some((t) => t === token);
                if (tagExact) {
                    score += 60;
                } else {
                    const tagPartial = tagsLower.some((t) => t.includes(token));
                    if (tagPartial) {
                        score += 20;
                    }
                }
            }

            return { icon, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.icon);

    return options.limit ? scored.slice(0, options.limit) : scored;
}
