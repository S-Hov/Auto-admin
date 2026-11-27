/** Адаптер БД сообщает сервису о ссылке из меню без зависимости от HTTP. */
export class PageReferencedByMenuError extends Error {
    constructor(cause: unknown) {
        super("Page is referenced by menu", { cause });
        this.name = "PageReferencedByMenuError";
    }
}
