/* eslint-disable no-restricted-syntax */

export enum ExitCode {
    Generic = 1,
    UncaughtException = 2,
    UnhandledRejection = 3,
    Environment = 4,
    /* primary */
    InitFunction = 102,
    /* workers */
    WorkerStartup = 201,
}

export function exit(code: ExitCode, ...error: unknown[]): never {
    if (error) console.error(...error);
    process.exit(code);
}
