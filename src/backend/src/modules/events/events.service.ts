import { createHash } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  CloudinarySignature,
  FamilyEventDetail,
  NotificationListResponse,
  TimelineEntry,
  TimelineResponse,
} from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import { MailService } from "../mail/mail.service.js";
import type {
  AddEventMediaDto,
  CreateEventDto,
  UpdateEventDto,
} from "./events.dto.js";

const iso = (value: Date | null) => value?.toISOString() ?? null;

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  onModuleInit() {
    const initial = setTimeout(() => void this.processDueEvents(), 5_000);
    initial.unref();
    this.timer = setInterval(() => void this.processDueEvents(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async treeAccess(treeId: string, userId: string) {
    const tree = await this.prisma.familyTree.findFirst({
      where: { id: treeId, memberships: { some: { userId } } },
      include: {
        _count: { select: { persons: true } },
        memberships: { where: { userId }, select: { role: true } },
      },
    });
    if (!tree)
      throw new NotFoundException({
        code: "TREE_NOT_FOUND",
        message: "Không tìm thấy gia phả",
      });
    return tree;
  }

  private async assertManager(treeId: string, userId: string) {
    const tree = await this.treeAccess(treeId, userId);
    if (tree.memberships[0]?.role !== "ADMIN")
      throw new ForbiddenException({
        code: "EVENT_WRITE_FORBIDDEN",
        message: "Chỉ quản trị viên gia phả mới được quản lý sự kiện",
      });
    return tree;
  }

  private treeSummary(tree: Awaited<ReturnType<EventsService["treeAccess"]>>) {
    return {
      id: tree.id,
      name: tree.name,
      description: tree.description,
      coverUrl: tree.coverUrl,
      originPlace: tree.originPlace,
      personCount: tree._count.persons,
      updatedAt: tree.updatedAt.toISOString(),
      myRole: tree.memberships[0]?.role ?? "VIEWER",
    };
  }

  private validateDates(startAt: Date, endAt: Date | null) {
    if (
      Number.isNaN(startAt.getTime()) ||
      (endAt && Number.isNaN(endAt.getTime()))
    )
      throw new BadRequestException({
        code: "EVENT_DATE_INVALID",
        message: "Thời gian sự kiện không hợp lệ",
      });
    if (endAt && endAt < startAt)
      throw new BadRequestException({
        code: "EVENT_END_BEFORE_START",
        message: "Thời gian kết thúc phải sau thời gian bắt đầu",
      });
  }

  async timeline(treeId: string, userId: string): Promise<TimelineResponse> {
    const tree = await this.treeAccess(treeId, userId);
    const [events, people] = await Promise.all([
      this.prisma.familyEvent.findMany({
        where: { treeId },
        orderBy: { startAt: "asc" },
      }),
      this.prisma.person.findMany({
        where: { familyTrees: { some: { treeId } } },
        select: {
          id: true,
          fullName: true,
          birthDate: true,
          birthPlace: true,
          deathDate: true,
          deathPlace: true,
        },
      }),
    ]);
    const entries: TimelineEntry[] = events.map((event) => ({
      id: event.id,
      kind: "EVENT",
      category: event.category,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: iso(event.endAt),
      isAllDay: event.isAllDay,
      eventId: event.id,
      personId: null,
    }));
    for (const person of people) {
      if (person.birthDate)
        entries.push({
          id: `birth-${person.id}`,
          kind: "BIRTH",
          category: "BIRTH",
          title: person.fullName,
          description: null,
          location: person.birthPlace,
          startAt: person.birthDate.toISOString(),
          endAt: null,
          isAllDay: true,
          eventId: null,
          personId: person.id,
        });
      if (person.deathDate)
        entries.push({
          id: `death-${person.id}`,
          kind: "DEATH",
          category: "DEATH",
          title: person.fullName,
          description: null,
          location: person.deathPlace,
          startAt: person.deathDate.toISOString(),
          endAt: null,
          isAllDay: true,
          eventId: null,
          personId: person.id,
        });
    }
    entries.sort((left, right) => left.startAt.localeCompare(right.startAt));
    return {
      tree: this.treeSummary(tree),
      entries,
      canManage: tree.memberships[0]?.role === "ADMIN",
    };
  }

  async create(treeId: string, userId: string, body: CreateEventDto) {
    await this.assertManager(treeId, userId);
    const startAt = new Date(body.startAt);
    const endAt = body.endAt ? new Date(body.endAt) : null;
    this.validateDates(startAt, endAt);
    const event = await this.prisma.familyEvent.create({
      data: {
        treeId,
        createdById: userId,
        title: body.title.trim(),
        category: body.category,
        description: body.description?.trim() || null,
        location: body.location?.trim() || null,
        startAt,
        endAt,
        isAllDay: body.isAllDay ?? false,
        ...((
          endAt
            ? endAt <= new Date()
            : startAt.getTime() < Date.now() - 10 * 60_000
        )
          ? { notifiedAt: new Date() }
          : {}),
      },
    });
    return { id: event.id };
  }

  private async accessibleEvent(
    treeId: string,
    eventId: string,
    userId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { treeId_userId: { treeId, userId } },
      select: { role: true },
    });
    if (!membership)
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "Không tìm thấy sự kiện",
      });
    const event = await this.prisma.familyEvent.findFirst({
      where: { id: eventId, treeId },
      include: {
        tree: { select: { name: true } },
        createdBy: { select: { id: true, name: true } },
        guests: {
          include: { user: { select: { name: true, avatarUrl: true } } },
          orderBy: { invitedAt: "asc" },
        },
        media: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!event)
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "Không tìm thấy sự kiện",
      });
    return { event, membership };
  }

  async detail(
    treeId: string,
    eventId: string,
    userId: string,
  ): Promise<FamilyEventDetail> {
    const { event, membership } = await this.accessibleEvent(
      treeId,
      eventId,
      userId,
    );
    const canManage = membership.role === "ADMIN";
    return {
      id: event.id,
      treeId: event.treeId,
      treeName: event.tree.name,
      title: event.title,
      category: event.category,
      description: event.description,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: iso(event.endAt),
      isAllDay: event.isAllDay,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      createdBy: event.createdBy,
      guests: event.guests.map((guest) => ({
        id: guest.id,
        email: guest.email,
        userId: guest.userId,
        name: guest.user?.name ?? null,
        avatarUrl: guest.user?.avatarUrl ?? null,
        invitedAt: guest.invitedAt.toISOString(),
        status: guest.declinedAt
          ? ("DECLINED" as const)
          : guest.acceptedAt
            ? ("ACCEPTED" as const)
            : ("PENDING" as const),
        acceptedAt: iso(guest.acceptedAt),
        declinedAt: iso(guest.declinedAt),
      })),
      media: event.media.map((media) => ({
        ...media,
        createdAt: media.createdAt.toISOString(),
      })),
      canManage,
      canUploadMedia: canManage && (event.endAt ?? event.startAt) <= new Date(),
      myInvitationStatus: (() => {
        const invitation = event.guests.find((guest) => guest.userId === userId);
        if (invitation?.declinedAt) return "DECLINED" as const;
        if (invitation?.acceptedAt) return "ACCEPTED" as const;
        return invitation ? ("PENDING" as const) : null;
      })(),
    };
  }

  async update(
    treeId: string,
    eventId: string,
    userId: string,
    body: UpdateEventDto,
  ) {
    await this.assertManager(treeId, userId);
    const current = await this.prisma.familyEvent.findFirst({
      where: { id: eventId, treeId },
    });
    if (!current)
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "Không tìm thấy sự kiện",
      });
    const startAt = body.startAt ? new Date(body.startAt) : current.startAt;
    const endAt =
      body.endAt === null
        ? null
        : body.endAt
          ? new Date(body.endAt)
          : current.endAt;
    this.validateDates(startAt, endAt);
    const startChanged = startAt.getTime() !== current.startAt.getTime();
    const historical = endAt
      ? endAt <= new Date()
      : startAt.getTime() < Date.now() - 10 * 60_000;
    await this.prisma.$transaction(async (tx) => {
      if (startChanged)
        await tx.notification.deleteMany({ where: { eventId } });
      await tx.familyEvent.update({
        where: { id: eventId },
        data: {
          ...(body.title !== undefined ? { title: body.title.trim() } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.description !== undefined
            ? { description: body.description?.trim() || null }
            : {}),
          ...(body.location !== undefined
            ? { location: body.location?.trim() || null }
            : {}),
          startAt,
          endAt,
          ...(body.isAllDay !== undefined ? { isAllDay: body.isAllDay } : {}),
          ...(startChanged
            ? { notifiedAt: historical ? new Date() : null }
            : {}),
        },
      });
    });
    return this.detail(treeId, eventId, userId);
  }

  async remove(treeId: string, eventId: string, userId: string) {
    await this.assertManager(treeId, userId);
    const result = await this.prisma.familyEvent.deleteMany({
      where: { id: eventId, treeId },
    });
    if (!result.count)
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "Không tìm thấy sự kiện",
      });
    return { success: true as const };
  }

  async addGuests(
    treeId: string,
    eventId: string,
    userId: string,
    values: string[],
  ) {
    await this.assertManager(treeId, userId);
    const event = await this.prisma.familyEvent.findFirst({
      where: { id: eventId, treeId },
      select: { id: true, title: true, tree: { select: { name: true } } },
    });
    if (!event)
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "Không tìm thấy sự kiện",
      });
    const emails = [
      ...new Set(
        values.map((email) => email.trim().toLowerCase()).filter(Boolean),
      ),
    ];
    const users = await this.prisma.user.findMany({
      where: { email: { in: emails }, memberships: { some: { treeId } } },
      select: { id: true, email: true },
    });
    const existing = await this.prisma.eventGuest.findMany({
      where: { eventId, userId: { in: users.map((user) => user.id) } },
      select: { userId: true, declinedAt: true },
    });
    const existingUserIds = new Set(existing.map((guest) => guest.userId));
    const invitees = users.filter((user) => !existingUserIds.has(user.id));
    const declinedUserIds = new Set(
      existing
        .filter((guest) => guest.declinedAt)
        .map((guest) => guest.userId),
    );
    const reinvitees = users.filter((user) => declinedUserIds.has(user.id));
    const notificationRecipients = [...invitees, ...reinvitees];
    await this.prisma.$transaction(async (tx) => {
      await tx.eventGuest.createMany({
        data: invitees.map((user) => ({
          eventId,
          email: user.email.toLowerCase(),
          userId: user.id,
        })),
        skipDuplicates: true,
      });
      await Promise.all(
        reinvitees.map((user) =>
          tx.eventGuest.updateMany({
            where: { eventId, userId: user.id },
            data: { acceptedAt: null, declinedAt: null, invitedAt: new Date() },
          }),
        ),
      );
      await Promise.all(
        notificationRecipients.map((user) =>
          tx.notification.upsert({
            where: { userId_eventId: { userId: user.id, eventId } },
            create: {
              userId: user.id,
              treeId,
              eventId,
              title: `Lời mời tham gia: ${event.title}`,
              message: `${event.tree.name} mời bạn tham gia sự kiện. Mở thông báo để xác nhận.`,
            },
            update: {
              title: `Lời mời tham gia: ${event.title}`,
              message: `${event.tree.name} mời bạn tham gia sự kiện. Mở thông báo để xác nhận.`,
              readAt: null,
            },
          }),
        ),
      );
    });
    return this.detail(treeId, eventId, userId);
  }

  async acceptGuest(treeId: string, eventId: string, userId: string) {
    await this.treeAccess(treeId, userId);
    const guest = await this.prisma.eventGuest.findFirst({
      where: { eventId, userId, event: { treeId } },
      select: {
        id: true,
        email: true,
        acceptedAt: true,
        user: { select: { name: true } },
        event: {
          select: {
            title: true,
            createdById: true,
            tree: { select: { name: true } },
          },
        },
      },
    });
    if (!guest)
      throw new NotFoundException({
        code: "EVENT_INVITATION_NOT_FOUND",
        message: "Không tìm thấy lời mời tham gia sự kiện",
      });
    if (!guest.acceptedAt)
      await this.prisma.$transaction([
        this.prisma.eventGuest.update({
          where: { id: guest.id },
          data: { acceptedAt: new Date(), declinedAt: null },
        }),
        this.prisma.notification.updateMany({
          where: { userId, eventId },
          data: { readAt: new Date() },
        }),
        this.prisma.notification.upsert({
          where: {
            userId_eventId: {
              userId: guest.event.createdById,
              eventId,
            },
          },
          create: {
            userId: guest.event.createdById,
            treeId,
            eventId,
            title: `${guest.user?.name ?? guest.email} đã chấp nhận lời mời`,
            message: `Sự kiện ${guest.event.title} · ${guest.event.tree.name}`,
          },
          update: {
            title: `${guest.user?.name ?? guest.email} đã chấp nhận lời mời`,
            message: `Sự kiện ${guest.event.title} · ${guest.event.tree.name}`,
            readAt: null,
            createdAt: new Date(),
          },
        }),
      ]);
    return this.detail(treeId, eventId, userId);
  }

  async declineGuest(treeId: string, eventId: string, userId: string) {
    await this.treeAccess(treeId, userId);
    const guest = await this.prisma.eventGuest.findFirst({
      where: { eventId, userId, event: { treeId } },
      select: {
        id: true,
        email: true,
        declinedAt: true,
        user: { select: { name: true } },
        event: {
          select: {
            title: true,
            createdById: true,
            tree: { select: { name: true } },
          },
        },
      },
    });
    if (!guest)
      throw new NotFoundException({
        code: "EVENT_INVITATION_NOT_FOUND",
        message: "Không tìm thấy lời mời tham gia sự kiện",
      });
    if (!guest.declinedAt)
      await this.prisma.$transaction([
        this.prisma.eventGuest.update({
          where: { id: guest.id },
          data: { acceptedAt: null, declinedAt: new Date() },
        }),
        this.prisma.notification.updateMany({
          where: { userId, eventId },
          data: { readAt: new Date() },
        }),
        this.prisma.notification.upsert({
          where: {
            userId_eventId: {
              userId: guest.event.createdById,
              eventId,
            },
          },
          create: {
            userId: guest.event.createdById,
            treeId,
            eventId,
            title: `${guest.user?.name ?? guest.email} đã từ chối lời mời`,
            message: `Sự kiện ${guest.event.title} · ${guest.event.tree.name}`,
          },
          update: {
            title: `${guest.user?.name ?? guest.email} đã từ chối lời mời`,
            message: `Sự kiện ${guest.event.title} · ${guest.event.tree.name}`,
            readAt: null,
            createdAt: new Date(),
          },
        }),
      ]);
    return this.detail(treeId, eventId, userId);
  }

  async removeGuest(
    treeId: string,
    eventId: string,
    guestId: string,
    userId: string,
  ) {
    await this.assertManager(treeId, userId);
    const guest = await this.prisma.eventGuest.findFirst({
      where: { id: guestId, eventId, event: { treeId } },
      select: {
        id: true,
        userId: true,
        acceptedAt: true,
        declinedAt: true,
        event: {
          select: {
            title: true,
            tree: { select: { name: true } },
          },
        },
      },
    });
    if (!guest)
      throw new NotFoundException({
        code: "EVENT_GUEST_NOT_FOUND",
        message: "Không tìm thấy người được mời",
      });

    const invitationPending = !guest.acceptedAt && !guest.declinedAt;
    await this.prisma.$transaction(async (tx) => {
      await tx.eventGuest.delete({ where: { id: guest.id } });
      if (guest.userId) {
        const title = invitationPending
          ? `Lời mời đã được thu hồi: ${guest.event.title}`
          : `Bạn đã bị xóa khỏi sự kiện: ${guest.event.title}`;
        const message = invitationPending
          ? `${guest.event.tree.name} đã thu hồi lời mời tham gia sự kiện.`
          : `${guest.event.tree.name} đã xóa bạn khỏi danh sách người tham gia.`;
        await tx.notification.upsert({
          where: { userId_eventId: { userId: guest.userId, eventId } },
          create: {
            userId: guest.userId,
            treeId,
            eventId,
            title,
            message,
          },
          update: {
            title,
            message,
            readAt: null,
            createdAt: new Date(),
          },
        });
      }
    });
    return { success: true as const };
  }

  private async assertUploadable(
    treeId: string,
    eventId: string,
    userId: string,
  ) {
    await this.assertManager(treeId, userId);
    const event = await this.prisma.familyEvent.findFirst({
      where: { id: eventId, treeId },
    });
    if (!event)
      throw new NotFoundException({
        code: "EVENT_NOT_FOUND",
        message: "Không tìm thấy sự kiện",
      });
    if ((event.endAt ?? event.startAt) > new Date())
      throw new BadRequestException({
        code: "EVENT_NOT_FINISHED",
        message: "Chỉ có thể tải tư liệu lên sau khi sự kiện kết thúc",
      });
    return event;
  }

  async cloudinarySignature(
    treeId: string,
    eventId: string,
    userId: string,
  ): Promise<CloudinarySignature> {
    await this.assertUploadable(treeId, eventId, userId);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret)
      throw new ServiceUnavailableException({
        code: "CLOUDINARY_NOT_CONFIGURED",
        message: "Cloudinary chưa được cấu hình",
      });
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `family-tree/${treeId}/events/${eventId}`;
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest("hex");
    return { cloudName, apiKey, timestamp, signature, folder };
  }

  async addMedia(
    treeId: string,
    eventId: string,
    userId: string,
    body: AddEventMediaDto,
  ) {
    await this.assertUploadable(treeId, eventId, userId);
    return this.prisma.eventMedia.create({ data: { ...body, eventId } });
  }

  async removeMedia(
    treeId: string,
    eventId: string,
    mediaId: string,
    userId: string,
  ) {
    await this.assertManager(treeId, userId);
    const result = await this.prisma.eventMedia.deleteMany({
      where: { id: mediaId, eventId, event: { treeId } },
    });
    if (!result.count)
      throw new NotFoundException({
        code: "EVENT_MEDIA_NOT_FOUND",
        message: "Không tìm thấy tư liệu",
      });
    return { success: true as const };
  }

  async processDueEvents() {
    try {
      const due = await this.prisma.familyEvent.findMany({
        where: { notifiedAt: null, startAt: { lte: new Date() } },
        include: {
          tree: {
            select: { name: true, memberships: { select: { userId: true } } },
          },
          guests: { select: { email: true } },
        },
        orderBy: { startAt: "asc" },
        take: 25,
      });
      for (const event of due) {
        const claimed = await this.prisma.$transaction(async (tx) => {
          const result = await tx.familyEvent.updateMany({
            where: { id: event.id, notifiedAt: null },
            data: { notifiedAt: new Date() },
          });
          if (result.count)
            await tx.notification.createMany({
              data: event.tree.memberships.map(({ userId }) => ({
                userId,
                treeId: event.treeId,
                eventId: event.id,
                title: `Sự kiện đang diễn ra: ${event.title}`,
                message: `${event.tree.name}${event.location ? ` · ${event.location}` : ""}`,
              })),
              skipDuplicates: true,
            });
          return result;
        });
        if (!claimed.count) continue;
        const url = `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/trees/${event.treeId}/events/${event.id}`;
        const results = await Promise.allSettled(
          event.guests.map((guest) =>
            this.mail.sendEventReminder({
              email: guest.email,
              eventTitle: event.title,
              treeName: event.tree.name,
              startAt: event.startAt,
              location: event.location,
              url,
            }),
          ),
        );
        const failed = results.filter(
          (result) => result.status === "rejected",
        ).length;
        if (failed)
          this.logger.warn(
            `Could not send ${failed} reminder email(s) for event ${event.id}`,
          );
      }
    } catch (error) {
      this.logger.error(
        "Could not process due family events",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async notifications(userId: string): Promise<NotificationListResponse> {
    await this.processDueEvents();
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      include: { tree: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return {
      notifications: notifications.map((item) => ({
        id: item.id,
        treeId: item.treeId,
        treeName: item.tree.name,
        eventId: item.eventId,
        title: item.title,
        message: item.message,
        readAt: iso(item.readAt),
        createdAt: item.createdAt.toISOString(),
      })),
      unreadCount: notifications.filter((item) => !item.readAt).length,
    };
  }

  async readNotification(notificationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException({
        code: "NOTIFICATION_NOT_FOUND",
        message: "Không tìm thấy thông báo",
      });
    return { success: true as const };
  }

  async readAllNotifications(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true as const };
  }
}
