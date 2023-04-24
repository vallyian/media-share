import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

import { VideoProcessorSPI } from "../domain/ports/SPI/VideoProcessor.SPI";

const ffmpegPath = path.join("node_modules", "ffmpeg-static", os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg");

export function videoProcessorAdapter(): VideoProcessorSPI {
    if (!fs.existsSync(ffmpegPath))
        throw Error(`ffmpeg binary "${ffmpegPath}" not found`);

    return { getFps };
}

async function getFps(videoPath: string) {
    if (!fs.existsSync(videoPath))
        throw Error(`video file "${videoPath}" not found`);

    const videoInfo: string | undefined = await new Promise((ok, rej) => {
        let log = "";
        const child = child_process.execFile(
            ffmpegPath,
            ["-i", videoPath],
            { timeout: 60 * 1000, shell: false },
            error => log ? ok(log): rej(error)
        );
        child.stdout?.on("data", data => log += <string>data);
        child.stderr?.on("data", data => log += "\n<ERROR>\n" + <string>data + "\n</ERROR>\n");
    });
    if (!videoInfo) throw Error(`invalid video info for video "${videoPath}"`);

    const videoStreamInfo = videoInfo.split("\n").filter(l => l.includes("Stream #") && l.includes(": Video: ") && l.includes(" fps,"))[0];
    if (!videoStreamInfo) throw Error(`video stream not found in video "${videoPath}"; videoInfo: "${videoInfo}"`);

    let fpsString = videoStreamInfo.split(" fps,")[0] || "";
    fpsString = fpsString.split(", ").slice(-1)[0] || "";

    const fps = fpsString ? +fpsString : 0;
    if (!isFinite(fps) || fps <= 0) throw Error(`invalid fps value "${fpsString}" in video "${videoPath}"`);

    return fps;
}
