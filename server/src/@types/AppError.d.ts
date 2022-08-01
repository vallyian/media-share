export type AppError = globalThis.Error & {
    status?: number | undefined;
    promise?: Promise<unknown>;
}
