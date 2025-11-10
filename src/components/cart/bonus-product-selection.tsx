import { type ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PRODUCTS, TITLE_TEXT, TITLE_SUFFIX, BADGE_TEXT } from '@/components/cart/bonus-product-selection.mocks';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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
