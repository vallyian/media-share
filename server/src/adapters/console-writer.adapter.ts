import { LogWriterSPI } from "../domain/ports/SPI/LogWriter.SPI";

export class ConsoleWriterAdapter implements LogWriterSPI {
    error(...message: unknown[]): void {
        console.error(...message);
    }
}
