import fs from "node:fs";
import { TextDecoder } from "node:util";
import child_process from "node:child_process";

import jschardet from "jschardet";
import ffmpegPath from "ffmpeg-static";

export async function subtitle(mediaPath: string, videoExtension: string): Promise<string | undefined> {
    if (fs.existsSync(mediaPath))
        return;

    let file: string | undefined = "";
    file = await sub(mediaPath, videoExtension || ".mp4"); if (file) return file;
    file = await srt(mediaPath); if (file) return file;

    return;
}

async function sub(mediaPath: string, videoExtension: string): Promise<string | undefined> {
    const file = await getFile(mediaPath.replace(/\.vtt$/i, ".sub"));
    if (!file) return;

    const rx = /^(\{\d+\})(\{\d+\})(.+)/;
    const fps = await getFps(mediaPath.replace(/\.vtt$/i, videoExtension));
    const fpsToTime = (frameId: number): string => new Date(frameId / fps * 1000).toISOString().substring(11, 23);
    const newContent = file.split(/\n/gmi).reduce((content, line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return content;

        const parts = cleanLine.match(rx);
        if (parts?.length !== 4) return content;

        const from = fpsToTime(+((parts[1] || "").replace(/[{}]/g, "")));
        const to = fpsToTime(+((parts[2] || "").replace(/[{}]/g, "")));
        const text = (parts[3] || "").replaceAll(/\s?\|\s?/gmi, "\n");

        return `${content}\n${from} --> ${to}\n${text}\n`;
    }, "");

    return newContent
        ? `WEBVTT\n${newContent}`
        : undefined;
}

async function srt(mediaPath: string): Promise<string | undefined> {
    const file = await getFile(mediaPath.replace(/\.vtt$/i, ".srt"));
    if (!file) return;

    let content = "";

    const rx = /^(\d{2}:\d{2}:\d{2}[.,]\d{2,3})(?:,|\s-->\s)(\d{2}:\d{2}:\d{2}[.,]\d{2,3})$/;
    const lines = file.split(/(\r|\n|\r\n)+/gmi).reduce((sum, l) => {
        l = l.trim();
        if (l) sum.push(l);
        return sum;
    }, <string[]>[]);

    while (lines.length > 0) {
        const line = lines.shift();
        if (line) {
            const parts = line.match(rx);
            if (parts?.length === 3) {
                const from = (parts[1] || "").replace(",", ".") + (/[.,]\d{2}$/.test((parts[1] || "")) ? "0" : "");
                const to = (parts[2] || "").replace(",", ".") + (/[.,]\d{2}$/.test((parts[2] || "")) ? "0" : "");
                let text = (lines.shift() || "").trim().replaceAll("[br]", "\n");
                while (lines[0] && !(rx.test(lines[0])) && !(/^\d+$/.test(lines[0])))
                    text += `\n${lines.shift()}`;
                content += `\n${from} --> ${to}\n${text}\n`;
            }
        }
    }

    return content
        ? `WEBVTT\n${content}`
        : undefined;
}

async function getFile(mediaPath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => fs.existsSync(mediaPath) || Promise.reject(`file ${mediaPath} not found`))
        .then(() => fs.promises.readFile(mediaPath))
        .then(rawFile => {
            // TODO: jschardet.detectAll and return multiple subtitles if detection not 100%
            const encoding = jschardet.detect(rawFile).encoding;
            const decodedFile = new TextDecoder(encoding).decode(rawFile);
            return decodedFile;
        })
        .catch(() => undefined);
}

function getFps(videoPath: string, def = 25): Promise<number> {
    return Promise.resolve()
        .then(() => fs.existsSync(videoPath) || Promise.reject(`video file "${videoPath}" not found`))
        .then(() => fs.existsSync(ffmpegPath) || Promise.reject(`ffmpeg binary "${ffmpegPath}" not found`))
        .then(() => new Promise<number>(ok => child_process.exec(`"${ffmpegPath}" -i "${videoPath}"`, (_err, stdout, stderr) => {
            const fps = (((`${stdout}${stderr}`.match(/Stream #.*: Video: .*, (\d+\.?\d{0,}) fps,/gmi) || [])[0] || "").match(/, (\d+\.?\d{0,}) fps,/) || [])[1] || "";
            ok(isFinite(+fps) && +fps > 0 ? +fps : def);
        })))
        .catch(err => {
            global.console.error(err);
            return def;
        });
}
