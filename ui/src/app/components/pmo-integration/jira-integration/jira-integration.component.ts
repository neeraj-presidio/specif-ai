import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Store } from '@ngxs/store';
import { AccordionComponent } from '../../accordion/accordion.component';
import { InputFieldComponent } from '../../core/input-field/input-field.component';
import { ButtonComponent } from '../../core/button/button.component';
import { APP_MESSAGES } from '../../../constants/app.constants';
import { APP_INTEGRATIONS } from '../../../constants/toast.constant';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { ElectronService } from '../../../electron-bridge/electron.service';
import { NGXLogger } from 'ngx-logger';
import { 
  getJiraTokenInfo, 
  storeJiraToken, 
  resetJiraToken 
} from '../../../integrations/jira/jira.utils';
import { JiraIntegration, JiraCredentials } from '../../../integrations/jira/jira-integration';

export interface JiraFormData {
  jiraProjectKey: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

@Component({
  selector: 'app-jira-integration',
  templateUrl: './jira-integration.component.html',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    AccordionComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
})
export class JiraIntegrationComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() projectId!: string;
  @Input() appInfo: any = {};
  
  @Output() toggleAccordion = new EventEmitter<void>();

  protected readonly APP_MESSAGES = APP_MESSAGES;
  
  jiraForm!: FormGroup;
  editButtonDisabled: boolean = false;
  isConnected: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private toast: ToasterService,
    private electronService: ElectronService,
    private logger: NGXLogger,
    private jiraIntegration: JiraIntegration,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
    this.initializeConnectionState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const jiraIntegration = this.appInfo.integration?.jira;
    
    this.jiraForm = new FormGroup({
      jiraProjectKey: new FormControl(
        jiraIntegration?.jiraProjectKey || '',
        Validators.required
      ),
      clientId: new FormControl(
        jiraIntegration?.clientId || '',
        Validators.required
      ),
      clientSecret: new FormControl(
        jiraIntegration?.clientSecret || '',
        Validators.required
      ),
      redirectUrl: new FormControl(
        jiraIntegration?.redirectUrl || '',
        Validators.required
      ),
    });

    if (this.isConnected) {
      this.jiraForm.disable();
    }
  }

  private setupFormValidation(): void {
    this.editButtonDisabled = !this.jiraForm.valid;
    this.jiraForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.editButtonDisabled = !this.jiraForm.valid;
      });
  }

  onToggleAccordion(): void {
    this.toggleAccordion.emit();
  }

  private initializeConnectionState(): void {
    this.isConnected = (() => {
      const tokenInfo = getJiraTokenInfo(this.projectId);
      return (
        tokenInfo.projectKey === this.appInfo.integration?.jira?.jiraProjectKey &&
        !!tokenInfo.token &&
        this.isTokenValid()
      );
    })();
  }

  private isTokenValid(): boolean {
    const { token, tokenExpiration } = getJiraTokenInfo(this.projectId);
    return (
      !!token && 
      !!tokenExpiration && 
      new Date() < new Date(tokenExpiration)
    );
  }

  async onConnect(): Promise<void> {
    if (this.jiraForm.valid) {
      try {
        const formData: JiraFormData = this.jiraForm.getRawValue();
        
        const oauthParams = {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          redirectUri: formData.redirectUrl,
        };

        const authResponse = await this.electronService.startJiraOAuth(oauthParams);
        storeJiraToken(authResponse, formData.jiraProjectKey, this.projectId);
        this.logger.debug('Jira token received and stored.', authResponse.accessToken);
        await this.saveJiraData(formData);
        this.toast.showSuccess(APP_INTEGRATIONS.JIRA.SUCCESS);
      } catch (error) {
        this.logger.error('Error during Jira OAuth process:', error);
        this.toast.showError(APP_INTEGRATIONS.JIRA.ERROR);
      }
    }
  }

  onDisconnect(): void {
    resetJiraToken(this.projectId);
    this.jiraForm.enable();
    this.isConnected = false;
    this.editButtonDisabled = false;
    this.toast.showSuccess(APP_INTEGRATIONS.JIRA.DISCONNECT);
  }

  private async saveJiraData(formData: JiraFormData): Promise<void> {
    try {
      const credentials: JiraCredentials = {
        jiraProjectKey: formData.jiraProjectKey,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        redirectUrl: formData.redirectUrl,
      };

      await this.jiraIntegration.savePmoIntegrationInMetadata(this.appInfo, credentials);
      
      this.logger.debug('Jira metadata updated successfully');
      this.jiraForm.disable();
      this.isConnected = true;
      this.editButtonDisabled = true;
    } catch (error) {
      this.logger.error('Error saving Jira data:', error);
      this.toast.showError('Failed to save Jira integration data');
    }
  }
}
