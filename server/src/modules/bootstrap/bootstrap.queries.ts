import { getBootstrapStatusService as getBootstrapStatus } from "./bootstrap.service";
import { BootstrapStage } from "./bootstrap.types";

export const readBootstrapStatus = async (): Promise<BootstrapStage> => {
    return await getBootstrapStatus();
}