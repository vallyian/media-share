import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

import { VideoProcessorSPI } from "../domain/ports/SPI/VideoProcessor.SPI";

export class VideoProcessorAdapter implements VideoProcessorSPI {
    private readonly ffmpegPath: string;

    constructor() {
        this.ffmpegPath = path.join("node_modules", "ffmpeg-static", os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg");
        if (!fs.existsSync(this.ffmpegPath))
            throw Error(`ffmpeg binary "${this.ffmpegPath}" not found`);
    }

    /** @inheritdoc */
    async getFps(videoPath: string) {
        if (!fs.existsSync(videoPath))
            throw Error(`video file "${videoPath}" not found`);

        const videoInfo: string | undefined = await new Promise(ok => child_process.exec(
            `"${this.ffmpegPath}" -i "${videoPath}"`,
            (_err, stdout, stderr) => ok(stdout + stderr)
        ));
        if (!videoInfo) throw Error(`invalid video info for video "${videoPath}"`);

        const videoStreamInfo = videoInfo.split("\n").filter(l => l.includes("Stream #") && l.includes(": Video: ") && l.includes(" fps,"))[0];
        if (!videoStreamInfo) throw Error(`video strean not found in video "${videoPath}"; videoInfo: "${videoInfo}"`);

        let fpsString = videoStreamInfo.split(" fps,")[0] || "";
        fpsString = fpsString.split(", ").slice(-1)[0] || "";

        const fps = fpsString ? +fpsString : 0;
        if (!isFinite(fps) || fps <= 0) throw Error(`invalid fps value "${fpsString}" in video "${videoPath}"`);

        return fps;
    }
}
