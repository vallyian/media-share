import { FileResponse } from "../@types/FileResponse";
import * as fsService from "./fs.service";
import * as renderService from "./render.service";
import * as subtitleService from "./subtitle.service";

export const videoExtensions: Record<string, string> = {
    ".mp4": "video/mp4"
};

export const videoExtensionsRx = new RegExp("(:?" + Object.keys(videoExtensions).map(e => `\\${e}`).join("|") + ")$", "i");

export async function viewData(mediaPath: string, relativePath: string, videoExtension: string): Promise<FileResponse> {
    const pathLinks = fsService.pathLinks(mediaPath);
    const fileName = pathLinks[pathLinks.length - 1]?.name;
    const rx = new RegExp(`${fileName}$`, "i");
    const parent = relativePath.replace(rx, "");
    return Promise.resolve()
        .then(() => fsService.readDir(parent, mediaPath.replace(rx, "")))
        .then(files => files.filter(s => videoExtensionsRx.test(s.name)))
        .then(videos => {
            const fileIndex = videos.findIndex(s => s.name === fileName);
            return renderService.renderPage("video", {
                pills: pathLinks.length >= 2 ? pathLinks.splice(pathLinks.length - 2, 2) : pathLinks,
                hasSubtitle: subtitleService.exists(mediaPath, videoExtension),
                relativePath,
                fileExtension: videoExtension,
                mimeType: videoExtensions[videoExtension],
                prev: videos[fileIndex - 1] ? parent + videos[fileIndex - 1]?.name : "",
                next: videos[fileIndex + 1] ? parent + videos[fileIndex + 1]?.name : ""
            });
        });
}
