import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
import type { FamilyEdgeData } from "./layout";

type FamilyRelationshipRouteEdge = Edge<FamilyEdgeData, "relationship-route">;

export function FamilyRelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
}: EdgeProps<FamilyRelationshipRouteEdge>) {
  const routeY = Math.max(data?.routeY ?? sourceY, sourceY, targetY);
  const stub = 16;
  const radius = 8;
  const sourceBendX = sourceX + stub;
  const targetBendX = targetX - stub;
  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceBendX - radius} ${sourceY}`,
    `Q ${sourceBendX} ${sourceY} ${sourceBendX} ${sourceY + radius}`,
    `L ${sourceBendX} ${routeY - radius}`,
    `Q ${sourceBendX} ${routeY} ${sourceBendX + radius} ${routeY}`,
    `L ${targetBendX - radius} ${routeY}`,
    `Q ${targetBendX} ${routeY} ${targetBendX} ${routeY - radius}`,
    `L ${targetBendX} ${targetY + radius}`,
    `Q ${targetBendX} ${targetY} ${targetBendX + radius} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={(sourceX + targetX) / 2}
      labelY={routeY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );
}
