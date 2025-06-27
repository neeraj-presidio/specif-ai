import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AccordionComponent } from '../../accordion/accordion.component';
import { InputFieldComponent } from '../../core/input-field/input-field.component';
import { ButtonComponent } from '../../core/button/button.component';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { NGXLogger } from 'ngx-logger';
import { APP_MESSAGES } from '../../../constants/app.constants';
import { AdoIntegration } from '../../../integrations/ado/ado-integration';
import { AdoCredentials } from '../../../integrations/ado/ado.interfaces';

export interface AdoFormData {
  organization: string;
  projectName: string;
  personalAccessToken: string;
}

@Component({
  selector: 'app-ado-integration',
  templateUrl: './ado-integration.component.html',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    AccordionComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
})
export class AdoIntegrationComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() projectId!: string;
  @Input() appInfo: any = {};
  
  @Output() toggleAccordion = new EventEmitter<void>();

  adoForm!: FormGroup;
  editButtonDisabled: boolean = false;
  isConnected: boolean = false;
  private destroy$ = new Subject<void>();

  protected readonly APP_MESSAGES = APP_MESSAGES;

  constructor(
    private toast: ToasterService,
    private logger: NGXLogger,
    private adoIntegration: AdoIntegration,
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
    const adoIntegration = this.appInfo.integration?.ado;
    
    this.adoForm = new FormGroup({
      organization: new FormControl(
        adoIntegration?.organization || '',
        Validators.required
      ),
      projectName: new FormControl(
        adoIntegration?.projectKey || '',
        Validators.required
      ),
      personalAccessToken: new FormControl(
        adoIntegration?.token || '',
        Validators.required
      ),
    });

    if (this.isConnected) {
      this.adoForm.disable();
    }
  }

  private setupFormValidation(): void {
    this.editButtonDisabled = !this.adoForm.valid;
    this.adoForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.editButtonDisabled = !this.adoForm.valid;
      });
  }

  onToggleAccordion(): void {
    this.toggleAccordion.emit();
  }

  private initializeConnectionState(): void {
    this.isConnected = !!this.appInfo.integration?.ado?.organization;
  }

  async onConnect(): Promise<void> {
    if (this.adoForm.valid) {
      const formData: AdoFormData = this.adoForm.getRawValue();
      await this.saveAdoData(formData);
    }
  }

  async onDisconnect(): Promise<void> {
    try {
      const resetCredentials: AdoCredentials = {
        type: 'ado',
        organization: '',
        projectKey: '',
        token: '',
      };

      await this.adoIntegration.savePmoIntegrationInMetadata(this.appInfo, resetCredentials);
      
      this.logger.debug('ADO integration disconnected');
      this.adoForm.enable();
      this.isConnected = false;
      this.editButtonDisabled = false;
      this.toast.showSuccess('Azure DevOps disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting ADO:', error);
      this.toast.showError('Failed to disconnect Azure DevOps');
    }
  }

  private async saveAdoData(formData: AdoFormData): Promise<void> {
    try {
      const credentials: AdoCredentials = {
        type: 'ado',
        organization: formData.organization,
        projectKey: formData.projectName,
        token: formData.personalAccessToken,
      };

      await this.adoIntegration.savePmoIntegrationInMetadata(this.appInfo, credentials);
      
      this.logger.debug('ADO metadata updated successfully');
      this.adoForm.disable();
      this.isConnected = true;
      this.editButtonDisabled = true;
      this.toast.showSuccess('Azure DevOps connected successfully');
    } catch (error) {
      this.logger.error('Error saving ADO data:', error);
      this.toast.showError('Failed to save Azure DevOps integration data');
    }
  }
}
