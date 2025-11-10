import { type ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

// TODO(W-20166684): Dev-only mocks for visual testing.
// Remove these mocks and integrate with bonus product actions API/state.
const PRODUCT_IMAGE_URLS = [
    'http://localhost:3845/assets/ff73df6ffe4cc65e4373219db8bb0af757c82a36.png',
    'http://localhost:3845/assets/bdd5e2af41dcbd7ee2a553ee5fcf30513d31c6e5.png',
    'http://localhost:3845/assets/6dde6ec92446667f65a7122719a1ddb254681923.png',
    'http://localhost:3845/assets/e64fe6af96af188623a65ac4fb5783b40d0bcc2d.png',
];

type BonusSelectionProduct = {
    id: string;
    imageUrl: string;
};

const PRODUCTS: BonusSelectionProduct[] = [
    { id: 'bp-1', imageUrl: PRODUCT_IMAGE_URLS[0] },
    { id: 'bp-2', imageUrl: PRODUCT_IMAGE_URLS[1] },
    { id: 'bp-3', imageUrl: PRODUCT_IMAGE_URLS[2] },
    { id: 'bp-4', imageUrl: PRODUCT_IMAGE_URLS[3] },
    { id: 'bp-5', imageUrl: PRODUCT_IMAGE_URLS[3] },
    { id: 'bp-6', imageUrl: PRODUCT_IMAGE_URLS[3] },
];

const TITLE_TEXT = 'Buy one Classic Fit Shirt and get one free tie';
const TITLE_SUFFIX = ' (1 of 1 added to cart)';
const BADGE_TEXT = 'Free';

export default function BonusProductSelection(): ReactElement {
    return (
        <section aria-label="Bonus Product Bundle" className="w-full" data-node-id="16247:74507">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="bonus-selection" className="border-none">
                    <AccordionTrigger className="text-left hover:no-underline py-4 justify-start items-center gap-1.5">
                        <span className="text-base leading-tight text-foreground">
                            <span className="font-bold">{TITLE_TEXT}</span>
                            <span className="font-normal">{TITLE_SUFFIX}</span>
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pt-4">
                        <Carousel className="w-full">
                            <CarouselContent className="-ml-5">
                                {PRODUCTS.map((item) => (
                                    <CarouselItem key={item.id} className="basis-52 pl-5">
                                        {/* TODO: Integrate Select action with API (e.g., add bonus item to basket),
                                               update selection counts, and handle loading/errors. */}
                                        <article
                                            className="bg-[var(--bg-input-30)] border border-border rounded-lg w-full shadow-sm"
                                            aria-label="Bonus bundle product card">
                                            {/* Content */}
                                            <div className="px-6 py-4">
                                                <div className="bg-background border border-border rounded-xl overflow-hidden">
                                                    <div className="h-36 w-full relative">
                                                        <img
                                                            src={item.imageUrl}
                                                            alt=""
                                                            role="presentation"
                                                            className="absolute inset-0 h-full w-full object-cover"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Header */}
                                            <div className="px-6 pt-0 pb-4 flex items-start justify-between gap-1.5">
                                                <p className="text-lg font-semibold leading-tight text-card-foreground">
                                                    Title
                                                </p>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge className="bg-primary text-primary-foreground font-semibold">
                                                        {BADGE_TEXT}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="px-6 pb-4">
                                                <Button className="w-full h-9 shadow-sm">Select</Button>
                                            </div>
                                        </article>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-3" />
                            <CarouselNext className="right-3" />
                        </Carousel>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    );
}
