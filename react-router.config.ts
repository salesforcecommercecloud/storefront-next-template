import type { Config } from '@react-router/dev/config';
import { odysseyPreset } from '@salesforce/vite-plugin-odyssey/react-router-preset';

export default {
    presets: [odysseyPreset()],
} satisfies Config;
