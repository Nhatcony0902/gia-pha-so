import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import {
  AddEventGuestsDto,
  AddEventMediaDto,
  CreateEventDto,
  UpdateEventDto,
} from "./events.dto.js";
import { EventsService } from "./events.service.js";

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller("trees/:treeId")
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Get("timeline")
  timeline(
    @Param("treeId") treeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.timeline(treeId, request.user.userId);
  }

  @Post("events")
  create(
    @Param("treeId") treeId: string,
    @Body() body: CreateEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.create(treeId, request.user.userId, body);
  }

  @Get("events/:eventId")
  detail(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.detail(treeId, eventId, request.user.userId);
  }

  @Patch("events/:eventId")
  update(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Body() body: UpdateEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.update(treeId, eventId, request.user.userId, body);
  }

  @Delete("events/:eventId")
  remove(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.remove(treeId, eventId, request.user.userId);
  }

  @Post("events/:eventId/guests")
  addGuests(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Body() body: AddEventGuestsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.addGuests(
      treeId,
      eventId,
      request.user.userId,
      body.emails,
    );
  }

  @Delete("events/:eventId/guests/:guestId")
  removeGuest(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Param("guestId") guestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.removeGuest(
      treeId,
      eventId,
      guestId,
      request.user.userId,
    );
  }

  @Post("events/:eventId/guests/accept")
  acceptGuest(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.acceptGuest(treeId, eventId, request.user.userId);
  }

  @Post("events/:eventId/guests/decline")
  declineGuest(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.declineGuest(treeId, eventId, request.user.userId);
  }

  @Post("events/:eventId/uploads/signature")
  uploadSignature(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.cloudinarySignature(
      treeId,
      eventId,
      request.user.userId,
    );
  }

  @Post("events/:eventId/media")
  addMedia(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Body() body: AddEventMediaDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.addMedia(treeId, eventId, request.user.userId, body);
  }

  @Delete("events/:eventId/media/:mediaId")
  removeMedia(
    @Param("treeId") treeId: string,
    @Param("eventId") eventId: string,
    @Param("mediaId") mediaId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.removeMedia(
      treeId,
      eventId,
      mediaId,
      request.user.userId,
    );
  }
}

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.events.notifications(request.user.userId);
  }

  @Patch("read-all")
  readAll(@Req() request: AuthenticatedRequest) {
    return this.events.readAllNotifications(request.user.userId);
  }

  @Patch(":notificationId/read")
  read(
    @Param("notificationId") notificationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.events.readNotification(notificationId, request.user.userId);
  }
}
