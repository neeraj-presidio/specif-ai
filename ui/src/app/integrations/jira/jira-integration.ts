import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';
import { PmoIntegrationBase } from '../core/pmo-integration.base';
import { UpdateMetadata } from '../../store/projects/projects.actions';
import { IProjectMetadata } from 'src/app/model/interfaces/projects.interface';

export interface JiraCredentials {
  jiraProjectKey: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class JiraIntegration extends PmoIntegrationBase<JiraCredentials> {
  constructor(private store: Store) {
    super();
  }

  async savePmoIntegrationInMetadata(
    existingMetadata: IProjectMetadata,
    credentials: JiraCredentials,
  ): Promise<void> {
    const updatedMetadata = {
      ...existingMetadata,
      integration: {
        ...existingMetadata.integration,
        jira: {
          jiraProjectKey: credentials.jiraProjectKey,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          redirectUrl: credentials.redirectUrl,
        },
      },
    };

    await firstValueFrom(
      this.store.dispatch(
        new UpdateMetadata(existingMetadata.id, updatedMetadata),
      ),
    );
  }
}
