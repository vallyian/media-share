import path from "node:path";
import os from "node:os";
import { TextDecoder } from "node:util";
import child_process from "node:child_process";

import jschardet from "jschardet";

import { FileResponse } from "../@types/FileResponse";
import * as fsService from "./fs.service";

const subtitleExtensions: Record<string, (vttPath: string, videoExtension: string) => Promise<string>> = {
    ".sub": subToVtt,
    ".srt": srtToVtt,
};

const ffmpegPath = path.join("node_modules", "ffmpeg-static", os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg");

export function viewData(vttPath: string, videoExtension: string): Promise<FileResponse> {
    const videoPath = vttPath.replace(/\.vtt$/, videoExtension);
    return Promise.resolve()
        .then(() => fsService.stat(videoPath))
        .then(videoStat => videoStat === "file" || Promise.reject("video not found"))
        .then(() => transform(vttPath, videoPath))
        .then(data => ({ mime: "text/vtt; charset=UTF-8", data }));
}

async function transform(vttPath: string, videoPath: string): Promise<string> {
    for (const [ext, fn] of Object.entries(subtitleExtensions)) {
        const subtitlePath = vttPath.replace(/\.vtt$/i, ext);
        if (await fsService.stat(subtitlePath) === "file")
            return fn(subtitlePath, videoPath);
    }

    return Promise.reject("subtitle not found");
}

function subToVtt(subtitlePath: string, videoPath: string): Promise<string> {
    return Promise.resolve()
        .then(() => Promise.all([
            getFile(subtitlePath),
            getFps(videoPath).then(v => v || 25 /* default */)
        ]))
        .then(([file, fps]) => {
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
        });
}

function srtToVtt(subtitlePath: string): Promise<string> {
    return Promise.resolve()
        .then(() => getFile(subtitlePath))
        .then(file => {
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
        });
}

function getFile(mediaPath: string): Promise<string> {
    return Promise.resolve()
        .then(() => fsService.readFile(mediaPath))
        .then(buffer => {
            /*
                TODO: jschardet.detectAll and return multiple subtitles if detection not 100%
                (<any>jschardet).detectAll(buffer)
            */
            const encoding = jschardet.detect(buffer).encoding;
            const decodedFile = new TextDecoder(encoding).decode(buffer);
            return decodedFile;
        });
}

function getFps(videoPath: string): Promise<number | undefined> {
    return Promise.resolve()
        .then(() => Promise.all([
            fsService.stat(videoPath),
            fsService.stat(ffmpegPath)
        ]))
        .then(([videoStat, ffmepgStat]) => {
            videoStat === "file" || Promise.reject(`video file "${videoPath}" not found`);
            ffmepgStat === "file" || Promise.reject(`ffmpeg binary "${ffmpegPath}" not found`);
        })
        .then(() => new Promise<number>((ok, reject) => child_process.exec(
            `"${ffmpegPath}" -i "${videoPath}"`,
            (_err, stdout, stderr) => {
                const fps = (((`${stdout}${stderr}`.match(/Stream #.*: Video: .*, (\d+\.?\d{0,}) fps,/gmi) || [])[0] || "").match(/, (\d+\.?\d{0,}) fps,/) || [])[1] || "";
                isFinite(+fps) && +fps > 0
                    ? ok(+fps)
                    : reject(`invalid fps value "${fps}" in video "${videoPath}"`);
            }
        )));
}
