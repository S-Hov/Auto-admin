import { asyncHandler } from "../../utils/asyncHandler";
import { queryEngineService } from "../../core/query-engine";
import { ok } from "../../shared/api/success";
import { unauthorized } from "../../shared/api/errors/error-helpers";
import { parseExecuteRequest, parsePipelineRequest } from "./query.schema";

export const executeQueryController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    const { query } = parseExecuteRequest(req.body);
    return ok(
        res,
        undefined,
        await queryEngineService.execute(query, req.auth),
    );
});
export const executePipelineController = asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    const { pipeline } = parsePipelineRequest(req.body);
    return ok(
        res,
        undefined,
        await queryEngineService.executePipeline(pipeline, req.auth),
    );
});
