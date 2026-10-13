import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type FamilyJunctionNodeData = {
  personIds: string[];
} & Record<string, unknown>;

export type FamilyJunctionFlowNode = Node<FamilyJunctionNodeData, "junction">;

export function FamilyJunctionNode(_: NodeProps<FamilyJunctionFlowNode>) {
  return (
    <div
      className="family-junction pointer-events-none size-px"
      aria-hidden="true"
    >
      <Handle id="junction-target" type="target" position={Position.Top} />
      <Handle id="junction-source" type="source" position={Position.Bottom} />
    </div>
  );
}
