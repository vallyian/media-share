export type Terminator = (
    reason: "Config" | "UncaughtException" | "UnhandledRejection" | "InitFunction" | "WorkerStartup" | "Generic",
    ...error: unknown[]
) => never;
