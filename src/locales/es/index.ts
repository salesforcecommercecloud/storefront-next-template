import home from './home'; // import your namespaced locales
import product from './product';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export default { home, product } satisfies typeof import('@/locales/en').default;
