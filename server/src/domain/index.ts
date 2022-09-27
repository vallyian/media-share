// SPI
import { IdTokenSPI } from "./ports/SPI/IdToken.SPI";
import { CryptoSPI } from "./ports/SPI/Crypto.SPI";
import { MediaStorageSPI } from "./ports/SPI/MediaStorage.SPI";
import { TextEncodingSPI } from "./ports/SPI/TextEncoding.SPI";
import { VideoProcessorSPI } from "./ports/SPI/VideoProcessor.SPI";

// API
import { AccessTokenAPI } from "./ports/API/AccessToken.API";
import { MediaAccessAPI } from "./ports/API/MediaAccess.API";
import { IdTokenAPI } from "./ports/API/IdToken.API";
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

    constructor(
        idTokenAdapters: Record<string, IdTokenSPI>,
        cryptoAdapter: CryptoSPI,
        mediaStorageAdapter: MediaStorageSPI,
        textEncodingAdapter: TextEncodingSPI,
        videoProcessorAdapter: VideoProcessorSPI,
        config: {
            authClient: string,
            authEmails: string[],
            mediaDir: string,
            supportedVideos: string[],
            supportedSubtitles: string[]
        }
    ) {
        this.idTokenService = new IdTokenService(idTokenAdapters);
        this.accessTokenService = new AccessTokenService(idTokenAdapters, cryptoAdapter, config);
        this.mediaAccessService = new MediaAccessService(mediaStorageAdapter, config);
        this.subtitleService = new SubtitleService(textEncodingAdapter, videoProcessorAdapter, this.mediaAccessService);
    }
}
