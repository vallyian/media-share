// SPI
import { IdTokenSPI } from "./ports/SPI/IdToken.SPI";
import { CryptoSPI } from "./ports/SPI/Crypto.SPI";
import { MediaStorageSPI } from "./ports/SPI/MediaStorage.SPI";
import { TextEncodingSPI } from "./ports/SPI/TextEncoding.SPI";
import { VideoProcessorSPI } from "./ports/SPI/VideoProcessor.SPI";

// API implementations
import { accessTokenService } from "./services/access-token.service";
import { mediaAccessService } from "./services/media-access.service";
import { idTokenService } from "./services/id-token.service";
import { subtitleService } from "./services/subtitle.service";

export const supportedVideos = ["mp4"];
export const supportedSubtitles = ["srt", "sub"];
export const supportedAudios = ["mp3"];

export function domain(
    logger: { error(message?: unknown, ...optionalParams: unknown[]): void },
    idTokenAdapters: Record<string, IdTokenSPI>,
    cryptoAdapter: CryptoSPI,
    mediaStorageAdapter: MediaStorageSPI,
    textEncodingAdapter: TextEncodingSPI,
    videoProcessorAdapter: VideoProcessorSPI,
    config: {
        mediaDir: string,
        authClient: string,
        authEmails: string[],
    }
) {
    const mediaAccessor = mediaAccessService(mediaStorageAdapter, config);

    return {
        idTokenService: idTokenService(idTokenAdapters),
        accessTokenService: accessTokenService(idTokenAdapters, cryptoAdapter, config),
        mediaAccessService: mediaAccessor,
        subtitleService: subtitleService(logger, textEncodingAdapter, videoProcessorAdapter, mediaAccessor)
    };
}
