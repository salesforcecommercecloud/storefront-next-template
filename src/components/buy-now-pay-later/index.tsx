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
'use client';

import { type ReactElement, useState } from 'react';
import InfoModal, { type InfoModalData } from '@/components/info-modal';

/**
 * BuyNowPayLater component displays buy now pay later installment information.
 *
 * This is the default fallback component that displays when no custom extension
 * is registered for the plugin point. Customers can override this by registering
 * their own component via the plugin system.
 *
 * @returns ReactElement
 */
export default function BuyNowPayLater(): ReactElement {
    const [isModalOpen, setIsModalOpen] = useState(false);
    // TODO: Data will be fetched from adapter later
    const modalData: InfoModalData | undefined = undefined;

    const handleLearnMoreClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="text-sm text-muted-foreground">
                <span>
                    Pay in 4 interest-free payments of <span className="font-bold text-foreground">$12.25</span>.{' '}
                </span>
                <button
                    onClick={handleLearnMoreClick}
                    className="text-primary hover:underline font-medium cursor-pointer">
                    Learn more
                </button>
            </div>
            <InfoModal open={isModalOpen} onOpenChange={setIsModalOpen} data={modalData} />
        </>
    );
}
