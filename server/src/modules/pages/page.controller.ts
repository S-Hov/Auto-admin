import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import type { CreatePageData } from "./schema/page-create.schema";
import { pageService } from "./page.service";
import { ok } from "../../shared/api/success";
import type { GetPageReqData } from "./schema/page-get.schema";
import type { UpdatePageData } from "./schema/page-update.schema";

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
