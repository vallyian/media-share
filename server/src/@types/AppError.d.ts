export type AppError = Error & {
    status?: number | undefined;
    promise?: Promise<unknown>;
    render?: {
        page: string,
        locals?: Record<string, unknown>
    }
}
