import type {
  FamilyTreeGraph,
  FamilyTreeListResponse,
  PersonSidebarDetail,
} from "@family-tree/shared-types";
import { apiGet } from "../../lib/api/client";

export const getTrees = () => apiGet<FamilyTreeListResponse>("/trees");
export const getTreeGraph = (treeId: string) =>
  apiGet<FamilyTreeGraph>(`/trees/${treeId}/graph`);
export const getPersonDetail = (treeId: string, personId: string) =>
  apiGet<PersonSidebarDetail>(`/trees/${treeId}/persons/${personId}`);
