import { LogWriterSPI } from "../domain/ports/SPI/LogWriter.SPI";

export class ConsoleWriterAdapter implements LogWriterSPI {
    error(...message: unknown[]): void {
        // eslint-disable-next-line no-restricted-globals
        console.error(...message);
    }
}
