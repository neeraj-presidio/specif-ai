import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { AppSystemService } from '../app-system/app-system.service';
import {
  FILTER_STRINGS,
  REQUIREMENT_TYPE_FOLDER_MAP,
  REQUIREMENT_TYPE,
} from '../../constants/app.constants';
import { IUserStory } from '../../model/interfaces/IUserStory';

enum IdType {
  STORY = 'story',
  TASK = 'task',
}

@Injectable({
  providedIn: 'root',
})
export class StoryTaskIdGeneratorService {
  constructor(
    private readonly appSystemService: AppSystemService,
    private readonly logger: NGXLogger,
    private readonly store: Store,
  ) {}

  async getNextStoryId(
    projectName: string,
    options?: { isRegenerate?: boolean; firstStoryId?: string },
  ): Promise<number> {
    const { isRegenerate, firstStoryId } = options || {};

    if (isRegenerate && firstStoryId) {
      return this.extractId(firstStoryId, 'US');
    }
    return this.getNextId(projectName, IdType.STORY);
  }

  async getNextTaskId(
    projectName: string,
    options?: { isRegenerate?: boolean; firstTaskId?: string },
  ): Promise<number> {
    const { isRegenerate, firstTaskId } = options || {};

    if (isRegenerate && firstTaskId) {
      return this.extractId(firstTaskId, 'TASK');
    }
    return this.getNextId(projectName, IdType.TASK);
  }

  private async getNextId(
    projectName: string,
    idType: IdType,
  ): Promise<number> {
    try {
      const prdFeatureFolder = await this.getPrdFeatureFolder(projectName);
      if (!prdFeatureFolder?.children?.length) {
        return 1;
      }

      let maxId = 0;

      for (const featureFileName of prdFeatureFolder.children) {
        const { storyId, taskId } = await this.processFeatureFile(
          projectName,
          featureFileName,
          idType,
        );
        maxId =
          idType === IdType.STORY
            ? Math.max(maxId, storyId)
            : Math.max(maxId, taskId);
      }

      return maxId + 1;
    } catch (error) {
      this.logger.error(`Error getting last ${idType} ID:`, {
        projectName,
        error,
      });
      throw error;
    }
  }

  private async getPrdFeatureFolder(
    projectName: string,
  ): Promise<{ name: string; children?: string[] } | undefined> {
    const projectFolders = await this.appSystemService.getFolders(
      projectName,
      FILTER_STRINGS.FEATURE,
    );

    return projectFolders.find(
      (folder: { name: string; children?: string[] }) =>
        folder.name === REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD],
    );
  }

  private async processFeatureFile(
    projectName: string,
    featureFileName: string,
    idType: IdType,
  ): Promise<{ storyId: number; taskId: number }> {
    try {
      const featureFilePath = `${projectName}/${REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD]}/${featureFileName}`;
      const fileContent = await this.appSystemService.readFile(featureFilePath);
      const userStories: IUserStory[] = JSON.parse(fileContent).features || [];

      let maxStoryId = 0;
      let maxTaskId = 0;

      userStories.forEach((userStory) => {
        if (idType === IdType.STORY) {
          const storyId = this.extractId(userStory.id, 'US');
          maxStoryId = Math.max(maxStoryId, storyId);
        }

        if (idType === IdType.TASK) {
          (userStory.tasks || []).forEach((task) => {
            const taskId = this.extractId(task.id, 'TASK');
            maxTaskId = Math.max(maxTaskId, taskId);
          });
        }
      });

      return { storyId: maxStoryId, taskId: maxTaskId };
    } catch (error) {
      this.logger.error('Error processing feature file:', {
        featureFileName,
        error,
      });
      return { storyId: 0, taskId: 0 };
    }
  }

  private extractId(id: string, prefix: string): number {
    return parseInt(id.replace(prefix, '')) || 0;
  }

  async updateFeatureAndTaskIds(projectName: string): Promise<void> {
    try {
      const prdFeatureFolder = await this.getPrdFeatureFolder(projectName);
      if (!prdFeatureFolder?.children?.length) {
        throw new Error(`No PRD files found for project: ${projectName}`);
      }

      let currentStoryId = 1;
      let currentTaskId = 1;

      for (const fileName of prdFeatureFolder.children) {
        const filePath = `${projectName}/${REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD]}/${fileName}`;
        const fileContent = await this.appSystemService.readFile(filePath);

        let parsedContent = JSON.parse(fileContent);

        if (!parsedContent.features?.length) continue;

        parsedContent.features.forEach((story: IUserStory) => {
          story.id = `US${currentStoryId++}`;
          story.tasks?.forEach((task) => {
            task.id = `TASK${currentTaskId++}`;
          });
        });

        await this.appSystemService.writeFile(
          filePath,
          JSON.stringify(parsedContent, null, 2),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update IDs for project: ${projectName}`,
        error,
      );
      throw error;
    }
  }
}
