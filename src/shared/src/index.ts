export interface HealthResponse {
  status: "ok" | "degraded";
  service: "family-tree-api";
  timestamp: string;
  authenticated: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse extends AuthUser {
  memberships: unknown[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type DatePrecision = "YEAR" | "MONTH" | "DAY";
export type ParentKind = "BIOLOGICAL" | "ADOPTIVE";
export type MarriageStatus = "MARRIED" | "DIVORCED" | "SEPARATED" | "WIDOWED";
export type PrimitiveRelationshipType = "PARENT_CHILD" | "SPOUSE";
export type TreeRole = "ADMIN" | "EDITOR" | "VIEWER";

export interface FamilyTreeSummary {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  originPlace: string | null;
  personCount: number;
  updatedAt: string;
  myRole: TreeRole;
}

export interface FamilyTreeListResponse {
  createdByMe: FamilyTreeSummary[];
  sharedWithMe: FamilyTreeSummary[];
}

export interface FamilyTreeInput {
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  originPlace?: string | null;
}

export type FamilyTreeUpdateInput = Partial<FamilyTreeInput>;

export interface PersonNode {
  id: string;
  fullName: string;
  preferredName: string | null;
  gender: Gender;
  avatarUrl: string | null;
  birthDate: string | null;
  birthDatePrecision: DatePrecision | null;
  deathDate: string | null;
  deathDatePrecision: DatePrecision | null;
  isDeceased: boolean;
}

export interface PrimitiveRelationship {
  id: string;
  type: PrimitiveRelationshipType;
  fromPersonId: string;
  toPersonId: string;
  parentKind: ParentKind | null;
  birthOrder: number | null;
  marriageStatus: MarriageStatus | null;
  marriageOrder: number | null;
  startedAt: string | null;
  startedAtPrecision: DatePrecision | null;
  endedAt: string | null;
  endedAtPrecision: DatePrecision | null;
}

export interface RelationshipInput {
  type: PrimitiveRelationshipType;
  fromPersonId: string;
  toPersonId: string;
  parentKind?: ParentKind | null;
  birthOrder?: number | null;
  marriageStatus?: MarriageStatus | null;
  marriageOrder?: number | null;
  startedAt?: string | null;
  startedAtPrecision?: DatePrecision | null;
  endedAt?: string | null;
  endedAtPrecision?: DatePrecision | null;
}

export type RelationshipUpdateInput = Partial<RelationshipInput>;

export interface FamilyTreeGraph {
  tree: FamilyTreeSummary;
  nodes: PersonNode[];
  edges: PrimitiveRelationship[];
}

export interface RelatedPerson {
  id: string;
  fullName: string;
  preferredName: string | null;
  gender: Gender;
  avatarUrl: string | null;
  isDeceased: boolean;
  birthDate: string | null;
  birthDatePrecision: DatePrecision | null;
}

export interface PersonParent {
  person: RelatedPerson;
  parentKind: ParentKind;
}

export interface PartnerFamily {
  partner: RelatedPerson | null;
  relationshipStatus: MarriageStatus | "CO_PARENT" | null;
  children: RelatedPerson[];
}

export interface PersonTreeRelative {
  relationshipId: string;
  role: "PARENT" | "CHILD" | "SPOUSE";
  label: string;
  person: RelatedPerson;
}

export interface PersonVisibleTree extends FamilyTreeSummary {
  relatives: PersonTreeRelative[];
}

export interface PersonSidebarDetail extends PersonNode {
  aliases: string[];
  birthPlace: string | null;
  deathPlace: string | null;
  hometown: string | null;
  currentResidence: string | null;
  nationality: string | null;
  ethnicity: string | null;
  religion: string | null;
  occupation: string | null;
  title: string | null;
  maidenName: string | null;
  education: string | null;
  employer: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bloodType: string | null;
  identificationCode: string | null;
  socialLinks: Record<string, string> | null;
  biography: string | null;
  notes: string | null;
  burialPlace: string | null;
  images: PersonImage[];
  visibleTrees: PersonVisibleTree[];
  parents: PersonParent[];
  partnerFamilies: PartnerFamily[];
}

export interface PersonImage {
  id: string;
  url: string;
  publicId: string;
  caption: string | null;
  takenAt: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  sortOrder: number;
}

export interface PersonListItem {
  id: string;
  fullName: string;
  preferredName: string | null;
  gender: Gender;
  avatarUrl: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  isDeceased: boolean;
  hometown: string | null;
  currentResidence: string | null;
  nationality: string | null;
  ethnicity: string | null;
  religion: string | null;
  occupation: string | null;
  phone: string | null;
  email: string | null;
}

export interface PersonListResponse {
  tree: FamilyTreeSummary;
  persons: PersonListItem[];
}

export interface PersonLinkCandidate extends PersonListItem {
  sourceTrees: Array<Pick<FamilyTreeSummary, "id" | "name">>;
}

export interface PersonLinkCandidatesResponse {
  persons: PersonLinkCandidate[];
}

export type PersonUpdateInput = Partial<{
  fullName: string;
  preferredName: string | null;
  aliases: string[];
  gender: Gender;
  birthDate: string | null;
  birthDatePrecision: DatePrecision | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathDatePrecision: DatePrecision | null;
  deathPlace: string | null;
  isDeceased: boolean;
  hometown: string | null;
  currentResidence: string | null;
  nationality: string | null;
  ethnicity: string | null;
  religion: string | null;
  occupation: string | null;
  title: string | null;
  maidenName: string | null;
  education: string | null;
  employer: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bloodType: string | null;
  identificationCode: string | null;
  socialLinks: Record<string, string> | null;
  biography: string | null;
  notes: string | null;
  burialPlace: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
}>;

export type PersonCreateInput = PersonUpdateInput & { fullName: string };

export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export interface LinkedPerson {
  id: string;
  fullName: string;
}

export interface TreeMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: TreeRole;
  joinedAt: string;
  person: LinkedPerson | null;
}

export interface TreeMemberListResponse {
  members: TreeMember[];
}

export type InvitationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";

export interface TreeInvitation {
  id: string;
  role: TreeRole;
  status: InvitationStatus;
  maxUses: number | null;
  useCount: number;
  expiresAt: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  /** Có email: lời mời đích danh, dùng một lần. Không có: link chung. */
  email: string | null;
  person: LinkedPerson | null;
}

export interface CreatedTreeInvitation extends TreeInvitation {
  /** Link chung: token trả về đúng một lần, lúc tạo. Lời mời email: null, link chỉ nằm trong email. */
  token: string | null;
}

export interface TreeInvitationListResponse {
  invitations: TreeInvitation[];
}

export interface TreeInvitationInput {
  expiresInDays?: number;
  maxUses?: number | null;
  /** Có thì gửi lời mời đích danh qua email (bỏ qua maxUses). */
  email?: string;
  personId?: string | null;
}

export interface InvitationPreview {
  tree: {
    name: string;
    coverUrl: string | null;
    originPlace: string | null;
    personCount: number;
  };
  role: TreeRole;
  invitedBy: { name: string };
  status: InvitationStatus;
  expiresAt: string;
  /** Email đã che bớt (vd: ng***@gmail.com) nếu là lời mời đích danh. */
  emailHint: string | null;
  person: { fullName: string } | null;
}

export interface AcceptInvitationResponse {
  treeId: string;
  role: TreeRole;
  alreadyMember: boolean;
}
