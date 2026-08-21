import { getBootstrapStatusService } from "./bootstrap.service";
import type { BootstrapStage } from "./bootstrap.types";

export const readBootstrapStatus = (): Promise<BootstrapStage> => getBootstrapStatusService();