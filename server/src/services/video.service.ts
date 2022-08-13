import path from "node:path";

import { FileResponse } from "../@types/FileResponse";
import * as fsService from "./fs.service";
import * as renderService from "./render.service";

export const videoExtensions: Record<string, string> = {
    ".mp4": "video/mp4"
};

export const videoExtensionsRx = new RegExp("(:?" + Object.keys(videoExtensions).map(e => `\\${e}`).join("|") + ")$", "i");

export async function viewData(mediaPath: string, relativePath: string): Promise<FileResponse> {
    const mediaeDir = path.dirname(mediaPath);
    const relativeDir = path.dirname(relativePath);
    return Promise.resolve()
        .then(() => fsService.readDir(mediaeDir, relativeDir))
        .then(files => files.filter(s => videoExtensionsRx.test(s.name)))
        .then(videos => {
            const pathLinks = fsService.pathLinks(mediaPath);
            const fileName = path.basename(mediaPath);
            const fileExtension = path.extname(mediaPath);
            const fileIndex = videos.findIndex(s => s.name === fileName);
            return renderService.renderPage("video", {
                pills: pathLinks.length >= 2 ? pathLinks.splice(pathLinks.length - 2, 2) : pathLinks,
                relativePath,
                subtitlePath: relativePath.replace(new RegExp(`\\${fileExtension}`, "i"), `.vtt?video=${fileExtension}`),
                mimeType: videoExtensions[fileExtension],
                prev: videos[fileIndex - 1]?.name ? path.join(relativeDir, <string>videos[fileIndex - 1]?.name) : "",
                next: videos[fileIndex + 1]?.name ? path.join(relativeDir, <string>videos[fileIndex + 1]?.name) : ""
            });
        });
}
