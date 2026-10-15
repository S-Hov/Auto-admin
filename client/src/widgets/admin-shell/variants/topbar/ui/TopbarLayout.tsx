import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppLocale } from '../../../../../app/routing/locale/use-app-locale';
import { appPaths } from '../../../../../app/routing/app-paths';
import UserPanel from '../../../../user-panel/ui/UserPanel';
import type { AdminShellVariantProps, MenuNode } from '../../../model/admin-shell.types';
import { getTopbarPosition } from '../model/topbar-position';
import { MenuIcon } from '../../../ui/MenuIcon';
import { DotsLoader } from '../../../../../shared/ui/Loader';
import { Button } from '../../../../../shared/ui/Button/Button';
import './TopbarLayout.css';

const menuPath = (locale: string, slug: string) => `/${locale}/pages/${encodeURIComponent(slug)}`;
function isBranchActive(node: MenuNode, locale: string, pathname: string): boolean {
    return pathname === menuPath(locale, node.slug) || node.children.some((item) => isBranchActive(item, locale, pathname));
}

function DropdownItems({ items, onNavigate }: { items: MenuNode[]; onNavigate: () => void }) {
    const locale = useAppLocale();
    const { pathname } = useLocation();
    return <ul className="topbar-dropdown-list">
        {items.map((item) => <li key={item.id}>
            {item.children.length ? <details className="topbar-subgroup" open={isBranchActive(item, locale, pathname)}>
                <summary className="topbar-dropdown-row" data-active={isBranchActive(item, locale, pathname)}>
                    <MenuIcon icon={item.icon} /><span>{item.name}</span><span className="topbar-arrow" aria-hidden="true" />
                </summary>
                <div className="topbar-subitems"><DropdownItems items={item.children} onNavigate={onNavigate} /></div>
            </details> : <NavLink to={menuPath(locale, item.slug)} onClick={onNavigate} className={({ isActive }) => `topbar-dropdown-row${isActive ? ' is-active' : ''}`}>
                <MenuIcon icon={item.icon} /><span>{item.name}</span><span className="topbar-link-mark" aria-hidden="true">↗</span>
            </NavLink>}
        </li>)}
    </ul>;
}

interface Popup {
    id: number;
    position: ReturnType<typeof getTopbarPosition>;
}

export default function TopbarLayout({ children, menuState, onRetryMenu }: AdminShellVariantProps) {
    const locale = useAppLocale();
    const { pathname } = useLocation();
    const navigationId = useId();
    const header = useRef<HTMLElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const triggers = useRef(new Map<number, HTMLButtonElement>());
    const [mobileOpen, setMobileOpen] = useState(false);
    const [popup, setPopup] = useState<Popup | null>(null);
    const selectedNode = menuState.status === 'ready' ? menuState.items.find((item) => item.id === popup?.id) : undefined;

    const close = useCallback(() => setPopup(null), []);
    const navigate = () => { close(); setMobileOpen(false); };
    const toggle = (id: number, focusFirst = false) => {
        if (popup?.id === id && !focusFirst) { close(); return; }
        const button = triggers.current.get(id);
        if (!button) return;
        setPopup({ id, position: getTopbarPosition(button.getBoundingClientRect(), window.innerWidth, window.innerHeight) });
        if (focusFirst) requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('a, summary')?.focus());
    };

    useEffect(() => {
        if (!popup) return;
        const onOutside = (event: Event) => {
            if (!(event.target instanceof Node)) return;
            if (!header.current?.contains(event.target) && !panel.current?.contains(event.target)) close();
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            triggers.current.get(popup.id)?.focus();
            close();
        };
        // Прокрутка страницы закрывает панель; прокрутка внутри панели — нет.
        const onScroll = (event: Event) => {
            if (event.target instanceof Node && panel.current?.contains(event.target)) return;
            close();
        };
        document.addEventListener('pointerdown', onOutside);
        document.addEventListener('focusin', onOutside);
        document.addEventListener('keydown', onEscape);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('pointerdown', onOutside);
            document.removeEventListener('focusin', onOutside);
            document.removeEventListener('keydown', onEscape);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [popup, close]);

    return <div className="topbar-layout">
        <header ref={header} className="topbar-header">
            <div className="topbar-brand-row">
                <NavLink to={appPaths.home(locale)} onClick={navigate} className="topbar-brand"><span className="topbar-brand-symbol">A</span><span>Auto Admin<small>Рабочее пространство</small></span></NavLink>
                <UserPanel />
                <button className="topbar-mobile-toggle" type="button" aria-label={mobileOpen ? 'Скрыть меню' : 'Открыть меню'} aria-expanded={mobileOpen} aria-controls={navigationId} onClick={() => { close(); setMobileOpen((open) => !open); }}><MenuIcon icon="menu-hamburger-classic" /></button>
            </div>
            <nav id={navigationId} className={`topbar-navigation${mobileOpen ? ' is-open' : ''}`} aria-label="Основное меню" aria-busy={menuState.status === 'loading'}>
                <NavLink end to={appPaths.home(locale)} onClick={navigate} className={({ isActive }) => `topbar-nav-item${isActive ? ' is-active' : ''}`}><MenuIcon icon="menu-grid-2x2-rounded" /><span>Главная</span></NavLink>
                {menuState.status === 'loading' && <div className="topbar-loading"><DotsLoader label="Загрузка меню" /></div>}
                {menuState.status === 'error' && <div className="topbar-error" role="alert"><span>{menuState.message}</span><Button type="button" onClick={onRetryMenu}>Повторить</Button></div>}
                {menuState.status === 'ready' && (menuState.items.length ? menuState.items.map((item) => item.children.length ?
                    <button key={item.id} ref={(element) => { if (element) triggers.current.set(item.id, element); else triggers.current.delete(item.id); }} type="button" className={`topbar-nav-item${isBranchActive(item, locale, pathname) ? ' is-active' : ''}${popup?.id === item.id ? ' is-open' : ''}`} aria-expanded={popup?.id === item.id} aria-controls={popup?.id === item.id ? `${navigationId}-dropdown` : undefined} onClick={() => toggle(item.id)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); toggle(item.id, true); } }}>
                        <MenuIcon icon={item.icon} /><span>{item.name}</span><span className="topbar-arrow" aria-hidden="true" />
                    </button> : <NavLink key={item.id} to={menuPath(locale, item.slug)} onClick={navigate} className={({ isActive }) => `topbar-nav-item${isActive ? ' is-active' : ''}`}><MenuIcon icon={item.icon} /><span>{item.name}</span></NavLink>
                ) : <span className="topbar-empty">Нет доступных разделов</span>)}
            </nav>
        </header>
        <main className="topbar-content">{children}</main>
        {popup && selectedNode && createPortal(<div ref={panel} id={`${navigationId}-dropdown`} className="topbar-dropdown" style={popup.position} aria-label={selectedNode.name}>
            <div className="topbar-dropdown-heading"><span>{selectedNode.name}</span><span>{selectedNode.children.length} раздела</span></div>
            <DropdownItems items={selectedNode.children} onNavigate={navigate} />
        </div>, document.body)}
    </div>;
}
