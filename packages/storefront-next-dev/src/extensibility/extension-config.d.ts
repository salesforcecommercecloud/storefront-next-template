export type ExtensionMeta = {
    name: string;
    description: string;
    dependencies: string[];
};

declare const ExtensionConfig: {
    extensions: Record<string, ExtensionMeta>;
};

export default ExtensionConfig;
