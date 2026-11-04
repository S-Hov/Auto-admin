import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import type { CreatePageData, GetPageReqData, UpdatePageData, PageListQuery, PageRowsQuery } from "@auto-admin/contracts/pages";
import { pageService } from "./page.service";
import { ok } from "../../shared/api/success";
import type { PageResolveParams } from '@auto-admin/contracts/pages';

export const getPageBySlugController = asyncHandler(async (req, res) => {
    const { slug } = res.locals.validatedParams as PageResolveParams;
    return ok(res, undefined, await pageService.getBySlug(slug, req.auth!));
});

export const getPageRowsController = asyncHandler(async (req, res) => {
    const { id } = res.locals.validatedParams as GetPageReqData;
    const query = res.locals.validatedQuery as PageRowsQuery;
    return ok(res, undefined, await pageService.getRows(id, query, req.auth!));
});

export const listPagesController = asyncHandler(async (req, res) => {
    const query = res.locals.validatedQuery as PageListQuery;
    return ok(res, undefined, await pageService.list(query, req.auth!));
});

export const createPageController = asyncHandler(
    async (req: Request, res: Response) => {
        const data: CreatePageData = req.body;
        const result = await pageService.create(
            data,
            req.auth!,
            req.requestId ?? null,
        );
        ok(res, undefined, result);
    },
);

export const getPageController = asyncHandler(
    async (req: Request, res: Response) => {
        const data = res.locals.validatedParams as GetPageReqData;
        const result = await pageService.get(data.id, req.auth!);
        ok(res, undefined, result);
    },
);

export const updatePageController = asyncHandler(
    async (req: Request, res: Response) => {
        const params = res.locals.validatedParams as GetPageReqData;
        const data: UpdatePageData = req.body;
        const result = await pageService.update(
            params.id,
            data,
            req.auth!,
            req.requestId ?? null,
        );
        ok(res, undefined, result);
    },
);

export const deletePageController = asyncHandler(async (req, res) => {
    const params = res.locals.validatedParams as GetPageReqData;
    const result = await pageService.delete(
        params.id, req.auth!, req.requestId ?? null,
    );
    return ok(res, undefined, result);
});
