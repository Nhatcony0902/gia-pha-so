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

export interface FamilyTreeSummary {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  originPlace: string | null;
  personCount: number;
  updatedAt: string;
}

export interface FamilyTreeListResponse {
  createdByMe: FamilyTreeSummary[];
  sharedWithMe: FamilyTreeSummary[];
}

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
  visibleTrees: FamilyTreeSummary[];
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

export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}
