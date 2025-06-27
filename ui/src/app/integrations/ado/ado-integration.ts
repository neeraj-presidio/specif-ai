import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';
import { PmoIntegrationBase } from '../core/pmo-integration.base';
import { AdoCredentials } from './ado.interfaces';
import { UpdateMetadata } from '../../store/projects/projects.actions';
import { IProjectMetadata } from 'src/app/model/interfaces/projects.interface';

@Injectable({
  providedIn: 'root',
})
export class AdoIntegration extends PmoIntegrationBase<AdoCredentials> {
  constructor(private store: Store) {
    super();
  }

  async savePmoIntegrationInMetadata(
    existingMetadata: IProjectMetadata,
    credentials: AdoCredentials,
  ): Promise<void> {
    const updatedMetadata = {
      ...existingMetadata,
      integration: {
        ...existingMetadata.integration,
        ado: {
          organization: credentials.organization,
          projectKey: credentials.projectKey,
          token: credentials.token,
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
