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
  biography: string | null;
  visibleTrees: FamilyTreeSummary[];
  parents: PersonParent[];
  partnerFamilies: PartnerFamily[];
}
