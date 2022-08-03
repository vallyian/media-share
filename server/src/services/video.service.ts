import ejs from "ejs";

import { FileResponse } from "../@types/FileResponse";
import { ItemStat } from "../@types/ItemStat";
import { PathLink } from "../@types/PathLink";
import { globals } from "../globals";
import { routes } from "../routes";
import * as fsService from "./fs.service";
import * as subtitleService from "./subtitle.service";

export async function viewData(mediaPath: string, relativePath: string, videoExtension: string): Promise<FileResponse | undefined> {
    const pathLinks = fsService.pathLinks(mediaPath);
    const fileName = pathLinks[pathLinks.length - 1]?.name;
    const rx = new RegExp(`${fileName}$`, "i");
    const parent = relativePath.replace(rx, "");
    const siblings = await fsService.readDir(parent, mediaPath.replace(rx, ""))
        .then(r => r instanceof Error ? new Array<ItemStat>() : r)
        .then(ss => ss.filter(s => /\.mp4$/i.test(s.name)))
        .then(ss => {
            const fileIndex = ss.findIndex(s => s.name === fileName);
            return {
                prev: ss[fileIndex - 1]?.name,
                next: ss[fileIndex + 1]?.name
            };
        })
        .catch(err => {
            globals.console.error(err);
            return {
                prev: undefined,
                next: undefined
            };
        });
    const viewPath = "src/views/index.ejs";

    const data = await Promise.resolve()
        .then(() => ejs.renderFile(viewPath, {
            page: "video",
            pills: pathLinks,
            hasSubtitle: subtitleService.exists(mediaPath, videoExtension),
            relativePath,
            fileExtension: videoExtension,
            mimeType: "video/mp4",
            prev: <PathLink>{
                name: siblings.prev,
                link: parent + siblings.prev
            },
            next: <PathLink>{
                name: siblings.next,
                link: parent + siblings.next
            },
            script: `${routes.appScripts}/video.js`
        }))
        .then(data => data !== viewPath
            ? data
            : undefined
        )
        .catch(err => {
            globals.console.error(err);
            return undefined;
        });

    return data
        ? { mime: "text/html; charset=UTF-8", data }
        : undefined;
}
