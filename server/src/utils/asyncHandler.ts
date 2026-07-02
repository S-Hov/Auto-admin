export const asyncHandler = (fn: Function) => (req: any, res: any, next: any): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
}
