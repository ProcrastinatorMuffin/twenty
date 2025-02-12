import { Module } from '@nestjs/common';

import { ObjectMetadataModule } from 'src/engine-metadata/object-metadata/object-metadata.module';
import { FieldsStringFactory } from 'src/engine/graphql/workspace-query-builder/factories/fields-string.factory';
import { RecordPositionQueryFactory } from 'src/engine/graphql/workspace-query-builder/factories/record-position-query.factory';

import { WorkspaceQueryBuilderFactory } from './workspace-query-builder.factory';

import { workspaceQueryBuilderFactories } from './factories/factories';

@Module({
  imports: [ObjectMetadataModule],
  providers: [...workspaceQueryBuilderFactories, WorkspaceQueryBuilderFactory],
  exports: [
    WorkspaceQueryBuilderFactory,
    FieldsStringFactory,
    RecordPositionQueryFactory,
  ],
})
export class WorkspaceQueryBuilderModule {}
