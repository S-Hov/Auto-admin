import type { GetMeServiceResult } from "./auth.types"
import { getMeService } from "./auth.service"

export const readAuthSession = (token: string): Promise<GetMeServiceResult> => getMeService(token);