import { Request, Response } from 'express';
import { ok } from '../../shared/api/success';
import { asyncHandler } from '../../utils/asyncHandler';
import { getBootstrapStatusService } from "./bootstrap.service";
import { BootstrapStatusResponse } from "./bootstrap.types";
import { SUCCESS_CODES } from "../../shared/api/codes/success-codes";

export const getBootstrapStatusController = asyncHandler(async (_req: Request, res: Response) => {
    const stage = await getBootstrapStatusService();

    return ok<BootstrapStatusResponse>(
        res,
        SUCCESS_CODES.BOOTSTRAP_STATUS_RECEIVED,
        { stage }
    );
})