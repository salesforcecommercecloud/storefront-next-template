const MRT_BUNDLE_TYPE_SSR = 'ssr' as const;
const MRT_STREAMING_ENTRY_FILE = 'streamingHandler' as const;
const MRT_BUNDLE_TYPE_STREAMING = 'streaming' as const;
export type MrtBundleType = typeof MRT_BUNDLE_TYPE_SSR | typeof MRT_STREAMING_ENTRY_FILE;
/**
 * Gets the MRT entry file for the given mode
 * @param mode - The mode to get the MRT entry file for
 * @returns The MRT entry file for the given mode
 */
export const getMrtEntryFile = (mode: string): MrtBundleType => {
    // TODO: Move the MRT_BUNDLE_TYPE env var to a command line option with sfnext
    const enableStreaming = process.env.MRT_BUNDLE_TYPE === MRT_BUNDLE_TYPE_STREAMING && mode === 'production';
    return enableStreaming ? MRT_STREAMING_ENTRY_FILE : MRT_BUNDLE_TYPE_SSR;
};
