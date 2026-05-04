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
 * Data types for Product Content Adapter method responses.
 * Add types here for each PDP modal/section (size guide, returns & warranty,
 * BNPL, estimated delivery, collapsible content, shipping estimates, etc.).
 */

// --- Size Guide ---

/**
 * Size conversion row for the size guide chart (e.g. XS, S, M, L, XL)
 */
export interface SizeGuideChartRow {
    size: string;
    us: number;
    eu: number;
    uk: number;
    cm: number;
}

/**
 * Size guide content for PDP modal (Size Guide modal + Size Tips)
 */
export interface SizeGuideData {
    title: string;
    subtitle?: string;
    chart: {
        columns: string[];
        rows: SizeGuideChartRow[];
    };
    howToMeasure: Array<{ step: number; heading: string; body: string }>;
    sizeTips: {
        title: string;
        tips: string[];
    };
}

// --- Returns & Warranty ---

/**
 * Returns & warranty content for PDP modal (30-day returns, 1-year warranty, exchanges, support)
 */
export interface ReturnsAndWarrantyData {
    title: string;
    description: string;
    returnsPolicy: {
        heading: string;
        intro: string;
        conditions: string[];
        howToReturn: string[];
        note?: string;
    };
    warranty: {
        heading: string;
        intro: string;
        whatsCovered: string[];
        whatsNotCovered: string[];
        claimsProcess: string;
    };
    exchanges: {
        heading: string;
        intro: string;
        process: string;
    };
    needHelp?: {
        intro: string;
        email: string;
        phone: string;
    };
}

// --- Buy Now Pay Later (BNPL) ---

/**
 * Short message for BNPL inline display (e.g. "Pay in 4 interest-free payments of $12.25 with BNPL. Learn more")
 */
export interface BuyNowPayLaterMessageData {
    /** Number of interest-free payments (e.g. 4) */
    paymentCount: number;
    /** Amount per payment in dollars (e.g. 12.25) */
    amountPerPayment: number;
    /** Provider label for display (e.g. "BNPL") */
    providerLabel: string;
    /** Label for the learn-more link (e.g. "Learn more") */
    learnMoreLabel: string;
}

/**
 * Learn more modal content for BNPL (payment schedule, how it works, disclosures)
 */
export interface BuyNowPayLaterLearnMoreData {
    title: string;
    /** Summary line (e.g. split purchase amount, no impact on credit, no late fees) */
    summary: string;
    paymentSchedule: {
        amountPerPayment: number;
        totalAmount?: number;
        /** e.g. ["Today", "2 weeks", "4 weeks", "6 weeks"] */
        schedule: string[];
    };
    howItWorks: string[];
    /** Full terms/disclosures text */
    disclosures: string;
    /** Optional disclosure link labels (e.g. "Find more disclosures", "See other ways to pay") */
    disclosureLinks?: Array<{ label: string; url?: string }>;
}

// --- Estimated Delivery (Fulfillment & Shipping) ---

/**
 * One shipping option with delivery time and optional cost/condition
 */
export interface ShippingOption {
    name: string;
    deliveryTime: string;
    /** Cost in dollars (e.g. 5.99). Omit if free or conditional */
    cost?: number;
    /** e.g. "Free on orders over $50" or "Orders placed before 2 PM EST" */
    condition?: string;
}

/**
 * Estimated delivery / Fulfillment & Shipping modal content
 */
export interface EstimatedDeliveryData {
    title: string;
    /** Estimated delivery times by method (e.g. Standard 5-7 days) */
    estimatedDelivery: {
        options: Array<{ name: string; deliveryTime: string }>;
        note: string;
    };
    /** Shipping options with rates and conditions */
    shippingOptions: ShippingOption[];
    /** International shipping section */
    internationalShipping: {
        heading: string;
        points: string[];
        note?: string;
    };
    /** Order tracking section */
    orderTracking: {
        heading: string;
        points: string[];
    };
}

// --- HTML Content Types ---

/** Describes the expected HTML structure of a content fragment */
export type HtmlContentType = 'plain-text' | 'bulleted-list' | 'table-2-column';

/** A content fragment with its expected HTML structure */
export interface HtmlContent {
    html: string;
    contentType: HtmlContentType;
}

// --- Product Description (collapsible PDP section) ---

/**
 * Product description for PDP (intro paragraph + typed feature content)
 */
export interface ProductDescriptionData {
    heading: string;
    /** Main descriptive paragraph */
    intro: string;
    /** Feature content blocks, each with its own HTML content type */
    features: HtmlContent[];
}

// --- Ask assistant FAQ (PDP collapsible) ---

/**
 * FAQ questions for the "Ask assistant" collapsible section on PDP.
 */
export interface FaqQuestionsData {
    questions: string[];
}

// --- Collapsible PDP content (Ingredients, Usage, Care, Tech Specs) ---

/**
 * Ingredients & Materials section — pre-rendered HTML for direct use in CollapsibleHtmlSection.
 */
export type IngredientsData = HtmlContent;

/**
 * Usage Instructions section — pre-rendered HTML for direct use in CollapsibleHtmlSection.
 */
export type UsageInstructionsData = HtmlContent;

/**
 * Care Instructions section — pre-rendered HTML for direct use in CollapsibleHtmlSection.
 */
export type CareInstructionsData = HtmlContent;

/**
 * Technical Specs section — pre-rendered HTML for direct use in CollapsibleHtmlSection.
 */
export type TechSpecsData = HtmlContent;

// --- Customer Reviews ---

/**
 * Photo associated with a customer review
 */
export interface ReviewPhoto {
    /** Stable id from API when available; use as list key to avoid remounts */
    id?: string;
    /** URL or path to the image (e.g. /images/black-cube-photo.svg from public/images/) */
    url: string;
    /** Optional alt text for accessibility */
    alt?: string;
}

/**
 * Single customer review in the reviews section
 */
export interface ReviewItem {
    id: string;
    authorName: string;
    verifiedPurchase: boolean;
    date: string;
    /** Optional location (e.g. "Boston, MA") */
    location?: string;
    rating: number;
    headline: string;
    body: string;
    /** Optional photos attached to the review */
    photos?: ReviewPhoto[];
    helpfulCount: number;
    reportLabel?: string;
}

/**
 * Rating distribution (count of reviews per star 1–5)
 */
export interface RatingDistribution {
    oneStar: number;
    twoStars: number;
    threeStars: number;
    fourStars: number;
    fiveStars: number;
}

/**
 * Lightweight reviews summary for accordion header (count, rating, distribution, AI summary).
 * Fetched on mount so the header can show "X reviews for [product]" and AI summary without loading the full list.
 */
export interface ReviewsSummaryData {
    totalCount: number;
    averageRating: number;
    distribution: RatingDistribution;
    basedOnLabel: string;
    /** AI-generated review summary for display in collapsed accordion state */
    aiSummary?: string;
}

/**
 * Customer reviews section data for PDP
 */
export interface ReviewsData {
    heading: string;
    subtitle: string;
    writeReviewButtonLabel: string;
    summary: {
        averageRating: number;
        totalCount: number;
        basedOnLabel: string;
        distribution: RatingDistribution;
    };
    /** AI-generated review summary for display in collapsed accordion state */
    aiSummary?: string;
    searchPlaceholder: string;
    sortOptions: string[];
    defaultSort?: string;
    reviews: ReviewItem[];
}

/**
 * Write a Review form configuration for PDP (submit review modal).
 * Excludes name and email fields per requirements.
 */
export interface WriteReviewFormData {
    title: string;
    overallRating: {
        label: string;
        required: boolean;
        placeholder: string;
    };
    reviewTitle: {
        label: string;
        placeholder: string;
        /** Max characters allowed (e.g. 250). Optional; no client-side cap if omitted. */
        maxCharacters?: number;
    };
    reviewBody: {
        label: string;
        placeholder: string;
        /** Min characters required (e.g. 50). */
        minCharacters: number;
        /** Max characters allowed (e.g. 2000). Optional; no client-side cap if omitted. */
        maxCharacters?: number;
    };
    recommend: {
        label: string;
        yesLabel: string;
        noLabel: string;
    };
    location?: {
        label: string;
        placeholder: string;
        hint: string;
    };
    addPhotos: {
        label: string;
        hint: string;
        accept: string;
        maxSize: string;
    };
    termsText: string;
    cancelLabel: string;
    submitLabel: string;
}

// --- Shipping Estimates ---

/**
 * Shipping estimate for PDP delivery calculator.
 * Returns estimated delivery date, cost, and days for a specific zipcode.
 */
export interface ShippingEstimate {
    /** Estimated delivery date in ISO format (YYYY-MM-DD) */
    delivery_date: string;
    /** Shipping cost in dollars (0 = free shipping) */
    cost: number;
    /** Estimated delivery days from now */
    days: number;
}
