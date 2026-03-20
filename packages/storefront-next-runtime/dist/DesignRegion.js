import "./messaging-api.js";
import { a as isComponentTypeAllowedInRegion, i as useDesignState } from "./DesignContext.js";
import "./modeDetection.js";
import "./PageDesignerProvider.js";
import { n as useComponentContext, r as RegionContext } from "./ComponentContext.js";
import { i as useNodeToTargetStore, n as useLabels, t as DesignFrame } from "./DesignFrame.js";
import React, { useCallback, useMemo } from "react";
import { jsx } from "react/jsx-runtime";

//#region src/design/react/hooks/useRegionDecoratorClasses.ts
function useRegionDecoratorClasses({ regionId, componentTypeInclusions, componentTypeExclusions }) {
	const { dragState: { currentDropTarget, componentType } } = useDesignState();
	const isHovered = regionId && currentDropTarget?.regionId === regionId;
	const isComponentAllowed = useMemo(() => isComponentTypeAllowedInRegion(componentType, componentTypeInclusions, componentTypeExclusions), [
		componentType,
		componentTypeInclusions,
		componentTypeExclusions
	]);
	return [
		"pd-design__decorator",
		"pd-design__region",
		isHovered && isComponentAllowed && "pd-design__region--hovered pd-design__frame--visible"
	].filter(Boolean).join(" ");
}

//#endregion
//#region src/design/react/components/DesignRegion.tsx
function DesignRegion(props) {
	const { designMetadata, children, className } = props;
	const { name, id = "", componentIds = [], componentTypeInclusions = [], componentTypeExclusions = [] } = designMetadata ?? {};
	const nodeRef = React.useRef(null);
	const classes = useRegionDecoratorClasses({
		regionId: id,
		componentTypeInclusions,
		componentTypeExclusions
	});
	const { dragState } = useDesignState();
	const labels = useLabels();
	const showFrame = Boolean(id && dragState.currentDropTarget?.regionId === id);
	const { componentId: parentComponentId } = useComponentContext() ?? {};
	useNodeToTargetStore({
		type: "region",
		nodeRef,
		parentId: parentComponentId,
		componentIds,
		componentId: parentComponentId ?? "",
		regionId: id,
		componentTypeInclusions,
		componentTypeExclusions
	});
	const context = React.useMemo(() => ({
		regionId: id,
		componentIds
	}), [id, componentIds]);
	return /* @__PURE__ */ jsx("div", {
		className: classes,
		ref: nodeRef,
		onDragOver: useCallback((event) => {
			if (isComponentTypeAllowedInRegion(dragState.componentType, componentTypeInclusions, componentTypeExclusions)) event.preventDefault();
		}, [
			dragState.componentType,
			componentTypeInclusions,
			componentTypeExclusions
		]),
		"data-region-id": id,
		children: /* @__PURE__ */ jsx(DesignFrame, {
			name: name ?? labels.defaultRegionName ?? "Region",
			parentId: parentComponentId,
			regionId: id,
			localized: true,
			showFrame,
			showToolbox: false,
			className,
			children: /* @__PURE__ */ jsx(RegionContext.Provider, {
				value: context,
				children
			})
		})
	});
}

//#endregion
export { DesignRegion };
//# sourceMappingURL=DesignRegion.js.map