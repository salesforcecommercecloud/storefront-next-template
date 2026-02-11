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
 * UITarget is a placeholder component that is used to render a target.
 * At build time, this component is transformed by the target system:
 * - If a target is registered for the targetId, it replaces this component with the target component(s)
 * - If no target is registered and children are provided, it replaces this component with its children
 * - If no target is registered and no children are provided, it removes this component
 * @param targetId - The id of the target to render
 * @param children - Default content to render if no target is registered (handled at build time)
 * @returns
 */
export function UITarget({ targetId, children }: { targetId: string; children?: React.ReactNode }) {
    // eslint-disable-next-line no-console
    console.log('----- UITarget', targetId);
    return <>{children}</>;
}
