import fs from "node:fs";
import { TextDecoder } from "node:util";
import child_process from "node:child_process";

import jschardet from "jschardet";
import ffmpegPath from "ffmpeg-static";
import { globals } from "../globals";
import { FileResponse } from "../@types/FileResponse";

export function exists(mediaPath: string, videoExtension: string, desired?: string): boolean {
    const rx = new RegExp(`\\${videoExtension}$`, "i");
    const subs = desired
        ? [desired]
        : [".sub", ".srt"];
    const ret = subs.map(s => fs.existsSync(mediaPath.replace(rx, s))).some(s => !!s);
    return ret;
}

export async function viewData(mediaPath: string, videoExtension: string | undefined): Promise<FileResponse | undefined> {
    const data = await transform(mediaPath, String(videoExtension || ""));
    return data
        ? { mime: "text/vtt; charset=UTF-8", data }
        : undefined;
}

async function transform(mediaPath: string, videoExtension: string): Promise<string | undefined> {
    if (fs.existsSync(mediaPath))
        return;

    let file: string | undefined = "";

    file = await sub(mediaPath, videoExtension || ".mp4");
    if (file) return file;

    file = await srt(mediaPath);
    if (file) return file;

    return;
}

function sub(mediaPath: string, videoExtension: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => Promise.all([
            getFile(mediaPath.replace(/\.vtt$/i, ".sub")),
            getFps(mediaPath.replace(/\.vtt$/i, videoExtension)).then(v => v || 25 /* default */)
        ]))
        .then(([file, fps]) => {
            if (!file) return undefined;

            const time = (frameId: number): string => new Date(frameId / fps * 1000).toISOString().substring(11, 23);
            const rx = /^(\{\d+\})(\{\d+\})(.+)/;
            const newContent = file.split(/\n/gmi).reduce((content, line) => {
                const cleanLine = line.trim();
                if (!cleanLine) return content;

                const parts = cleanLine.match(rx);
                if (parts?.length !== 4) return content;

                const from = time(+((parts[1] || "").replace(/[{}]/g, "")));
                const to = time(+((parts[2] || "").replace(/[{}]/g, "")));
                const text = (parts[3] || "").replaceAll(/\s?\|\s?/gmi, "\n");

                return `${content}\n${from} --> ${to}\n${text}\n`;
            }, "");

            return newContent
                ? `WEBVTT\n${newContent}`
                : undefined;
        })
        .catch(err => {
            globals.console.error(err);
            return undefined;
        });
}

function srt(mediaPath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => getFile(mediaPath.replace(/\.vtt$/i, ".srt")))
        .then(file => {
            if (!file) return undefined;

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
                : Promise.reject(`no vtt content created from ${mediaPath}`);
        })
        .catch(err => {
            globals.console.error(err);
            return undefined;
        });
}

function getFile(mediaPath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => fs.existsSync(mediaPath)
            || Promise.reject(`file ${mediaPath} not found`))
        .then(() => fs.promises.readFile(mediaPath))
        .then(rawFile => {
            // TODO: jschardet.detectAll and return multiple subtitles if detection not 100%
            const encoding = jschardet.detect(rawFile).encoding;
            const decodedFile = new TextDecoder(encoding).decode(rawFile);
            return decodedFile;
        })
        .catch(err => {
            globals.console.error(err);
            return undefined;
        });
}

function getFps(videoPath: string): Promise<number | undefined> {
    return Promise.resolve()
        .then(() => fs.existsSync(videoPath)
            || Promise.reject(`video file "${videoPath}" not found`))
        .then(() => fs.existsSync(ffmpegPath)
            || Promise.reject(`ffmpeg binary "${ffmpegPath}" not found`))
        .then(() => new Promise<number>((ok, reject) =>
            child_process.exec(
                `"${ffmpegPath}" -i "${videoPath}"`,
                (_err, stdout, stderr) => {
                    const fps = (((`${stdout}${stderr}`.match(/Stream #.*: Video: .*, (\d+\.?\d{0,}) fps,/gmi) || [])[0] || "").match(/, (\d+\.?\d{0,}) fps,/) || [])[1] || "";
                    isFinite(+fps) && +fps > 0
                        ? ok(+fps)
                        : reject(`invalid fps value "${fps}" in video "${videoPath}"`);
                }
            )
        ))
        .catch(err => {
            globals.console.error(err);
            return undefined;
        });
}
