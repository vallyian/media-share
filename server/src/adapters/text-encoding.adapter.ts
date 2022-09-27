import util from "node:util";
import jschardet from "jschardet";
import { TextEncodingSPI } from "../domain/ports/SPI/TextEncoding.SPI";

export class TextEncodingAdapter implements TextEncodingSPI {
    /** @inheritdoc */
    decode(buffer: Buffer): string {
        /*
            TODO: jschardet.detectAll and return multiple subtitles if detection not 100%
            (<any>jschardet).detectAll(buffer)
        */
        const encoding = jschardet.detect(buffer).encoding;
        const decodedFile = new util.TextDecoder(encoding).decode(buffer);
        return decodedFile;
    }
}
