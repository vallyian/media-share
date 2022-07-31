import fs from "node:fs";

export async function subtitle(absolutePath: string, fileExtension: string): Promise<string | undefined> {
    if (fs.existsSync(absolutePath))
        return;

    let file = "";
    absolutePath = absolutePath.replace(new RegExp(`\\${fileExtension}$`, "i"), "");

    file = await sub(absolutePath); if (file) return file;
    file = await srt(absolutePath); if (file) return file;

    return;
}

async function sub(absolutePath: string): Promise<string | undefined> {
    const file = await getFile(absolutePath, ".sub");
    if (!file) return;

    const rx = /^(\{\d+\})(\{\d+\})(.+)/;
    const fpsToTime = (fps: number): string => new Date(fps / 23.97 * 1000).toISOString().substring(11, 23);
    const newContent = file.split(/\n/gmi).reduce((content, line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return content;

        const parts = cleanLine.match(rx);
        if (parts.length !== 4) return content;

        const from = fpsToTime(+parts[1].replace(/[{}]/g, ""));
        const to = fpsToTime(+parts[2].replace(/[{}]/g, ""));
        const text = parts[3].replaceAll(/\s?\|\s?/gmi, "\n");

        return `${content}\n${from} --> ${to}\n${text}\n`;
    }, "");

    return newContent
        ? `WEBVTT\n${newContent}`
        : undefined;
}

async function srt(absolutePath: string): Promise<string | undefined> {
    const file = await getFile(absolutePath, ".srt");
    if (!file) return;

    let content = "";

    const rx = /(\d{2}:\d{2}:\d{2}\.\d{2}),(\d{2}:\d{2}:\d{2}\.\d{2})/;
    const lines = file.split(/(\r|\n|\r\n)+/gmi).reduce((sum, l) => {
        l = l.trim();
        if (l) sum.push(l);
        return sum;
    }, <string[]>[]);
    
    while (lines.length > 0) {
        const line = lines.shift();
        if (line) {
            const parts = line.match(rx);
            if (parts?.length === 3) {
                const from = `${parts[1]}0`;
                const to = `${parts[2]}0`;
                let text = (lines.shift() || "").trim().replaceAll("[br]", "\n");
                while (lines[0] && !(rx.test(lines[0])))
                    text += `\n${lines.shift()}`;
                content += `\n${from} --> ${to}\n${text}\n`;
            }
        }
    }

    return content
        ? `WEBVTT\n${content}`
        : undefined;
}

function getFile(absolutePath: string, fileExtension: string): Promise<string | undefined> {
    const filePath = absolutePath + fileExtension;
    return fs.existsSync(filePath)
        ? fs.promises.readFile(filePath, "utf-8").catch(() => undefined)
        : undefined;
}
