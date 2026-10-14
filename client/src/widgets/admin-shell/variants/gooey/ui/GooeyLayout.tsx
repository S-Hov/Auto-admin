import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppLocale } from '../../../../../app/routing/locale/use-app-locale';
import { appPaths } from '../../../../../app/routing/app-paths';
import UserPanel from '../../../../user-panel/ui/UserPanel';
import type { AdminShellVariantProps, MenuNode } from '../../../model/admin-shell.types';
import { getGooeyPosition, getOrbitPoint, type Point, type Viewport } from '../model/gooey-position';
import { MenuIcon } from '../../../ui/MenuIcon';
import { DotsLoader } from '../../../../../shared/ui/Loader';
import './GooeyLayout.css';

const PAGE_SIZE = 6;
function readViewport(): Viewport {
    const viewport = window.visualViewport;
    return { width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight, left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0 };
}
function isInteractive(target: EventTarget | null) {
    return target instanceof Element && !!target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-native-context-menu]');
}

export default function GooeyLayout({ children, menuState, onRetryMenu }: AdminShellVariantProps) {
    const locale = useAppLocale();
    const location = useLocation();
    const menuId = useId();
    const filterId = `${menuId}-goo`;
    const dialog = useRef<HTMLDialogElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);
    const pointer = useRef<Point | null>(null);
    const [anchor, setAnchor] = useState<Point | null>(null);
    const [viewport, setViewport] = useState(readViewport);
    const [trail, setTrail] = useState<number[]>([]);
    const [page, setPage] = useState(0);
    const isOpen = anchor !== null;
    const close = useCallback(() => setAnchor(null), []);

    const openAt = useCallback((point: Point) => {
        // Не перекрываем уже открытые диалоги и чужие модальные интерфейсы.
        if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
        previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setTrail([]);
        setPage(0);
        setAnchor(point);
    }, []);

    useEffect(() => {
        const update = () => setViewport(readViewport());
        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);
        window.visualViewport?.addEventListener('scroll', update);
        return () => {
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('scroll', update);
        };
    }, []);

    useEffect(() => {
        const element = dialog.current;
        if (!isOpen || !element) return;
        element.showModal();
        element.querySelector<HTMLElement>('[data-menu-focus]')?.focus();
        return () => {
            element.close();
            if (previousFocus.current?.isConnected) previousFocus.current.focus();
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.code !== 'KeyM' || !event.altKey || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.repeat || (!isOpen && isInteractive(event.target))) return;
            event.preventDefault();
            if (isOpen) close();
            else {
                const view = readViewport();
                openAt(pointer.current ?? { x: (view.left ?? 0) + view.width / 2, y: (view.top ?? 0) + view.height / 2 });
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, openAt, close]);

    // Переход на другую страницу закрывает меню без изменения истории маршрутов.
    useEffect(() => {
        const element = dialog.current;
        if (element?.open) element.close();
    }, [location.key]);

    const roots: MenuNode[] = menuState.status === 'ready' ? [{
        id: 0, parentId: null, name: 'Главная', slug: '', icon: 'menu-grid-2x2-rounded', iconType: 'icon',
        sortOrder: 0, isActive: true, canView: true, canCreate: false, canUpdate: false, canDelete: false, children: [],
    }, ...menuState.items] : [];
    let branch = roots;
    const breadcrumbs: MenuNode[] = [];
    for (const id of trail) {
        const node = branch.find((item) => item.id === id);
        if (!node) break;
        breadcrumbs.push(node);
        branch = node.children;
    }
    const pageCount = Math.max(1, Math.ceil(branch.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount - 1);
    const visible = branch.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    const position = getGooeyPosition(anchor ?? { x: 0, y: 0 }, viewport);
    const back = () => { setTrail((ids) => ids.slice(0, -1)); setPage(0); };
    const focusCenter = () => dialog.current?.querySelector<HTMLElement>('[data-menu-focus]')?.focus();

    return (
        <div className="gooey-layout" onPointerMove={(event) => { pointer.current = { x: event.clientX, y: event.clientY }; }} onContextMenu={(event) => {
            if (event.defaultPrevented || isInteractive(event.target) || window.getSelection()?.toString()) return;
            if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
            event.preventDefault();
            openAt({ x: event.clientX, y: event.clientY });
        }}>
            <main className="gooey-content">{children}</main>
            <button type="button" className="gooey-launcher" aria-label="Открыть меню" aria-haspopup="dialog" aria-controls={menuId} aria-expanded={isOpen} aria-keyshortcuts="Control+Alt+M" title="Меню · Ctrl+Alt+M · ПКМ на свободном месте" onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                openAt({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }}><MenuIcon icon="menu-hamburger-classic" /><span>Меню</span><kbd>Ctrl Alt M</kbd></button>

            <dialog ref={dialog} id={menuId} className={`gooey-dialog${position.compact ? ' is-compact' : ''}`} aria-labelledby={`${menuId}-title`} style={{ left: position.left, top: position.top, width: position.width, height: position.height }} onCancel={close} onClose={close} onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
            }} onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' && trail.length) { event.preventDefault(); back(); requestAnimationFrame(focusCenter); return; }
                if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
                const index = controls.indexOf(document.activeElement as HTMLElement);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + controls.length) % controls.length;
                event.preventDefault();
                controls[next]?.focus();
            }}>
                {/* <div className="gooey-heading">
                    <div><p>НАВИГАЦИЯ</p><h2 id={`${menuId}-title`}>{breadcrumbs.at(-1)?.name ?? 'Рабочее пространство'}</h2></div>
                    <button type="button" className="gooey-close" aria-label="Закрыть меню" onClick={close}>×</button>
                </div> */}
                <nav className="gooey-breadcrumbs" aria-label="Путь в меню">
                    <button type="button" onClick={() => { setTrail([]); setPage(0); focusCenter(); }}>Главное меню</button>
                    {breadcrumbs.map((node, index) => <span key={node.id}><span aria-hidden="true"> / </span><button type="button" onClick={() => { setTrail(trail.slice(0, index + 1)); setPage(0); focusCenter(); }}>{node.name}</button></span>)}
                </nav>

                {menuState.status === 'loading' && <div className="gooey-state"><DotsLoader label="Загрузка меню" /></div>}
                {menuState.status === 'error' && <div className="gooey-state" role="alert"><p>{menuState.message}</p><button type="button" onClick={onRetryMenu}>Повторить</button></div>}
                {menuState.status === 'ready' && <div className="gooey-orbit" key={`${trail.join('.')}:${currentPage}`}>
                    <svg className="gooey-filter-defs" aria-hidden="true"><defs><filter id={filterId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" /><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" /></filter></defs></svg>
                    <div className="gooey-blobs" aria-hidden="true" style={{ filter: `url("#${filterId}")` }}>
                        <span className="gooey-blob gooey-center-blob" />
                        {visible.map((item, index) => {
                            const point = getOrbitPoint(index, visible.length, position.radius);
                            return <span key={item.id} className="gooey-blob gooey-satellite" style={{ '--dx': `${point.x}px`, '--dy': `${point.y}px`, '--delay': `${index * 35}ms` } as CSSProperties} />;
                        })}
                    </div>
                    <button type="button" className="gooey-center" data-menu-focus aria-label={trail.length ? 'Назад на уровень выше' : 'Закрыть меню'} title={trail.length ? 'Назад' : 'Закрыть'} onClick={() => { if (trail.length) { back(); requestAnimationFrame(focusCenter); } else close(); }}><span aria-hidden="true">{trail.length ? '←' : '×'}</span><span>{trail.length ? 'Назад' : 'Закрыть'}</span></button>
                    <nav className="gooey-items" aria-label="Разделы">
                        {visible.map((item, index) => {
                            const point = getOrbitPoint(index, visible.length, position.radius);
                            const style = { '--dx': `${point.x}px`, '--dy': `${point.y}px`, '--delay': `${index * 35}ms` } as CSSProperties;
                            const content = <><MenuIcon icon={item.icon} /><span className="gooey-item-label">{item.name}</span>{item.children.length > 0 && <span className="gooey-group-mark" aria-hidden="true">+</span>}</>;
                            return item.children.length ? <button key={item.id} type="button" className="gooey-item" style={style} title={item.name} aria-label={`${item.name}: открыть подразделы`} onClick={() => { setTrail([...trail, item.id]); setPage(0); requestAnimationFrame(focusCenter); }}>{content}</button>
                                : <NavLink key={item.id} to={item.id === 0 ? appPaths.home(locale) : `/${locale}/pages/${encodeURIComponent(item.slug)}`} className={({ isActive }) => `gooey-item${isActive ? ' is-active' : ''}`} style={style} title={item.name} onClick={close}>{content}</NavLink>;
                        })}
                    </nav>
                    {!branch.length && <p className="gooey-empty">Нет доступных разделов</p>}
                </div>}
                <div className="gooey-pagination"><button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); requestAnimationFrame(focusCenter); }} aria-label="Предыдущие пункты">←</button><span aria-live="polite">{currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => { setPage(currentPage + 1); requestAnimationFrame(focusCenter); }} aria-label="Следующие пункты">→</button></div>
                <div className="gooey-account"><UserPanel /></div>
            </dialog>
        </div>
    );
}
