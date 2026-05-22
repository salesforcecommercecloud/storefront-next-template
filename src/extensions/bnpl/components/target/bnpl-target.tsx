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
import { Suspense } from 'react';
import { Await, useRouteLoaderData } from 'react-router';
import BuyNowPayLater from '@/extensions/bnpl/components/buy-now-pay-later';
import type { BuyNowPayLaterMessageData, BuyNowPayLaterLearnMoreData } from '@/extensions/bnpl/lib/api/bnpl.server';

interface PdpRouteData {
    bnplMessage?: Promise<BuyNowPayLaterMessageData>;
    bnplLearnMore?: Promise<BuyNowPayLaterLearnMoreData>;
}

export default function BnplTarget() {
    const data = useRouteLoaderData<PdpRouteData>('routes/_app.product.$productId');
    const messagePromise = data?.bnplMessage;
    const learnMorePromise = data?.bnplLearnMore;

    if (!messagePromise || !learnMorePromise) return null;

    return (
        <Suspense fallback={null}>
            <Await resolve={Promise.all([messagePromise, learnMorePromise])} errorElement={null}>
                {([messageData, learnMoreData]) => (
                    <BuyNowPayLater messageData={messageData} learnMoreData={learnMoreData} />
                )}
            </Await>
        </Suspense>
    );
}
