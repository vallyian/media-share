// SPI
import { IdTokenSPI } from "./ports/SPI/IdToken.SPI";
import { CryptoSPI } from "./ports/SPI/Crypto.SPI";
import { MediaStorageSPI } from "./ports/SPI/MediaStorage.SPI";
import { TextEncodingSPI } from "./ports/SPI/TextEncoding.SPI";
import { VideoProcessorSPI } from "./ports/SPI/VideoProcessor.SPI";

// API
import { IdTokenAPI } from "./ports/API/IdToken.API";
import { AccessTokenAPI } from "./ports/API/AccessToken.API";
import { MediaAccessAPI } from "./ports/API/MediaAccess.API";
import { SubtitleAPI } from "./ports/API/SubtitleAPI";

// API implementations
import { AccessTokenService } from "./services/access-token.service";
import { MediaAccessService } from "./services/media-access.service";
import { IdTokenService } from "./services/id-token.service";
import { SubtitleService } from "./services/subtitle.service";

export class Domain {
    readonly idTokenService: IdTokenAPI;
    readonly accessTokenService: AccessTokenAPI;
    readonly mediaAccessService: MediaAccessAPI;
    readonly subtitleService: SubtitleAPI;

    static readonly supportedVideos = ["mp4"];
    static readonly supportedSubtitles = ["srt", "sub"];
    static readonly supportedAudios = ["mp3"];

    constructor(
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
        this.idTokenService = new IdTokenService(idTokenAdapters);
        this.accessTokenService = new AccessTokenService(idTokenAdapters, cryptoAdapter, config);
        this.mediaAccessService = new MediaAccessService(mediaStorageAdapter, config);
        this.subtitleService = new SubtitleService(logger, textEncodingAdapter, videoProcessorAdapter, this.mediaAccessService);
    }
}
