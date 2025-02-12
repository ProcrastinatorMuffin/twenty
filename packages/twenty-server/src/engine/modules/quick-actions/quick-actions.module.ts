import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { IntelligenceService } from 'src/engine/modules/quick-actions/intelligence.service';
import { QuickActionsService } from 'src/engine/modules/quick-actions/quick-actions.service';
import { WorkspaceQueryRunnerModule } from 'src/engine/graphql/workspace-query-runner/workspace-query-runner.module';

@Module({
  imports: [WorkspaceQueryRunnerModule, HttpModule],
  controllers: [],
  providers: [QuickActionsService, IntelligenceService],
  exports: [QuickActionsService, IntelligenceService],
})
export class QuickActionsModule {}
