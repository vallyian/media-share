import util from "node:util";
import jschardet from "jschardet";
import { TextEncodingSPI } from "../domain/ports/SPI/TextEncoding.SPI";

export const textEncodingAdapter: TextEncodingSPI = {
    decode(buffer: Buffer) {
        const encoding = jschardet.detect(buffer).encoding;
        return new util.TextDecoder(encoding).decode(buffer);
    }
};
