import { Module } from '@nestjs/common';

import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { CreateCompanyService } from 'src/engine-workspace/auto-companies-and-contacts-creation/create-company/create-company.service';
import { CompanyModule } from 'src/business/modules/message/repositories/company/company.module';

@Module({
  imports: [WorkspaceDataSourceModule, CompanyModule],
  providers: [CreateCompanyService],
  exports: [CreateCompanyService],
})
export class CreateCompanyModule {}
