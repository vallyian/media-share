const { env, on, pid } = process;

export {
    env,
    on,
    pid,

    ExitCode,
    exit
};

enum ExitCode {
    Generic = 1,
    UncaughtException = 2,
    UnhandledRejection = 3,
    Environment = 4,
    /* primary */
    InitFunction = 102,
    /* workers */
    WorkerStartup = 201,
}

function exit(code: ExitCode, ...error: unknown[]): never {
    if (error) console.error(...error);
    process.exit(code);
}
