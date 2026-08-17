import type { GetMeServiceResult } from "./auth.types"
import { getMeService } from "./auth.service"

export const readAuthSession = async (token: string): Promise<GetMeServiceResult> => {
    return await getMeService(token);
}