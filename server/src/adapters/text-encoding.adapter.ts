import util from "node:util";
import jschardet from "jschardet";
import { TextEncodingSPI } from "../domain/ports/SPI/TextEncoding.SPI";

export class TextEncodingAdapter implements TextEncodingSPI {
    /** @inheritdoc */
    decode(buffer: Buffer) {
        const encoding = jschardet.detect(buffer).encoding;
        const decodedFile = new util.TextDecoder(encoding).decode(buffer);
        return decodedFile;
    }
}
