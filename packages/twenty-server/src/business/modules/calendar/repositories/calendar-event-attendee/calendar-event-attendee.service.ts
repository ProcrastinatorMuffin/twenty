import { Injectable } from '@nestjs/common';

import { EntityManager } from 'typeorm';

import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { ObjectRecord } from 'src/engine/workspace-manager/workspace-sync-metadata/types/object-record';
import { CalendarEventAttendeeObjectMetadata } from 'src/business/modules/calendar/calendar-event-attendee.object-metadata';
import { getFlattenedValuesAndValuesStringForBatchRawQuery } from 'src/business/modules/calendar-and-messaging/utils/getFlattenedValuesAndValuesStringForBatchRawQuery.util';
import { CalendarEventAttendee } from 'src/business/modules/calendar/types/calendar-event';

@Injectable()
export class CalendarEventAttendeeService {
  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
  ) {}

  public async getByIds(
    calendarEventAttendeeIds: string[],
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<ObjectRecord<CalendarEventAttendeeObjectMetadata>[]> {
    if (calendarEventAttendeeIds.length === 0) {
      return [];
    }

    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    return await this.workspaceDataSourceService.executeRawQuery(
      `SELECT * FROM ${dataSourceSchema}."calendarEventAttendees" WHERE "id" = ANY($1)`,
      [calendarEventAttendeeIds],
      workspaceId,
      transactionManager,
    );
  }

  public async getByCalendarEventIds(
    calendarEventIds: string[],
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<ObjectRecord<CalendarEventAttendeeObjectMetadata>[]> {
    if (calendarEventIds.length === 0) {
      return [];
    }

    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    return await this.workspaceDataSourceService.executeRawQuery(
      `SELECT * FROM ${dataSourceSchema}."calendarEventAttendees" WHERE "calendarEventId" = ANY($1)`,
      [calendarEventIds],
      workspaceId,
      transactionManager,
    );
  }

  public async deleteByIds(
    calendarEventAttendeeIds: string[],
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<void> {
    if (calendarEventAttendeeIds.length === 0) {
      return;
    }

    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    await this.workspaceDataSourceService.executeRawQuery(
      `DELETE FROM ${dataSourceSchema}."calendarEventAttendees" WHERE "id" = ANY($1)`,
      [calendarEventAttendeeIds],
      workspaceId,
      transactionManager,
    );
  }

  public async saveCalendarEventAttendees(
    calendarEventAttendees: CalendarEventAttendee[],
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<void> {
    if (calendarEventAttendees.length === 0) {
      return;
    }

    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    const { flattenedValues, valuesString } =
      getFlattenedValuesAndValuesStringForBatchRawQuery(
        calendarEventAttendees,
        {
          calendarEventId: 'uuid',
          handle: 'text',
          displayName: 'text',
          isOrganizer: 'boolean',
          responseStatus: `${dataSourceSchema}."calendarEventAttendee_responsestatus_enum"`,
        },
      );

    await this.workspaceDataSourceService.executeRawQuery(
      `INSERT INTO ${dataSourceSchema}."calendarEventAttendee" ("calendarEventId", "handle", "displayName", "isOrganizer", "responseStatus") VALUES ${valuesString}`,
      flattenedValues,
      workspaceId,
      transactionManager,
    );
  }

  public async updateCalendarEventAttendees(
    calendarEventAttendees: CalendarEventAttendee[],
    iCalUIDCalendarEventIdMap: Map<string, string>,
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<void> {
    if (calendarEventAttendees.length === 0) {
      return;
    }

    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    const values = calendarEventAttendees.map((calendarEventAttendee) => ({
      ...calendarEventAttendee,
      calendarEventId: iCalUIDCalendarEventIdMap.get(
        calendarEventAttendee.iCalUID,
      ),
    }));

    const { flattenedValues, valuesString } =
      getFlattenedValuesAndValuesStringForBatchRawQuery(values, {
        calendarEventId: 'uuid',
        handle: 'text',
        displayName: 'text',
        isOrganizer: 'boolean',
        responseStatus: `${dataSourceSchema}."calendarEventAttendee_responsestatus_enum"`,
      });

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."calendarEventAttendee" AS "calendarEventAttendee"
      SET "displayName" = "newValues"."displayName",
      "isOrganizer" = "newValues"."isOrganizer",
      "responseStatus" = "newValues"."responseStatus"
      FROM (VALUES ${valuesString}) AS "newValues"("calendarEventId", "handle", "displayName", "isOrganizer", "responseStatus")
      WHERE "calendarEventAttendee"."handle" = "newValues"."handle"
      AND "calendarEventAttendee"."calendarEventId" = "newValues"."calendarEventId"`,
      flattenedValues,
      workspaceId,
      transactionManager,
    );
  }
}
