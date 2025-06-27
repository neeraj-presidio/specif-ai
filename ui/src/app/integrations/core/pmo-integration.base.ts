import { IProjectMetadata } from 'src/app/model/interfaces/projects.interface';

export abstract class PmoIntegrationBase<TCredentials> {
  /**
   * Save PMO details/credentials for a project in the project metadata.
   */
  abstract savePmoIntegrationInMetadata(
    existingMetadata: IProjectMetadata,
    credentials: TCredentials,
  ): Promise<void>;
}
