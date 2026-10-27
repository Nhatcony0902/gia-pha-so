import type {
  AcceptInvitationResponse,
  CreatedTreeInvitation,
  InvitationPreview,
  TreeInvitationInput,
  TreeInvitationListResponse,
  TreeMemberListResponse,
  TreeRole,
} from "@family-tree/shared-types";
import { apiDelete, apiGet, apiPost, publicApi } from "../../lib/api/client";

export const roleLabel: Record<TreeRole, string> = {
  ADMIN: "Trưởng họ",
  EDITOR: "Biên tập viên",
  VIEWER: "Thành viên (chỉ xem)",
};

export const inviteUrl = (token: string) =>
  `${window.location.origin}/invite/${token}`;

export const getTreeMembers = (treeId: string) =>
  apiGet<TreeMemberListResponse>(`/trees/${treeId}/members`);
export const removeTreeMember = (treeId: string, userId: string) =>
  apiDelete<{ success: true }>(`/trees/${treeId}/members/${userId}`);
export const getTreeInvitations = (treeId: string) =>
  apiGet<TreeInvitationListResponse>(`/trees/${treeId}/invitations`);
export const createTreeInvitation = (
  treeId: string,
  body: TreeInvitationInput,
) => apiPost<CreatedTreeInvitation>(`/trees/${treeId}/invitations`, body);
export const revokeTreeInvitation = (treeId: string, invitationId: string) =>
  apiDelete<{ success: true }>(`/trees/${treeId}/invitations/${invitationId}`);
export const getInvitationPreview = (token: string) =>
  publicApi<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`);
export const acceptInvitation = (token: string) =>
  apiPost<AcceptInvitationResponse>(
    `/invitations/${encodeURIComponent(token)}/accept`,
  );
