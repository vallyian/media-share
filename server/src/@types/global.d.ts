export { };

declare global {
    interface Error {
        status?: number | undefined;
        promise?: Promise<unknown>;
    }

    namespace Express {
        interface Request {
            user?: string;
            reqId: number;
        }
    }
}
