import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ExportRequirementDataOptions } from 'src/app/model/interfaces/exports.interface';
import { ToasterService } from '../toaster/toaster.service';
import { RequirementExportStrategyManager } from './requirement-export-strategy.manager';
import {
  REQUIREMENT_DISPLAY_NAME_MAP,
  RequirementType,
} from 'src/app/constants/app.constants';

@Injectable({
  providedIn: 'root',
})
export class RequirementExportService {
  constructor(
    private strategyManager: RequirementExportStrategyManager,
    private logger: NGXLogger,
    private toast: ToasterService,
  ) {}

  public async exportRequirementData(
    files: any[],
    options: ExportRequirementDataOptions & { projectName: string },
    requirementType: string,
  ): Promise<void> {
    try {
      const strategy = this.strategyManager.getStrategy(requirementType);

      const result = await strategy.export(files, {
        format: options.type,
        projectName: options.projectName,
      });

      if (!result.success) {
        if (result.error) throw result.error;
        throw new Error(
          `Failed to export ${REQUIREMENT_DISPLAY_NAME_MAP[requirementType as RequirementType]} requirements.`,
        );
      }
    } catch (error) {
      this.logger.error('Export failed:', error);
      this.toast.showError(
        `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
