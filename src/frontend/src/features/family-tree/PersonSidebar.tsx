import type {
  DatePrecision,
  MarriageStatus,
  PersonNode,
  PersonSidebarDetail,
  RelatedPerson,
} from "@family-tree/shared-types";
import { Link } from "react-router-dom";

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

const partnerRole = (gender: RelatedPerson["gender"]) =>
  gender === "MALE" ? "Chồng" : gender === "FEMALE" ? "Vợ" : "Thành viên";

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
      className={`relative-person relative-person-${person.gender.toLowerCase()} ${person.isDeceased ? "relative-person-deceased" : ""} ${role ? "relative-person-with-role" : ""}`}
      onClick={() => onSelect(person.id)}
      aria-label={accessibleDetails}
    >
      {role && <span className="relative-role">{role}</span>}
      <span className="relative-person-copy">
        <strong>{person.preferredName ?? person.fullName}</strong>
        {context && <small>{context}</small>}
      </span>
      <span className="relative-person-meta">
        {year && <small className="relative-birth-year">{year}</small>}
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
    <section className="sidebar-section family-connections">
      <h3>Người thân</h3>
      {parents.length || partnerFamilies.length || children.length ? (
        <div className="family-relatives-card">
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
            <div className="relative-section">
              <h4>Vợ/chồng</h4>
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
            <div className="relative-section">
              <h4>Con cái</h4>
              {children.map(({ child, partner, key }) => (
                <PersonButton
                  key={key}
                  person={child}
                  onSelect={onSelectPerson}
                  role="Con"
                  context={
                    partner
                      ? `Con với ${partner.preferredName ?? partner.fullName}`
                      : "Chưa xác định người còn lại"
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="relative-empty">Chưa có thông tin người thân.</p>
      )}
    </section>
  );
}

export function PersonSidebar({
  person,
  loading,
  onClose,
  onSelectPerson,
}: {
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
    <aside className="person-sidebar" aria-label="Thông tin thành viên">
      <button
        className="sidebar-close"
        type="button"
        onClick={onClose}
        aria-label="Đóng"
      >
        ×
      </button>
      {loading && <div className="sidebar-loading">Đang tải thông tin…</div>}
      {!loading && person && (
        <>
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
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
          <dl className="sidebar-details">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <FamilyConnections person={person} onSelectPerson={onSelectPerson} />
          {person.biography && (
            <section className="sidebar-section">
              <h3>Tiểu sử</h3>
              <p>{person.biography}</p>
            </section>
          )}
          <section className="sidebar-section">
            <h3>Thuộc các gia phả</h3>
            <div className="sidebar-tree-list">
              {person.visibleTrees.map((tree) => (
                <Link
                  key={tree.id}
                  to={`/trees/${tree.id}?person=${person.id}`}
                >
                  {tree.name}
                </Link>
              ))}
            </div>
          </section>
          <button
            className="button-primary sidebar-detail-button"
            type="button"
            disabled
            title="Sắp ra mắt"
          >
            Xem chi tiết · Sắp ra mắt
          </button>
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
    <aside
      className="person-sidebar relationship-sidebar"
      aria-label="Thông tin mối quan hệ"
    >
      <button
        className="sidebar-close"
        type="button"
        onClick={onClose}
        aria-label="Đóng"
      >
        ×
      </button>
      <div className="sidebar-profile relationship-profile">
        <p>MỐI QUAN HỆ</p>
        <h2>{statusLabel(status)}</h2>
      </div>
      <section className="sidebar-section">
        <h3>Hai thành viên</h3>
        <div className="relationship-people">
          <div className="relationship-member">
            <span>{partnerRole(first.gender)}</span>
            <PersonButton person={first} onSelect={onSelectPerson} />
          </div>
          <span>—</span>
          <div className="relationship-member">
            <span>{partnerRole(second.gender)}</span>
            <PersonButton person={second} onSelect={onSelectPerson} />
          </div>
        </div>
      </section>
      <section className="sidebar-section">
        <h3>Con chung</h3>
        <div className="sidebar-tree-list">
          {children.length ? (
            children.map((child) => (
              <PersonButton
                key={child.id}
                person={child}
                onSelect={onSelectPerson}
              />
            ))
          ) : (
            <p className="relative-empty">Chưa có thông tin con chung.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
