export const hasCompleteConfig = (): boolean => {
    if (
        process.env.Auto_Admin__DB_HOST &&
        process.env.Auto_Admin__DB_PORT &&
        process.env.Auto_Admin__DB_USERNAME &&
        (process.env.Auto_Admin__DB_PASSWORD || process.env.Auto_Admin__DB_PASSWORD === '') &&
        process.env.Auto_Admin__DB_DATABASE
    ) {
        return true;
    }

    return false;
}
