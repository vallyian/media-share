import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { TextDecoder } from "node:util";
import child_process from "node:child_process";

import jschardet from "jschardet";
import { FileResponse } from "../@types/FileResponse";

export function exists(videoPath: string, videoExtension: string, desiredSubtitleExtension?: string): boolean {
    const extensionRx = /^\.[a-z0-9]{3,4}$/i;
    const videoExtensionRx = extensionRx.test(videoExtension)
        ? new RegExp(`\\${videoExtension}$`, "i")
        : /^\.srt$/i;
    const subtitleExtensions = desiredSubtitleExtension
        ? [desiredSubtitleExtension]
        : [".sub", ".srt"];
    const ret = subtitleExtensions.find(subtitleExtension => fs.existsSync(videoPath.replace(videoExtensionRx, subtitleExtension)));
    return !!ret;
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

    let subtitleFile: string | undefined = "";
    let subtitleExtension = "";
    let subtitlePath = "";
    const videoPath = mediaPath.replace(/\.vtt$/i, videoExtension);

    subtitleExtension = ".sub";
    subtitlePath = mediaPath.replace(/\.vtt$/i, subtitleExtension);
    if (exists(videoPath, videoExtension, subtitleExtension)) {
        subtitleFile = await subToVtt(subtitlePath, videoPath);
        if (subtitleFile) return subtitleFile;
    }

    subtitleExtension = ".srt";
    subtitlePath = mediaPath.replace(/\.vtt$/i, subtitleExtension);
    if (exists(videoPath, videoExtension, subtitleExtension)) {
        subtitleFile = await srtToVtt(subtitlePath);
        if (subtitleFile) return subtitleFile;
    }

    return;
}

function subToVtt(subtitlePath: string, videoPath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => Promise.all([
            getFile(subtitlePath),
            getFps(videoPath).then(v => v || 25 /* default */)
        ]))
        .then(([file, fps]) => {
            if (!file) return undefined;

            const time = (frameId: number): string => new Date(frameId / fps * 1000).toISOString().substring(11, 23);
            const rx = /^(\{\d+\})(\{\d+\})(.+)/;
            const content = file.split(/\n/gmi).reduce((data, line) => {
                const cleanLine = line.trim();
                if (!cleanLine) return data;

                const parts = cleanLine.match(rx);
                if (parts?.length !== 4) return data;

                const from = time(+((parts[1] || "").replace(/[{}]/g, "")));
                const to = time(+((parts[2] || "").replace(/[{}]/g, "")));
                const text = (parts[3] || "").replace(/\s?\|\s?/gmi, "\n");

                return `${data}\n${from} --> ${to}\n${text}\n`;
            }, "");

            return content
                ? `WEBVTT\n${content}`
                : Promise.reject(`no vtt content created from ${subtitlePath}`);
        })
        .catch(err => {
            console.error(err);
            return undefined;
        });
}

function srtToVtt(subtitlePath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => getFile(subtitlePath))
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
                    let ret = (lines.shift() || "").trim().replace(/\[br\]/gmi, "\n");
                    while (lines[0] && !(rx.test(lines[0])) && !(/^\d+$/.test(lines[0])))
                        ret += `\n${lines.shift()}`;
                    return ret;
                })();

                content += `\n${from} --> ${to}\n${text}\n`;
            }

            return content
                ? `WEBVTT\n${content}`
                : Promise.reject(`no vtt content created from ${subtitlePath}`);
        })
        .catch(err => {
            console.error(err);
            return undefined;
        });
}

function getFile(mediaPath: string): Promise<string | undefined> {
    return Promise.resolve()
        .then(() => fs.promises.readFile(mediaPath))
        .then(rawFile => {
            /*
                TODO: jschardet.detectAll and return multiple subtitles if detection not 100%
                (<any>jschardet).detectAll(rawFile)
            */
            const encoding = jschardet.detect(rawFile).encoding;
            const decodedFile = new TextDecoder(encoding).decode(rawFile);
            return decodedFile;
        })
        .catch(err => {
            console.error(err);
            return undefined;
        });
}

function getFps(videoPath: string): Promise<number | undefined> {
    return Promise.resolve()
        .then(() => fs.existsSync(videoPath)
            || Promise.reject(`video file "${videoPath}" not found`))
        .then(() => new Promise<number>((ok, reject) => {
            const ffmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg");
            if (!fs.existsSync(ffmpegPath)) return reject(`ffmpeg binary "${ffmpegPath}" not found`);

            child_process.exec(
                `"${ffmpegPath}" -i "${videoPath}"`,
                (_err, stdout, stderr) => {
                    const fps = (((`${stdout}${stderr}`.match(/Stream #.*: Video: .*, (\d+\.?\d{0,}) fps,/gmi) || [])[0] || "").match(/, (\d+\.?\d{0,}) fps,/) || [])[1] || "";
                    isFinite(+fps) && +fps > 0
                        ? ok(+fps)
                        : reject(`invalid fps value "${fps}" in video "${videoPath}"`);
                }
            );
        }))
        .catch(err => {
            console.error(err);
            return undefined;
        });
}
