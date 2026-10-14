import { NavLink, useLocation } from "react-router-dom";
import { useState } from 'react';
import { useAppLocale } from "../../../../../app/routing/locale/use-app-locale";
import { appPaths } from "../../../../../app/routing/app-paths";
import UserPanel from "../../../../user-panel/ui/UserPanel";
import type { AdminShellVariantProps, MenuNode } from "../../../model/admin-shell.types";
import { TextLoader } from '../../../../../shared/ui/Loader';
import { Button } from '../../../../../shared/ui/Button/Button';
import { MenuIcon } from '../../../ui/MenuIcon';
import './SidebarLayout.css';

const itemPath = (locale: string, slug: string) => `/${locale}/pages/${encodeURIComponent(slug)}`;

function hasActiveItem(item: MenuNode, locale: string, pathname: string): boolean {
    return pathname === itemPath(locale, item.slug)
        || item.children.some((child) => hasActiveItem(child, locale, pathname));
}

interface MenuItemsProps {
    items: MenuNode[];
    onNavigate: () => void;
    collapsed?: boolean;
    expandedGroup?: number | null;
    onExpandGroup?: (id: number) => void;
}

function MenuItems({ items, onNavigate, collapsed = false, expandedGroup, onExpandGroup }: MenuItemsProps) {
    const locale = useAppLocale();
    const { pathname } = useLocation();
    return (
        <ul className="sidebar-list">
            {items.map((item) => (
                <li key={item.id} className="sidebar-item">
                    {item.children.length > 0 ? (
                        <details className="sidebar-group" open={hasActiveItem(item, locale, pathname) || item.id === 1 || expandedGroup === item.id}>
                            <summary className="sidebar-row" title={item.name} aria-label={item.name} data-active={hasActiveItem(item, locale, pathname)} onClick={(event) => {
                                if (collapsed) {
                                    event.preventDefault();
                                    onExpandGroup?.(item.id);
                                }
                            }}>
                                <MenuIcon icon={item.icon} />
                                <span className="sidebar-label">{item.name}</span>
                                <span className="sidebar-count">{item.children.length}</span>
                                <span className="sidebar-chevron" aria-hidden="true" />
                            </summary>
                            <div className="sidebar-children">
                                <MenuItems items={item.children} onNavigate={onNavigate} />
                            </div>
                        </details>
                    ) : (
                        <NavLink
                            to={itemPath(locale, item.slug)}
                            title={item.name}
                            aria-label={item.name}
                            className={({ isActive }) => `sidebar-row sidebar-link${isActive ? ' is-active' : ''}`}
                            onClick={onNavigate}
                        >
                            <MenuIcon icon={item.icon} />
                            <span className="sidebar-label">{item.name}</span>
                        </NavLink>
                    )}
                </li>
            ))}
        </ul>
    );
}

const SideBarLayout = ({ children, menuState, onRetryMenu }: AdminShellVariantProps) => {
    const locale = useAppLocale();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
    const paths = {
        home: appPaths.home(locale),
    };

    return (
        <div className={`admin-shell sidebar-layout${collapsed ? ' is-collapsed' : ''}`}>
            <aside className="sidebar-panel">
                <div className="sidebar-brand">
                    <span className="sidebar-brand-mark" aria-hidden="true">A<span /></span>
                    <div className="sidebar-brand-text"><strong>Auto Admin</strong><span className="sidebar-brand-caption">Рабочее пространство</span></div>
                    <button className="sidebar-mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls="sidebar-navigation" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Скрыть меню' : 'Открыть меню'}>
                        <MenuIcon icon="menu-hamburger-classic" />
                    </button>
                </div>
                <nav id="sidebar-navigation" className={`sidebar-navigation${mobileOpen ? ' is-open' : ''}`} aria-label="Основное меню" aria-busy={menuState.status === 'loading'}>
                    <p className="sidebar-section-label">Обзор</p>
                    <NavLink
                        to={paths.home}
                        end
                        title="Панель управления"
                        aria-label="Панель управления"
                        className={({ isActive }) => `sidebar-row sidebar-link${isActive ? ' is-active' : ''}`}
                        onClick={() => setMobileOpen(false)}
                    >
                        <MenuIcon icon="menu-grid-2x2-rounded" />
                        <span className="sidebar-label">Панель управления</span>
                    </NavLink>
                    <p className="sidebar-section-label">Разделы</p>
                    {menuState.status === 'loading' && <div className="sidebar-message"><TextLoader label="Загрузка меню" /></div>}
                    {menuState.status === 'error' && (
                        <div role="alert" className="sidebar-message">
                            <p>{menuState.message}</p>
                            <Button type="button" onClick={onRetryMenu}>Повторить</Button>
                        </div>
                    )}
                    {menuState.status === 'ready' && (
                        menuState.items.length > 0
                            ? <MenuItems items={menuState.items} onNavigate={() => setMobileOpen(false)} collapsed={collapsed} expandedGroup={expandedGroup} onExpandGroup={(id) => {
                                setExpandedGroup(id);
                                setCollapsed(false);
                            }} />
                            : <p className="sidebar-message">Нет доступных разделов</p>
                    )}
                </nav>
                <button className="sidebar-collapse-toggle sidebar-row" type="button" aria-expanded={!collapsed} aria-controls="sidebar-navigation" aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'} title={collapsed ? 'Развернуть меню' : 'Свернуть меню'} onClick={() => setCollapsed((value) => !value)}>
                    <span className="sidebar-collapse-symbol" aria-hidden="true">{collapsed ? '»' : '«'}</span>
                    <span className="sidebar-label">Свернуть меню</span>
                </button>
                <UserPanel />
            </aside>

            <main>
                {children}
            </main>
        </div>
    );
};

export default SideBarLayout;
