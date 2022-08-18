export const mediaDir = "media";

export const supportedVideos = [".mp4"];
export const supportedVideosRx = new RegExp("(:?" + supportedVideos.map(e => `\\${e}`).join("|") + ")$", "i");

export const supportedSubtitles = [".srt", ".sub"];
export const supportedSubtitlesRx = new RegExp("(:?" + supportedSubtitles.map(e => `\\${e}`).join("|") + ")$", "i");
