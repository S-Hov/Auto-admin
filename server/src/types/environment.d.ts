declare global {
    namespace NodeJS {
        interface ProcessEnv {
            Auto_Admin__SYSTEM_MODE?: 'local' | 'production';
            Auto_Admin__DB_HOST?: string;
            Auto_Admin__DB_PORT?: string;
            Auto_Admin__DB_USERNAME?: string;
            Auto_Admin__DB_PASSWORD?: string;
            Auto_Admin__DB_DATABASE?: string;
            Auto_Admin__PORT?: string;
            Auto_Admin__HOST?: string;
        }
    }
}

export {};