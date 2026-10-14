import type {
  DatePrecision,
  MarriageStatus,
  PersonNode,
  PersonSidebarDetail,
  RelatedPerson,
} from "@family-tree/shared-types";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { primaryButtonClass } from "../../lib/ui-classes";

const sidebarClass =
  "absolute right-0 bottom-0 left-0 top-[38%] z-10 overflow-y-auto rounded-t-2xl border-t border-border-control bg-[#fbfcfb] p-[1.35rem] shadow-[0_-14px_35px_rgba(27,54,47,0.18)] animate-[drawer-in_0.22s_ease-out] min-[801px]:top-0 min-[801px]:left-auto min-[801px]:w-92 min-[801px]:rounded-none min-[801px]:border-t-0 min-[801px]:border-l min-[801px]:shadow-[-14px_0_35px_rgba(27,54,47,0.14)] min-[801px]:animate-[sidebar-in_0.22s_ease-out]";
const closeButtonClass =
  "absolute top-[0.8rem] right-[0.9rem] grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-[#e6ece8] text-[#314a42]";
const profileClass =
  "px-[1.8rem] pt-[0.8rem] pb-[1.25rem] text-center [&>p]:mt-[0.8rem] [&>p]:mb-[0.35rem] [&>p]:text-[0.67rem] [&>p]:font-bold [&>p]:tracking-[0.12em] [&>p]:text-accent-deep [&>h2]:m-0 [&>h2]:font-display [&>h2]:text-[1.55rem] [&>h2]:font-semibold [&>span]:text-sm [&>span]:text-[#65786e]";
const sectionClass =
  "mt-[1.3rem] [&>h3]:mt-0 [&>h3]:mb-[0.6rem] [&>h3]:font-display [&>h3]:font-semibold [&>p]:leading-[1.55] [&>p]:text-ink-muted";
const treeListClass =
  "grid gap-[0.45rem] [&>a]:rounded-[0.4rem] [&>a]:bg-surface-hover [&>a]:p-[0.65rem] [&>a]:text-[0.82rem] [&>a]:font-bold [&>a]:text-[#47665c] [&>a]:no-underline";
const relationshipListClass =
  "grid gap-0 overflow-hidden rounded-[0.45rem] border border-[#dce5e0] bg-[#f4f7f5]";
const emptyClass = "my-[0.35rem] text-[0.82rem]! text-ink-subtle!";
const genderBorderClass: Record<RelatedPerson["gender"], string> = {
  MALE: "border-l-[#4f8aa5]",
  FEMALE: "border-l-[#b86e8d]",
  OTHER: "border-l-[#7b8e85]",
  UNKNOWN: "border-l-[#7b8e85]",
};

function displayDate(value: string | null, precision: DatePrecision | null) {
  if (!value) return null;
  const date = new Date(value);
  if (precision === "YEAR") return String(date.getUTCFullYear());
  if (precision === "MONTH")
    return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(date);
}

function age(person: PersonSidebarDetail) {
  if (!person.birthDate) return null;
  const start = new Date(person.birthDate);
  const end = person.deathDate ? new Date(person.deathDate) : new Date();
  let value = end.getUTCFullYear() - start.getUTCFullYear();
  if (
    end.getUTCMonth() < start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() &&
      end.getUTCDate() < start.getUTCDate())
  )
    value--;
  return Math.max(0, value);
}

const statusLabel = (status: MarriageStatus | "CO_PARENT" | null) =>
  status === "MARRIED"
    ? "Kết hôn"
    : status === "DIVORCED"
      ? "Ly hôn"
      : status === "SEPARATED"
        ? "Ly thân"
        : status === "WIDOWED"
          ? "Góa"
          : status === "CO_PARENT"
            ? "Có con chung"
            : "Không rõ";

const genderLabel = (gender: RelatedPerson["gender"]) =>
  gender === "MALE"
    ? "Nam"
    : gender === "FEMALE"
      ? "Nữ"
      : gender === "OTHER"
        ? "Khác"
        : "Chưa rõ";

function PersonButton({
  person,
  onSelect,
  context,
  role,
}: {
  person: RelatedPerson | PersonNode;
  onSelect: (personId: string) => void;
  context?: string;
  role?: string;
}) {
  const year = person.birthDate
    ? new Date(person.birthDate).getUTCFullYear()
    : null;
  const accessibleDetails = [
    role,
    person.preferredName ?? person.fullName,
    genderLabel(person.gender),
    year,
    person.isDeceased ? "Đã mất" : null,
    context,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <button
      type="button"
      className={`relative grid w-full min-w-0 cursor-pointer items-center gap-[0.45rem] rounded-none border-0 border-l-[3px] bg-transparent px-[0.7rem] py-[0.48rem] text-left text-ink-strong hover:bg-[#e5ede9] focus-visible:bg-[#e5ede9] focus-visible:outline-none ${genderBorderClass[person.gender]} ${role ? "grid-cols-[4.7rem_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"} ${person.isDeceased ? "bg-[repeating-linear-gradient(-45deg,rgba(111,123,117,0.045),rgba(111,123,117,0.045)_5px,transparent_5px,transparent_10px)] text-[#66736d] saturate-[.62]" : ""}`}
      onClick={() => onSelect(person.id)}
      aria-label={accessibleDetails}
    >
      {role && (
        <span className="text-[0.7rem] font-semibold text-ink-subtle">
          {role}
        </span>
      )}
      <span className="grid min-w-0 gap-[0.12rem]">
        <strong className="truncate text-[0.76rem] font-bold text-ink-strong">
          {person.preferredName ?? person.fullName}
        </strong>
        {context && (
          <small className="truncate text-[0.63rem] font-medium text-[#788a81]">
            {context}
          </small>
        )}
      </span>
      <span className="flex shrink-0 items-center justify-end gap-1">
        {year && (
          <small className="text-[0.61rem] font-semibold text-[#60746a] tabular-nums">
            {year}
          </small>
        )}
      </span>
    </button>
  );
}

function FamilyConnections({
  person,
  onSelectPerson,
}: {
  person: PersonSidebarDetail;
  onSelectPerson: (personId: string) => void;
}) {
  const parents = [...person.parents].sort((left, right) => {
    const order = { MALE: 0, FEMALE: 1, OTHER: 2, UNKNOWN: 3 };
    return order[left.person.gender] - order[right.person.gender];
  });
  const partnerFamilies = person.partnerFamilies.filter(
    (family) => family.partner,
  );
  const children = person.partnerFamilies.flatMap((family, familyIndex) =>
    family.children.map((child) => ({
      child,
      partner: family.partner,
      key: `${family.partner?.id ?? `unknown-${familyIndex}`}-${child.id}`,
    })),
  );

  return (
    <section className={`${sectionClass} pt-[0.3rem]`}>
      <h3>Người thân</h3>
      {parents.length || partnerFamilies.length || children.length ? (
        <div className="overflow-hidden rounded-[0.55rem] border border-[#dce5e0] bg-[#f4f7f5]">
          {parents.map(({ person: parent, parentKind }) => {
            const role =
              parent.gender === "MALE"
                ? "Bố"
                : parent.gender === "FEMALE"
                  ? "Mẹ"
                  : "Cha/mẹ";
            return (
              <PersonButton
                key={parent.id}
                person={parent}
                onSelect={onSelectPerson}
                role={`${role}${parentKind === "ADOPTIVE" ? " nuôi" : ""}`}
              />
            );
          })}

          {partnerFamilies.length > 0 && (
            <div className="border-t border-[#d9e3dd] pt-[0.15rem]">
              <h4 className="m-0 px-3 pt-[0.65rem] pb-1 text-[0.68rem] tracking-[0.07em] text-[#60746a] uppercase">
                Vợ/chồng
              </h4>
              {partnerFamilies.map((family) => (
                <PersonButton
                  key={family.partner!.id}
                  person={family.partner!}
                  onSelect={onSelectPerson}
                  role={statusLabel(family.relationshipStatus)}
                />
              ))}
            </div>
          )}

          {children.length > 0 && (
            <div className="border-t border-[#d9e3dd] pt-[0.15rem]">
              <h4 className="m-0 px-3 pt-[0.65rem] pb-1 text-[0.68rem] tracking-[0.07em] text-[#60746a] uppercase">
                Con cái
              </h4>
              {children.map(({ child, partner, key }) => (
                <PersonButton
                  key={key}
                  person={child}
                  onSelect={onSelectPerson}
                  context={
                    partner
                      ? `Con với ${partner.preferredName ?? partner.fullName}`
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className={emptyClass}>Chưa có thông tin người thân.</p>
      )}
    </section>
  );
}

export function PersonSidebar({
  treeId,
  person,
  loading,
  onClose,
  onSelectPerson,
}: {
  treeId: string;
  person?: PersonSidebarDetail;
  loading: boolean;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
}) {
  const rows = person
    ? [
        ["Tên khác", person.aliases.join(", ")],
        ["Giới tính", genderLabel(person.gender)],
        ["Trạng thái", person.isDeceased ? "Đã mất" : "Còn sống"],
        ["Tuổi", age(person)?.toString()],
        ["Ngày sinh", displayDate(person.birthDate, person.birthDatePrecision)],
        ["Nơi sinh", person.birthPlace],
        ["Ngày mất", displayDate(person.deathDate, person.deathDatePrecision)],
        ["Nơi mất", person.deathPlace],
        ["Quê quán", person.hometown],
        ["Nơi ở", person.currentResidence],
        ["Quốc tịch", person.nationality],
        ["Dân tộc", person.ethnicity],
        ["Tôn giáo", person.religion],
        ["Nghề nghiệp", person.occupation],
      ].filter(([, value]) => Boolean(value))
    : [];

  return (
    <aside className={sidebarClass} aria-label="Thông tin thành viên">
      <button
        className={closeButtonClass}
        type="button"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X size={16} aria-hidden="true" />
      </button>
      {loading && (
        <div className="grid min-h-60 place-items-center text-ink-muted">
          Đang tải thông tin…
        </div>
      )}
      {!loading && person && (
        <>
          <div className={profileClass}>
            <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-full bg-[#dbe6e0] font-display text-[2rem] font-semibold text-ink-soft [&_img]:size-full [&_img]:object-cover">
              {person.avatarUrl ? (
                <img src={person.avatarUrl} alt="" />
              ) : (
                person.fullName.slice(0, 1)
              )}
            </div>
            <p>THÀNH VIÊN GIA PHẢ</p>
            <h2>{person.fullName}</h2>
            {person.preferredName && <span>{person.preferredName}</span>}
          </div>
          <dl className="m-0 border-t border-[#dae3de]">
            {rows.map(([label, value]) => (
              <div
                className="grid grid-cols-[7rem_1fr] gap-[0.7rem] border-b border-[#e2e8e4] py-[0.65rem]"
                key={label}
              >
                <dt className="text-[0.78rem] text-ink-subtle">{label}</dt>
                <dd className="m-0 text-[0.84rem] font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <FamilyConnections person={person} onSelectPerson={onSelectPerson} />
          {person.biography && (
            <section className={sectionClass}>
              <h3>Tiểu sử</h3>
              <p>{person.biography}</p>
            </section>
          )}
          <section className={sectionClass}>
            <h3>Thuộc các gia phả</h3>
            <div className={treeListClass}>
              {person.visibleTrees.map((tree) => (
                <Link
                  key={tree.id}
                  to={`/trees/${tree.id}/tree?person=${person.id}`}
                >
                  {tree.name}
                </Link>
              ))}
            </div>
          </section>
          <Link
            className={`${primaryButtonClass} mt-[1.4rem] flex w-full justify-center no-underline`}
            to={`/trees/${treeId}/persons/${person.id}`}
          >
            Xem chi tiết
          </Link>
        </>
      )}
    </aside>
  );
}

export function RelationshipSidebar({
  first,
  second,
  status,
  children,
  onClose,
  onSelectPerson,
}: {
  first: PersonNode;
  second: PersonNode;
  status: MarriageStatus | "CO_PARENT";
  children: PersonNode[];
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
}) {
  return (
    <aside className={sidebarClass} aria-label="Thông tin mối quan hệ">
      <button
        className={closeButtonClass}
        type="button"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <div className={`${profileClass} pt-[2.4rem]`}>
        <p>MỐI QUAN HỆ</p>
        <h2>{statusLabel(status)}</h2>
      </div>
      <section className={sectionClass}>
        <h3>Vợ/chồng</h3>
        <div className={relationshipListClass}>
          <PersonButton person={first} onSelect={onSelectPerson} />
          <PersonButton person={second} onSelect={onSelectPerson} />
        </div>
      </section>
      {children.length > 0 && (
        <section className={sectionClass}>
          <h3>Con cái</h3>
          <div className={relationshipListClass}>
            {children.map((child) => (
              <PersonButton
                key={child.id}
                person={child}
                onSelect={onSelectPerson}
              />
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
