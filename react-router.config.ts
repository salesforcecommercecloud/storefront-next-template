import type { Config } from '@react-router/dev/config';
import { odysseyPreset } from '@salesforce/storefront-next-dev/react-router-preset';

export default {
    presets: [odysseyPreset()],
} satisfies Config;
