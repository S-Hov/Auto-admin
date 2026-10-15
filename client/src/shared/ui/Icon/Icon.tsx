import type { CSSProperties } from 'react';
import './Icon.css';
import { getIconById, getIconSvgContent } from '../../assets/icons-catalog';

export interface IconProps {
    icon: string | null;
    className?: string;
}

const masks = new Map<string, string>();

function getMask(component: string): string | undefined {
    const cached = masks.get(component);
    if (cached) return cached;
    const source = getIconSvgContent(component);
    if (!source) return undefined;
    // Каталог не содержит цветов. В маске восстанавливаем контуры и заливки.
    const normalized = source.replace(/<svg\b[^>]*>/, (tag) => `${tag}<style>
        [stroke-width]:not([stroke="none"]) { stroke: black; }
        path[stroke="none"]:not([fill="none"]), rect[stroke="none"]:not([fill="none"]), circle[stroke="none"]:not([fill="none"]), polygon[stroke="none"]:not([fill="none"]) { fill: black; }
    </style>`);
    const url = `data:image/svg+xml,${encodeURIComponent(normalized)}`;
    masks.set(component, url);
    return url;
}

export function Icon({ icon, className = '' }: IconProps) {
    const meta = getIconById(icon ?? '') ?? getIconById('menu-grid-2x2-squares');
    const url = meta ? getMask(meta.component) : undefined;
    return (
        <span
            className={`ui-icon ${className}`}
            aria-hidden="true"
            style={url ? { '--ui-icon': `url("${url}")` } as CSSProperties : undefined}
        />
    );
}
