export interface ApiResponse<TData = null> {
    success: boolean;
    message: string;
    status: number;
    data?: TData;
}