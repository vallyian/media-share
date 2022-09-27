import { TextEncodingSPI } from "../ports/SPI/TextEncoding.SPI";
import { VideoProcessorSPI } from "../ports/SPI/VideoProcessor.SPI";
import { SubtitleAPI } from "../ports/API/SubtitleAPI";
import { MediaAccessAPI } from "../ports/API/MediaAccess.API";

export class SubtitleService implements SubtitleAPI {
    constructor(
        private readonly textEncodingAdapter: TextEncodingSPI,
        private readonly videoProcessorAdapter: VideoProcessorSPI,
        private readonly mediaAccessService: MediaAccessAPI,
    ) { }

    /** @inheritdoc */
    convert(subtitlePath: string, videoExtension?: string): Promise<string> {
        switch (this.mediaAccessService.parsePath(subtitlePath).extension) {
            case "sub": return this.subToVtt(subtitlePath, videoExtension);
            case "srt": return this.srtToVtt(subtitlePath);
            default: return Promise.reject("unknown subtitle type");
        }
    }

    private async subToVtt(subtitlePath: string, videoExtension?: string): Promise<string> {
        const file = await this.getFile(subtitlePath);
        const fps = await this.getFps(subtitlePath, videoExtension);
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
    }

    private async srtToVtt(subtitlePath: string): Promise<string> {
        const file = await this.getFile(subtitlePath);

        let content = "";
        const rx = /^(\d{2}:\d{2}:\d{2}[.,]\d{2,3})(?:,|\s-->\s)(\d{2}:\d{2}:\d{2}[.,]\d{2,3})$/;
        const time = (val?: string) => (val || "").replace(",", ".") + (/[.,]\d{2}$/.test((val || "")) ? "0" : "");
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

            const from = time(parts[1]);
            const to = time(parts[2]);
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
    }

    private async getFile(mediaPath: string): Promise<string> {
        const buffer = await this.mediaAccessService.getFile(mediaPath);
        const decodedText = this.textEncodingAdapter.decode(buffer);
        return decodedText;
    }

    private async getFps(subtitlePath: string, videoExtension?: string): Promise<number> {
        const defaultFps = 25;
        videoExtension = typeof videoExtension === "string"
            ? this.mediaAccessService.supportedVideoExtension(videoExtension)
            : undefined;
        const videoPath = subtitlePath.replace(/\.sub$/i, videoExtension || ".mp4");
        const mediaPath = this.mediaAccessService.parsePath(videoPath).mediaPath;
        const videoPathType = await this.mediaAccessService.type(videoPath);
        const fps = videoPathType === "file"
            ? await this.videoProcessorAdapter.getFps(mediaPath).catch(err => {
                console.error(err);
                return 25; /* default */
            })
            : defaultFps;
        return fps;
    }
}
