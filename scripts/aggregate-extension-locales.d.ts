/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface AggregateExtensionLocaleDirs {
    SRC_DIR: string;
    EXTENSIONS_DIR: string;
    OUTPUT_DIR: string;
}

export const getDefaultDirs: () => AggregateExtensionLocaleDirs;

export function toPascalCase(str: string): string;
export function toCamelCase(str: string): string;

export function discoverLocales(dirs: AggregateExtensionLocaleDirs): Promise<Set<string>>;

export function findExtensionsWithLocale(
    locale: string,
    extensionsDir: string
): Promise<Array<{ name: string; path: string }>>;

export function generateLocaleFile(extensions: Array<{ name: string; path: string }>): string;

export function aggregateExtensionLocales(options?: {
    dirs?: AggregateExtensionLocaleDirs;
    silent?: boolean;
}): Promise<{
    generated: number;
    locales: Array<{ locale: string; extensionCount: number; filePath: string }>;
}>;
