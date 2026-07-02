export const logger = (req: any, res: any, next: any): void => {
    console.log(`[${new Date().toISOString()}]\tmethod: ${req.method}\turl: ${req.url}`);
}