import { Component, inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import confetti from 'canvas-confetti';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { CreateProject } from '../../store/projects/projects.actions';
import { v4 as uuid } from 'uuid';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { NGXLogger } from 'ngx-logger';
import { DialogService } from '../../services/dialog/dialog.service';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NgIf, NgFor } from '@angular/common';
import { NgxLoadingModule } from 'ngx-loading';
import { AppSliderComponent } from '../../components/core/slider/slider.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { ErrorMessageComponent } from '../../components/core/error-message/error-message.component';
import {
  APP_CONSTANTS,
  RootRequirementType,
  SOLUTION_CREATION_TOGGLE_MESSAGES,
  REQUIREMENT_COUNT,
} from '../../constants/app.constants';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ToggleComponent } from '../../components/toggle/toggle.component';
import { SettingsComponent } from 'src/app/components/settings/settings.component';
import { provideIcons } from '@ng-icons/core';
import { heroChevronDown } from '@ng-icons/heroicons/outline';
import { CustomAccordionComponent } from '../../components/custom-accordion/custom-accordion.component';
import { McpIntegrationConfiguratorComponent } from '../../components/mcp-integration-configurator/mcp-integration-configurator.component';
import { ThinkingProcessComponent } from '../../components/thinking-process/thinking-process.component';
import { WorkflowType, WorkflowProgressEvent } from '../../model/interfaces/workflow-progress.interface';

@Component({
  selector: 'app-create-solution',
  templateUrl: './create-solution.component.html',
  styleUrls: ['./create-solution.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    NgxLoadingModule,
    ButtonComponent,
    ErrorMessageComponent,
    InputFieldComponent,
    TextareaFieldComponent,
    ToggleComponent,
    AppSliderComponent,
    CustomAccordionComponent,
    McpIntegrationConfiguratorComponent,
    ThinkingProcessComponent
  ],
  viewProviders: [provideIcons({ heroChevronDown })],
})
export class CreateSolutionComponent implements OnInit, OnDestroy {
  solutionForm!: FormGroup;
  loading: boolean = false;
  addOrUpdate: boolean = false;
  solutionCreationProgress: WorkflowProgressEvent[] = [];
  
  logger = inject(NGXLogger);
  appSystemService = inject(AppSystemService);
  electronService = inject(ElectronService);
  toast = inject(ToasterService);
  readonly dialogService = inject(DialogService);
  router = inject(Router);
  store = inject(Store);
  zone = inject(NgZone);

  private workflowProgressListener = (
    event: any,
    data: WorkflowProgressEvent,
  ) => {
    this.zone.run(() => {
      this.solutionCreationProgress = this.solutionCreationProgress.some(
        (item) => item.message === data.message,
      )
        ? this.solutionCreationProgress
        : [...this.solutionCreationProgress, data];
    });
  };

  ngOnInit() {
    this.solutionForm = this.createSolutionForm();
    this.store.dispatch(
      new AddBreadcrumbs([
        {
          label: 'Create',
          url: '/create',
        },
      ]),
    );

    const solutionId = this.solutionForm.get('id')?.value;
    if (solutionId) {
      this.electronService.listenWorkflowProgress(
        WorkflowType.Solution,
        solutionId,
        this.workflowProgressListener,
      );
    }
  }

  ngOnDestroy() {
    const solutionId = this.solutionForm.get('id')?.value;
    if (solutionId) {
      this.electronService.removeWorkflowProgressListener(
        WorkflowType.Solution,
        solutionId,
        this.workflowProgressListener,
      );
    }
  }

  showGenerationPreferencesTab(): boolean {
    return !this.solutionForm.get('cleanSolution')?.value;
  }

  private initRequirementGroup(enabled: boolean = true, minCount: number = REQUIREMENT_COUNT.DEFAULT) {
    return {
      enabled: new FormControl(enabled),
      minCount: new FormControl(minCount, {
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(REQUIREMENT_COUNT.MAX),
        ],
        updateOn: 'change'
      }),
    };
  }

  createSolutionForm() {
    const solutionFormGroup = new FormGroup({
      id: new FormControl(uuid()),
      name: new FormControl('', [
        Validators.required,
        Validators.pattern(/\S/),
      ]),
      description: new FormControl('', [
        Validators.required,
        Validators.pattern(/\S/),
      ]),
      technicalDetails: new FormControl('', [
        Validators.required,
        Validators.pattern(/\S/),
      ]),
      createReqt: new FormControl(true),
      createdAt: new FormControl(new Date().toISOString()),
      cleanSolution: new FormControl(false),
      BRD: new FormGroup(this.initRequirementGroup()),
      PRD: new FormGroup(this.initRequirementGroup()),
      UIR: new FormGroup(this.initRequirementGroup()),
      NFR: new FormGroup(this.initRequirementGroup()),
      mcpSettings: new FormControl({ mcpServers: {} }, [Validators.required]),
    });

    return solutionFormGroup;
  }

  onRequirementToggle(type: RootRequirementType, enabled: boolean) {
    const requirementGroup = this.solutionForm.get(type);
    if (!requirementGroup) return;
    
    // Always set a valid minCount value whether enabled or disabled
    const minCount = enabled ? REQUIREMENT_COUNT.DEFAULT : 0;
    requirementGroup.patchValue({
      enabled,
      minCount
    });
    
    // Ensure the control is marked as touched to trigger validation
    requirementGroup.get('minCount')?.markAsTouched();
    requirementGroup.get('enabled')?.markAsTouched();
    requirementGroup.updateValueAndValidity();
  }

  async createSolution() {
    let isRootDirectorySet = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    if (isRootDirectorySet === null || isRootDirectorySet === '') {
      this.openSelectRootDirectoryModal();
      return;
    }

    let isPathValid = await this.appSystemService.fileExists('');
    if (!isPathValid) {
      this.toast.showError('Please select a valid root directory.');
      return;
    }

    if (
      this.solutionForm.valid &&
      isRootDirectorySet !== null &&
      isRootDirectorySet !== '' &&
      isPathValid
    ) {
      this.addOrUpdate = true;
      const data = this.solutionForm.getRawValue();
      data.createReqt = !data.cleanSolution;

      this.store.dispatch(new CreateProject(data.name, data)).subscribe({
        next: () => {
          this.triggerSuccessConfetti();
          this.toast.showSuccess('All set! Your solution is ready to roll.');
        },
        error: (error) => {
          this.addOrUpdate = false;
          this.toast.showError(error.message);
        },
      });
    }
  }

  get isCreateSolutionDisabled(): boolean {
    return this.loading || this.solutionForm.invalid;
  }

  openSelectRootDirectoryModal() {
    this.dialogService
      .createBuilder()
      .forComponent(SettingsComponent)
      .disableClose()
      .open();
  }

  async selectRootDirectory(): Promise<void> {
    const response = await this.electronService.openDirectory();
    this.logger.debug(response);
    if (response.length > 0) {
      localStorage.setItem(APP_CONSTANTS.WORKING_DIR, response[0]);
      await this.createSolution();
    }
  }

  get isTechnicalDetailsInvalid(): boolean {
    const field = this.solutionForm?.get('technicalDetails');
    return !!field?.invalid && (!!field?.dirty || !!field?.touched);
  }

  get isTechnicalDetailsRequiredError(): boolean {
    return 'required' in this.solutionForm?.get('technicalDetails')?.errors!;
  }

  canDeactivate(): boolean {
    return (
      this.solutionForm.dirty && this.solutionForm.touched && !this.addOrUpdate
    );
  }

  getSolutionToggleDescription(): string {
    return this.solutionForm.get('cleanSolution')?.value
      ? SOLUTION_CREATION_TOGGLE_MESSAGES.BROWNFIELD_SOLUTION
      : SOLUTION_CREATION_TOGGLE_MESSAGES.GREENFIELD_SOLUTION;
  }

  navigateToDashboard() {
    this.router.navigate(['/apps']);
  }

  protected readonly FormControl = FormControl;

  private triggerSuccessConfetti(): void {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'],
      shapes: ['circle', 'square'],
      scalar: 1.2,
      gravity: 0.8,
      drift: 0.2,
      ticks: 300,
      startVelocity: 45,
    });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#ff5e7e', '#a25afd', '#fcff42'],
        shapes: ['star'],
        scalar: 1.2,
        gravity: 0.6,
        drift: 0.2,
        ticks: 300,
        startVelocity: 35,
      });

      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#26ccff', '#88ff5a', '#fcff42'],
        shapes: ['star'],
        scalar: 1.2,
        gravity: 0.6,
        drift: 0.2,
        ticks: 300,
        startVelocity: 35,
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 180,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'],
        shapes: ['circle', 'square', 'star'],
        scalar: 0.9,
        gravity: 0.8,
        drift: 0.1,
        ticks: 400,
        decay: 0.94,
        startVelocity: 30,
      });
    }, 500);
  }

  get isMcpSettingsInvalid(): boolean {
    const field = this.solutionForm?.get('mcpSettings');
    return !!field?.invalid && (!!field?.dirty || !!field?.touched);
  }

  get isMcpSettingsJsonInvalid(): boolean {
    return this.solutionForm?.get('mcpSettings')?.hasError('jsonInvalid') ?? false;
  }

  get isMcpSettingsSchemaInvalid(): boolean {
    return this.solutionForm?.get('mcpSettings')?.hasError('invalidMcpSettings') ?? false;
  }
}
