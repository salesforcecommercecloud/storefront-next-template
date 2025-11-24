// TODO: (Re)move
export type SessionData = {
    access_token?: string;
    access_token_expiry?: number;
    refresh_token?: string;
    refresh_token_expiry?: number;

    customer_id?: string;
    userType?: 'guest' | 'registered';
    usid?: string;

    // social login - OAuth2 PKCE code verifier (server-side only, ephemeral)
    codeVerifier?: string;

    // IDP tokens (for social login)
    idp_access_token?: string;
    idp_access_token_expiry?: number;

    //hybrid
    dwsid?: string;

    // dnt
    // TODO take care of this in separate ticket
    dnt?: string;
};

export type CustomQueryParameters = {
    [key in `c_${string}`]: string | number | boolean | string[] | number[];
};
