import { Scripts as Scripts$1 } from "react-router";
import * as react_jsx_runtime0 from "react/jsx-runtime";

//#region src/react-router/Scripts.d.ts

/**
 * Enhanced Scripts component that wraps React Router's Scripts component with Odyssey-specific functionality.
 *
 * This component extends the standard React Router Scripts component by injecting additional
 * bundle configuration scripts during server-side rendering. It ensures that bundle metadata
 * (ID and path) are available on the client before any other scripts execute.
 *
 * Usage:
 * ```tsx
 * import { Outlet, Scripts } from 'react-router';
 *
 * export default function Root() {
 *   return (
 *     <html>
 *       <head>...</head>
 *       <body>
 *         <Outlet />
 *         <Scripts />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @param props - Props passed through to the underlying React Router Scripts component
 * @returns A fragment containing internal bundle scripts and React Router scripts
 */
declare function Scripts(props: React.ComponentProps<typeof Scripts$1>): react_jsx_runtime0.JSX.Element;
//#endregion
export { Scripts };
//# sourceMappingURL=Scripts-CdqbajoV.d.ts.map