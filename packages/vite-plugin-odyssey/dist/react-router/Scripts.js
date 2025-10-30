import { Scripts as Scripts$1 } from "react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

//#region src/react-router/Scripts.tsx
/**
* Determines if the code is running in a server-side rendering (SSR) environment.
* Returns true when window is undefined (server), false otherwise (client).
*/
const isSSR = typeof window === "undefined";
/**
* Internal component that injects bundle configuration scripts during server-side rendering.
*
* This component renders a script tag that sets up global bundle variables on the window object,
* which are used by the client-side application to locate and load the correct bundle assets.
*
* The script defines:
* - `window._BUNDLE_ID`: The unique identifier for the current bundle (from BUNDLE_ID env var, defaults to 'local')
* - `window._BUNDLE_PATH`: The path to the client bundle assets (e.g., `/mobify/bundle/{bundleId}/client/`)
*
* @returns A script element during SSR, or null during client-side rendering
* @internal
*/
const InternalServerScripts = () => {
	if (!isSSR) return null;
	const bundleId = process.env.BUNDLE_ID || "local";
	const bundlePath = `/mobify/bundle/${bundleId}/client/`;
	return /* @__PURE__ */ jsx("script", {
		id: "sf-next-bundle-config",
		dangerouslySetInnerHTML: { __html: `
        window._BUNDLE_ID = ${JSON.stringify(bundleId)};
        window._BUNDLE_PATH = ${JSON.stringify(bundlePath)};
    ` }
	});
};
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
function Scripts(props) {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(InternalServerScripts, {}), /* @__PURE__ */ jsx(Scripts$1, { ...props })] });
}

//#endregion
export { Scripts };
//# sourceMappingURL=Scripts.js.map