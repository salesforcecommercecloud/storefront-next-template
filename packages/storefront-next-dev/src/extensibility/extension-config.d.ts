export type ExtensionMeta = {
    name: string;
    description: string;
    installationInstructions: string;
    uninstallationInstructions: string;
    folder: string;
    dependencies: string[];
};

declare const ExtensionConfig: {
    extensions: Record<string, ExtensionMeta>;
};

export default ExtensionConfig;
