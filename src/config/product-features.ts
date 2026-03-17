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

export interface ProductFeaturesConfig {
    /** Delimiter used to separate features in longDescription. Defaults to '|' */
    delimiter: string;
    /** CSS classes applied when content is detected as HTML fragment */
    htmlFragmentClassName: string;
}

/**
 * Default configuration for ProductFeatures component
 */
export const DEFAULT_PRODUCT_FEATURES_CONFIG: ProductFeaturesConfig = {
    delimiter: '|',
    htmlFragmentClassName:
        "text-sm text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:list-none [&_ul]:m-0 [&_ul]:p-0 [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_li]:before:content-[''] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:flex-shrink-0 [&_li]:before:rounded-full [&_li]:before:bg-primary",
};
