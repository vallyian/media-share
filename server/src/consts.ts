const mediaDir = "media";

const supportedVideos = [".mp4"];
const supportedVideosRx = new RegExp("(:?" + supportedVideos.map(e => `\\${e}`).join("|") + ")$", "i");

const supportedSubtitles = [".srt", ".sub"];
const supportedSubtitlesRx = new RegExp("(:?" + supportedSubtitles.map(e => `\\${e}`).join("|") + ")$", "i");

export default Object.freeze({
    mediaDir,
    supportedVideos,
    supportedVideosRx,
    supportedSubtitles,
    supportedSubtitlesRx
});
