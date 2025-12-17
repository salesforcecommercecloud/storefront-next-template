export type ExtensionMeta = {
    name: string;
    description: string;
    installationInstructions: string;
    uninstallationInstructions: string;
    folder: string;
    dependencies: string[];
    defaultOn?: boolean;
};

declare const ExtensionConfig: {
    extensions: Record<string, ExtensionMeta>;
};

export default ExtensionConfig;
