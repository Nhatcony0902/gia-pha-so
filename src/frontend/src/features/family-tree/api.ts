import type {
  FamilyTreeGraph,
  FamilyTreeListResponse,
  PersonSidebarDetail,
  PersonListResponse,
  PersonUpdateInput,
  PersonImage,
  CloudinarySignature,
} from "@family-tree/shared-types";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/api/client";

export const getTrees = () => apiGet<FamilyTreeListResponse>("/trees");
export const getTreeGraph = (treeId: string) =>
  apiGet<FamilyTreeGraph>(`/trees/${treeId}/graph`);
export const getPersonDetail = (treeId: string, personId: string) =>
  apiGet<PersonSidebarDetail>(`/trees/${treeId}/persons/${personId}`);
export const getTreePersons = (treeId: string) =>
  apiGet<PersonListResponse>(`/trees/${treeId}/persons`);
export const updatePerson = (
  treeId: string,
  personId: string,
  body: PersonUpdateInput,
) =>
  apiPatch<PersonSidebarDetail>(`/trees/${treeId}/persons/${personId}`, body);
export const deletePerson = (treeId: string, personId: string) =>
  apiDelete<{ success: true }>(`/trees/${treeId}/persons/${personId}`);
export const getUploadSignature = (treeId: string, personId: string) =>
  apiPost<CloudinarySignature>(
    `/trees/${treeId}/persons/${personId}/uploads/signature`,
  );
export const addPersonImage = (
  treeId: string,
  personId: string,
  body: Omit<PersonImage, "id">,
) => apiPost<PersonImage>(`/trees/${treeId}/persons/${personId}/images`, body);
export const deletePersonImage = (
  treeId: string,
  personId: string,
  imageId: string,
) =>
  apiDelete<{ success: true }>(
    `/trees/${treeId}/persons/${personId}/images/${imageId}`,
  );

export async function uploadPersonImage(
  treeId: string,
  personId: string,
  file: File,
) {
  const signed = await getUploadSignature(treeId, personId);
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signed.apiKey);
  body.set("timestamp", String(signed.timestamp));
  body.set("signature", signed.signature);
  body.set("folder", signed.folder);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: "POST", body },
  );
  if (!response.ok) throw new Error("Không thể tải ảnh lên Cloudinary");
  return response.json() as Promise<{
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }>;
}
