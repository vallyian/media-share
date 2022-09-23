import path from "node:path";
import os from "node:os";
import util from "node:util";
import child_process from "node:child_process";
import express from "express";
import jschardet from "jschardet";
import { AppError } from "../@types/AppError";
import config from "../config";
import fsService from "../services/fs.service";

export default subtitleFileMiddleware;

const ffmpegPath = path.join("node_modules", "ffmpeg-static", os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg");

const converters = config.supportedSubtitles.reduce((con, ext) => {
    switch (ext) {
        case ".sub": con[ext] = subToVtt; break;
        case ".srt": con[ext] = srtToVtt; break;
        default: break;
    }
    return con;
}, <Record<string, (subtitlePath: string, videoExtension?: string) => Promise<string>>>{});

async function subtitleFileMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const converter = converters[path.extname(req.path).toLowerCase()];
    if (!config.supportedSubtitlesRx.test(req.path) || req.query["static"] === "true" || !converter)
        return next();

    const videoExtension = config.supportedVideos.filter(v => v === `.${String(req.query["video"])}`)[0];

    const subtitlePath = path.join(config.mediaDir, fsService.secNormalize(decodeURIComponent(req.path)));
    if (await fsService.stat(subtitlePath) !== "file") {
        const err: AppError = Error("not found");
        err.status = 404;
        return next(err);
    }

    return Promise.resolve()
        .then(() => converter(subtitlePath, videoExtension))
        .then(data => res.setHeader("Content-type", "text/vtt; charset=UTF-8").end(data))
        .catch(err => next(err));
}

async function subToVtt(subtitlePath: string, videoExtension?: string): Promise<string> {
    const fps = await getFps(subtitlePath.replace(/\.sub$/i, videoExtension || ".mp4")).catch(err => {
        console.error(err);
        return 25; /* default */
    });
    const file = await getFile(subtitlePath);
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

async function srtToVtt(subtitlePath: string): Promise<string> {
    const file = await getFile(subtitlePath);

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

async function getFile(mediaPath: string): Promise<string> {
    const buffer = await fsService.readFile(mediaPath);
    /*
        TODO: jschardet.detectAll and return multiple subtitles if detection not 100%
        (<any>jschardet).detectAll(buffer)
    */
    const encoding = jschardet.detect(buffer).encoding;
    const decodedFile = new util.TextDecoder(encoding).decode(buffer);
    return decodedFile;
}

function getFps(videoPath: string): Promise<number> {
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
