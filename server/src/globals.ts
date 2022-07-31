export const globals = {
    console: globalThis.console,
    process: globalThis.process
};

export function processExit(code: number, ...error: unknown[]): never {
    if (error) globalThis.console.error(error);
    globalThis.process.exit(code);
}
