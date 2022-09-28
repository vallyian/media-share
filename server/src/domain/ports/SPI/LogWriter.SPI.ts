export interface LogWriterSPI {
    error(...message: unknown[]): void;
}
