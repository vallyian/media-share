export default { exit };

const ExitCode = {
    Generic: 1,
    UncaughtException: 2,
    UnhandledRejection: 3,
    Environment: 4,
    /* primary */
    InitFunction: 102,
    /* workers */
    WorkerStartup: 201,
};

function exit(code: keyof typeof ExitCode, ...error: unknown[]): never {
    if (error) console.error("Critical", ...error);
    // eslint-disable-next-line no-restricted-syntax
    process.exit(ExitCode[code]);
}