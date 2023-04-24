import { SubtitleAPI } from "../ports/API/SubtitleAPI";
import { TextEncodingSPI } from "../ports/SPI/TextEncoding.SPI";
import { VideoProcessorSPI } from "../ports/SPI/VideoProcessor.SPI";
import { MediaAccessAPI } from "../ports/API/MediaAccess.API";

export function subtitleService(
    logger: { error(message?: unknown, ...optionalParams: unknown[]): void },
    textEncodingAdapter: TextEncodingSPI,
    videoProcessorAdapter: VideoProcessorSPI,
    mediaAccessService: MediaAccessAPI,
): SubtitleAPI {
    return {
        convert: toVtt(logger, textEncodingAdapter, videoProcessorAdapter, mediaAccessService)
    };
}

function toVtt(
    logger: { error(message?: unknown, ...optionalParams: unknown[]): void },
    textEncodingAdapter: TextEncodingSPI,
    videoProcessorAdapter: VideoProcessorSPI,
    mediaAccessService: MediaAccessAPI,
) {
    const fromSub = subToVtt(logger, textEncodingAdapter, videoProcessorAdapter, mediaAccessService);
    const fromSrt = srtToVtt(textEncodingAdapter, mediaAccessService);
    return (subtitlePath: string, videoExtension?: string) => {
        switch (mediaAccessService.parsePath(subtitlePath).extension) {
            case "sub": return fromSub(subtitlePath, videoExtension);
            case "srt": return fromSrt(subtitlePath);
            default: return Promise.reject("unknown subtitle type");
        }
    };
}

function subToVtt(
    logger: { error(message?: unknown, ...optionalParams: unknown[]): void },
    textEncodingAdapter: TextEncodingSPI,
    videoProcessorAdapter: VideoProcessorSPI,
    mediaAccessService: MediaAccessAPI,
) {
    const toFileContent = getFile(mediaAccessService, textEncodingAdapter);
    const toFps = getFps(logger, videoProcessorAdapter, mediaAccessService);

    return async (subtitlePath: string, videoExtension?: string) => {
        const file = await toFileContent(subtitlePath);
        const fps = await toFps(subtitlePath, videoExtension);
        const time = (frameId: number): string => new Date(frameId / fps * 1000).toISOString().substring(11, 23);
        const rx = /^(\{\d+\})(\{\d+\})(.+)/;

        const content = file.split(/\n/gmi).reduce((data, line) => {
            const cleanLine = line.trim();
            if (!cleanLine) return data;

            const parts = cleanLine.match(rx);
            if (parts?.length !== 4) return data;

            const from = time(+((parts[1] || "").replace(/[{}]/g, "")));
            const to = time(+((parts[2] || "").replace(/[{}]/g, "")));
            const text = (parts[3] || "").replaceAll(/\s?\|\s?/gmi, "\n");

            return `${data}\n${from} --> ${to}\n${text}\n`;
        }, "");

        return content
            ? `WEBVTT\n${content}`
            : Promise.reject(`no vtt content created from ${subtitlePath}`);
    };
}

function srtToVtt(
    textEncodingAdapter: TextEncodingSPI,
    mediaAccessService: MediaAccessAPI,
) {
    const toFileContent = getFile(mediaAccessService, textEncodingAdapter);

    return async (subtitlePath: string): Promise<string> => {
        const file = await toFileContent(subtitlePath);

        let content = "";
        const rx = /^(\d{2}:\d{2}:\d{2}[.,]\d{2,3})(?:,|\s-->\s)(\d{2}:\d{2}:\d{2}[.,]\d{2,3})$/;
        const lines = file.split(/(\r|\n|\r\n)+/gmi).reduce((sum, l) => {
            l = l.trim();
            if (l) sum.push(l);
            return sum;
        }, new Array<string>());

        while (lines.length > 0) {
            const line = lines.shift();
            if (!line) continue;

            const parts = line.match(rx);
            if (parts?.length !== 3) continue;

            const from = srtTime(parts[1]);
            const to = srtTime(parts[2]);
            const text = (() => {
                let ret = (lines.shift() || "").trim().replaceAll("[br]", "\n");
                while (lines[0] && !(rx.test(lines[0])) && !(/^\d+$/.test(lines[0])))
                    ret += `\n${lines.shift()}`;
                return ret;
            })();

            content += `\n${from} --> ${to}\n${text}\n`;
        }

        return content
            ? `WEBVTT\n${content}`
            : Promise.reject(`no vtt content created from ${subtitlePath}`);
    };
}

function srtTime(val?: string) {
    if (!val) val = "";
    val = val.replace(",", ".");
    if (/[.,]\d{2}$/.test(val)) val += "0";
    return val;
}

function getFile(
    mediaAccessService: MediaAccessAPI,
    textEncodingAdapter: TextEncodingSPI,
) {
    return (mediaPath: string) => Promise.resolve(mediaPath)
        .then(insecurePath => mediaAccessService.getFile(insecurePath))
        .then(buffer => textEncodingAdapter.decode(buffer));
}

function getFps(
    logger: { error(message?: unknown, ...optionalParams: unknown[]): void },
    videoProcessorAdapter: VideoProcessorSPI,
    mediaAccessService: MediaAccessAPI,
) {
    return async (subtitlePath: string, videoExtension?: string) => {
        const defaultFps = 25;
        videoExtension = typeof videoExtension === "string"
            ? mediaAccessService.supportedVideoExtension(videoExtension)
            : undefined;
        const videoPath = subtitlePath.replace(/\.sub$/i, videoExtension || ".mp4");
        const mediaPath = mediaAccessService.parsePath(videoPath).mediaPath;
        const videoPathType = await mediaAccessService.type(videoPath);
        return videoPathType === "file"
            ? await videoProcessorAdapter.getFps(mediaPath).catch(err => {
                logger.error(err);
                return 25; /* default */
            })
            : defaultFps;
    };
}
