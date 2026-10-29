import { Module } from "@nestjs/common";
import {
  EventsController,
  NotificationsController,
} from "./events.controller.js";
import { EventsService } from "./events.service.js";

@Module({
  controllers: [EventsController, NotificationsController],
  providers: [EventsService],
})
export class EventsModule {}
