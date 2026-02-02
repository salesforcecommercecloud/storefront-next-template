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
import type { ProductContentAdapter } from './product-content-types';

// Global product content adapter store
const productContentAdapterStore = new Map<string, ProductContentAdapter>();

/**
 * Add a product content adapter to the adapter store
 */
export function addProductContentAdapter(name: string, adapter: ProductContentAdapter): void {
    productContentAdapterStore.set(name, adapter);
}

/**
 * Remove a product content adapter from the adapter store
 */
export function removeProductContentAdapter(name: string): void {
    productContentAdapterStore.delete(name);
}

/**
 * Get a product content adapter from the adapter store
 */
export function getProductContentAdapter(name: string): ProductContentAdapter | undefined {
    return productContentAdapterStore.get(name);
}

/**
 * Get all product content adapters from the adapter store
 */
export function getAllProductContentAdapters(): ProductContentAdapter[] {
    return Array.from(productContentAdapterStore.values());
}

/**
 * Check if any product content adapters are registered
 */
export function hasProductContentAdapters(): boolean {
    return productContentAdapterStore.size > 0;
}

/**
 * Clear all product content adapters (for testing)
 */
export function clearProductContentAdapters(): void {
    productContentAdapterStore.clear();
}
