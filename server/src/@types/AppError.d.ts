export type AppError = Error & {
    status?: number | undefined;
    promise?: Promise<unknown>;
}
