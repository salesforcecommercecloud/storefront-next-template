import "./modeDetection.js";
import "./messaging-api.js";
import { r as useDesignContext } from "./DesignContext.js";
import { n as usePageDesignerMode } from "./PageDesignerProvider.js";
import { useEffect } from "react";
import { Fragment, jsx } from "react/jsx-runtime";

//#region src/design/react/components/PageRegistration.tsx
/**
* Copyright (c) 2025, Salesforce, Inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/**
* Wraps page designer page content and communicates page data back up to the host Page Designer.
* @param props.page - The page data to communicate back to the host Page Designer.
*/
function PageRegistration({ page, children }) {
	const { clientApi, setClientPage } = useDesignContext();
	const { isDesignMode } = usePageDesignerMode();
	useEffect(() => {
		if (isDesignMode) {
			setClientPage(page);
			clientApi?.notifyClientPageChanged({ page });
		}
	}, [
		clientApi,
		page,
		isDesignMode,
		setClientPage
	]);
	return /* @__PURE__ */ jsx(Fragment, { children });
}

//#endregion
export { PageRegistration };
//# sourceMappingURL=PageRegistration.js.map