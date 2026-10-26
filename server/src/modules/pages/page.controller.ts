import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { CreatePageData } from "./schema/page-create.schema";
import { pageService } from "./page.service";
import { ok } from "../../shared/api/success";

export const createPageController = asyncHandler(
    async (req: Request, res: Response) => {
        const data: CreatePageData = req.body;
        const result = await pageService.create(data, req.auth!, req.requestId ?? null);
        ok(res, undefined, result);
    },
);
