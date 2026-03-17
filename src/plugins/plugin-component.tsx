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

/**
 * PluginComponent is a placeholder component that is used to render a plugin.
 * At build time, this component is transformed by the plugin system:
 * - If a plugin is registered for the pluginId, it replaces this component with the plugin component(s)
 * - If no plugin is registered and children are provided, it replaces this component with its children
 * - If no plugin is registered and no children are provided, it removes this component
 * @param pluginId - The id of the plugin to render
 * @param children - Default content to render if no plugin is registered (handled at build time)
 * @returns
 */
export function PluginComponent({ pluginId, children }: { pluginId: string; children?: React.ReactNode }) {
    // eslint-disable-next-line no-console
    console.log('----- PluginComponent', pluginId);
    return <>{children}</>;
}
