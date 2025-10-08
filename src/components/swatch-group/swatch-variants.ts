import { cva } from 'class-variance-authority';

// Individual swatch component variants
const swatchVariants = cva(
    'border-2 border-black/50 text-foreground flex-shrink-0 relative group transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    {
        variants: {
            size: {
                sm: 'min-w-4 min-h-4',
                md: 'min-w-6 min-h-6',
                lg: 'min-w-8 min-h-8',
                auto: 'min-w-8 min-h-8',
            },
            shape: {
                circle: 'rounded-full w-7 h-7 p-1',
                square: 'rounded-md px-3 py-1',
            },
            selected: {
                true: 'border-black',
                false: '',
            },
            disabled: {
                true: 'cursor-not-allowed before:content-[""] before:absolute before:top-1/2 before:left-1/2 before:h-[32px] before:w-[1px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:bg-black before:z-[1]',
                false: 'cursor-pointer',
            },
        },
        compoundVariants: [
            // Circle default (not selected, not disabled)
            {
                shape: 'circle',
                selected: false,
                disabled: false,
                class: 'border-transparent',
            },
            // Circle selected (not disabled)
            {
                shape: 'circle',
                selected: true,
                disabled: false,
                class: 'border-black',
            },
            // Circle disabled (not selected)
            {
                shape: 'circle',
                selected: false,
                disabled: true,
                class: 'border-transparent',
            },
            // Circle selected and disabled
            {
                shape: 'circle',
                selected: true,
                disabled: true,
                class: 'border-black',
            },
            // Square default (not selected, not disabled)
            {
                shape: 'square',
                selected: false,
                disabled: false,
                class: 'bg-white',
            },
            // Square selected (not disabled)
            {
                shape: 'square',
                selected: true,
                disabled: false,
                class: 'border-transparent bg-primary text-primary-foreground',
            },
            // Square disabled (not selected)
            {
                shape: 'square',
                selected: false,
                disabled: true,
                class: 'bg-white',
            },
            // Square selected and disabled
            {
                shape: 'square',
                selected: true,
                disabled: true,
                class: 'before:bg-white bg-primary text-primary-foreground',
            },
        ],
        defaultVariants: {
            size: 'lg',
            selected: false,
            disabled: false,
            shape: 'circle',
        },
    }
);

export { swatchVariants };
