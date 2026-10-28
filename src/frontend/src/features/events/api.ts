import type {
  AddEventGuestsInput,
  AddEventMediaInput,
  CloudinarySignature,
  EventCoverInput,
  FamilyEventDetail,
  FamilyEventInput,
  FamilyEventUpdateInput,
  NotificationListResponse,
  TimelineResponse,
} from "@family-tree/shared-types";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/api/client";

export const getTimeline = (treeId: string) =>
  apiGet<TimelineResponse>(`/trees/${treeId}/timeline`);
export const createEvent = (treeId: string, body: FamilyEventInput) =>
  apiPost<{ id: string }>(`/trees/${treeId}/events`, body);
export const getEvent = (treeId: string, eventId: string) =>
  apiGet<FamilyEventDetail>(`/trees/${treeId}/events/${eventId}`);
export const updateEvent = (
  treeId: string,
  eventId: string,
  body: FamilyEventUpdateInput,
) => apiPatch<FamilyEventDetail>(`/trees/${treeId}/events/${eventId}`, body);
export const deleteEvent = (treeId: string, eventId: string) =>
  apiDelete<{ success: true }>(`/trees/${treeId}/events/${eventId}`);
export const addEventGuests = (
  treeId: string,
  eventId: string,
  body: AddEventGuestsInput,
) =>
  apiPost<FamilyEventDetail>(`/trees/${treeId}/events/${eventId}/guests`, body);
export const deleteEventGuest = (
  treeId: string,
  eventId: string,
  guestId: string,
) =>
  apiDelete<{ success: true }>(
    `/trees/${treeId}/events/${eventId}/guests/${guestId}`,
  );
export const acceptEventInvitation = (treeId: string, eventId: string) =>
  apiPost<FamilyEventDetail>(
    `/trees/${treeId}/events/${eventId}/guests/accept`,
  );
export const declineEventInvitation = (treeId: string, eventId: string) =>
  apiPost<FamilyEventDetail>(
    `/trees/${treeId}/events/${eventId}/guests/decline`,
  );
export const getEventUploadSignature = (treeId: string, eventId: string) =>
  apiPost<CloudinarySignature>(
    `/trees/${treeId}/events/${eventId}/uploads/signature`,
  );
export const addEventMedia = (
  treeId: string,
  eventId: string,
  body: AddEventMediaInput,
) => apiPost(`/trees/${treeId}/events/${eventId}/media`, body);
export const deleteEventMedia = (
  treeId: string,
  eventId: string,
  mediaId: string,
) =>
  apiDelete<{ success: true }>(
    `/trees/${treeId}/events/${eventId}/media/${mediaId}`,
  );
export const setEventCover = (
  treeId: string,
  eventId: string,
  body: EventCoverInput,
) =>
  apiPatch<FamilyEventDetail>(
    `/trees/${treeId}/events/${eventId}/cover`,
    body,
  );
export const deleteEventCover = (treeId: string, eventId: string) =>
  apiDelete<FamilyEventDetail>(`/trees/${treeId}/events/${eventId}/cover`);

export async function uploadEventFile(
  treeId: string,
  eventId: string,
  file: File,
) {
  const signed = await getEventUploadSignature(treeId, eventId);
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signed.apiKey);
  body.set("timestamp", String(signed.timestamp));
  body.set("signature", signed.signature);
  body.set("folder", signed.folder);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`,
    { method: "POST", body },
  );
  if (!response.ok) throw new Error("Không thể tải tệp lên Cloudinary");
  return response.json() as Promise<{
    secure_url: string;
    public_id: string;
    resource_type: "image" | "raw";
    original_filename?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  }>;
}

export const getNotifications = () =>
  apiGet<NotificationListResponse>("/notifications");
export const readNotification = (notificationId: string) =>
  apiPatch<{ success: true }>(`/notifications/${notificationId}/read`, {});
export const readAllNotifications = () =>
  apiPatch<{ success: true }>("/notifications/read-all", {});
