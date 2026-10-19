import type { PersonNode } from "@family-tree/shared-types";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type FamilyPersonNodeData = PersonNode & {
  selectedPerson: boolean;
} & Record<string, unknown>;
export type FamilyFlowNode = Node<FamilyPersonNodeData, "person">;

const year = (date: string | null) =>
  date ? new Date(date).getUTCFullYear() : null;

const genderBorderClass: Record<PersonNode["gender"], string> = {
  MALE: "border-l-[7px] border-l-[#4f8aa5]",
  FEMALE: "border-l-[7px] border-l-[#b86e8d]",
  OTHER: "border-l-[7px] border-l-[#7b8e85]",
  UNKNOWN: "border-l-[7px] border-l-[#7b8e85]",
};

function nodeBackgroundClass(isDeceased: boolean, isSelected: boolean) {
  if (!isDeceased) return isSelected ? "bg-[#e5ede9] outline-none" : "bg-white";
  return isSelected
    ? "[background:repeating-linear-gradient(-45deg,rgba(111,123,117,0.055),rgba(111,123,117,0.055)_5px,transparent_5px,transparent_10px),#e5ede9] saturate-62 outline-none"
    : "[background:repeating-linear-gradient(-45deg,rgba(111,123,117,0.055),rgba(111,123,117,0.055)_5px,transparent_5px,transparent_10px),#f4f7f5] saturate-62";
}

export function FamilyPersonNode({ data: person }: NodeProps<FamilyFlowNode>) {
  const initials = person.fullName
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const genderLabel =
    person.gender === "MALE"
      ? "Nam"
      : person.gender === "FEMALE"
        ? "Nữ"
        : "Chưa rõ";
  const lifespan = [year(person.birthDate), year(person.deathDate)]
    .filter(Boolean)
    .join(" – ");
  return (
    <article
      className={`family-node flex min-h-20 w-[200px] items-center gap-[0.6rem] rounded-[0.7rem] border-2 border-[#869e93] p-2.5 text-ink shadow-[0_8px_20px_rgba(30,58,51,0.14)] transition-[transform,background-color,box-shadow,border-color] duration-180 ${genderBorderClass[person.gender]} ${nodeBackgroundClass(person.isDeceased, person.selectedPerson)}`}
      aria-label={`${person.fullName}, ${genderLabel}${person.isDeceased ? ", đã mất" : ""}`}
    >
      <Handle id="child-target" type="target" position={Position.Top} />
      <Handle
        id="pair-target-left"
        type="target"
        position={Position.Left}
        className="family-horizontal-handle"
      />
      <Handle
        id="pair-source-left"
        type="source"
        position={Position.Left}
        className="family-horizontal-handle"
      />
      <div className="grid size-[2.4rem] shrink-0 place-items-center overflow-hidden rounded-full bg-[#dce7e1] font-bold text-ink-soft [&_img]:size-full [&_img]:object-cover">
        {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials}
      </div>
      <div className="grid min-w-0 gap-[0.18rem]">
        <strong className="truncate text-[0.88rem]">
          {person.preferredName ?? person.fullName}
        </strong>
        <span className="text-[0.72rem] text-ink-muted">
          {genderLabel}
          {lifespan ? ` · ${lifespan}` : ""}
        </span>
        {person.isDeceased && (
          <small className="w-fit rounded-2xl bg-[#d7ddda] px-[0.36rem] py-[0.12rem] text-[0.63rem] text-[#52635b]">
            Đã mất
          </small>
        )}
      </div>
      <Handle
        id="pair-target-right"
        type="target"
        position={Position.Right}
        className="family-horizontal-handle"
      />
      <Handle
        id="pair-source-right"
        type="source"
        position={Position.Right}
        className="family-horizontal-handle"
      />
      <Handle id="parent-source" type="source" position={Position.Bottom} />
    </article>
  );
}
