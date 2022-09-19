import { IdTokenAdapter } from "./@types/Auth";
import googleIdTokenAdapter from "./adapters/g-id-token.adapter";

export default {
    idTokenAdapters: {
        google: <IdTokenAdapter>googleIdTokenAdapter()
    }
};
