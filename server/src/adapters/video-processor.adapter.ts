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

        const fpsString = await new Promise<string>(ok => child_process.exec(
            `"${this.ffmpegPath}" -i "${videoPath}"`,
            (_err, stdout, stderr) => {
                const fps = (((`${stdout}${stderr}`.match(/Stream #.*: Video: .*, (\d+\.?\d{0,}) fps,/gmi) || [])[0] || "").match(/, (\d+\.?\d{0,}) fps,/) || [])[1] || "";
                return ok(fps);
            }
        ));

        const fps = +fpsString;
        if (!isFinite(fps) || fps <= 0)
            throw Error(`invalid fps value "${fps}" in video "${videoPath}"`);

        return fps;
    }
}
