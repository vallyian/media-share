import fs from "node:fs";
import { TextDecoder } from "node:util";

import jschardet from "jschardet";
import ffprobe from "ffprobe";
import ffprobe_static from "ffprobe-static";

import { env } from "../env";

export async function subtitle(absolutePath: string, videoExtension: string): Promise<string | undefined> {
    if (fs.existsSync(absolutePath))
        return;

    let file = "";
    file = await sub(absolutePath, videoExtension || ".mp4"); if (file) return file;
    file = await srt(absolutePath); if (file) return file;

    return;
}

async function sub(absolutePath: string, videoExtension: string): Promise<string | undefined> {
    const file = await getFile(absolutePath.replace(/\.vtt$/i, ".sub"));
    if (!file) return;

    const rx = /^(\{\d+\})(\{\d+\})(.+)/;
    const fps = await getFps(absolutePath.replace(/\.vtt$/i, videoExtension));
    const fpsToTime = (frameId: number): string => new Date(frameId / fps * 1000).toISOString().substring(11, 23);
    const newContent = file.split(/\n/gmi).reduce((content, line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return content;

        const parts = cleanLine.match(rx);
        if (parts.length !== 4) return content;

        const from = fpsToTime(+parts[1].replace(/[{}]/g, ""));
        const to = fpsToTime(+parts[2].replace(/[{}]/g, ""));
        const text = parts[3].replaceAll(/\s?\|\s?/gmi, "\n");

        return `${content}\n${from} --> ${to}\n${text}\n`;
    }, "");

    return newContent
        ? `WEBVTT\n${newContent}`
        : undefined;
}

async function srt(absolutePath: string): Promise<string | undefined> {
    const file = await getFile(absolutePath.replace(/\.vtt$/i, ".srt"));
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
                const from = parts[1].replace(",", ".") + (/[.,]\d{2}$/.test(parts[1]) ? "0" : "");
                const to = parts[2].replace(",", ".") + (/[.,]\d{2}$/.test(parts[2]) ? "0" : "");
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

async function getFile(absolutePath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => fs.existsSync(absolutePath) || Promise.reject(`file ${absolutePath} not found`))
        .then(() => fs.promises.readFile(absolutePath))
        .then(rawFile => {
            const encoding = jschardet.detect(rawFile).encoding;
            const decodedFile = new TextDecoder(encoding).decode(rawFile);
            return decodedFile;
        })
        .catch(() => undefined);
}

function getFps(absolutePath: string, def = 25): Promise<number> {
    return Promise.resolve()
        .then(() => fs.existsSync(absolutePath) || Promise.reject(`file "${absolutePath}" not found`))
        .then(() => fs.existsSync(env.FFPROBE_PATH)
            ? env.FFPROBE_PATH
            : fs.existsSync(ffprobe_static.path)
                ? ffprobe_static.path
                : Promise.reject("ffprob binary not found"))
        .then(ffprobePath => ffprobe(absolutePath, { path: ffprobePath }))
        .then(info => {
            const [fps, frac] = (info.streams.filter(s => s.codec_type === "video")[0] || { avg_frame_rate: "" }).avg_frame_rate.split("/");
            return (+fps / +frac) || def;
        })
        .catch(() => def);
}
