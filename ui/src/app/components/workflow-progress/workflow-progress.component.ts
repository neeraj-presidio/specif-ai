import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroCheckCircle,
  heroWrenchScrewdriver,
  heroStopCircle,
  heroChevronDoubleUp,
  heroChevronDoubleDown,
} from '@ng-icons/heroicons/outline';
import {
  WorkflowProgressEvent,
  WorkflowType,
  WorkflowStatus,
} from '../../model/interfaces/workflow-progress.interface';
import { CustomAccordionComponent } from '../custom-accordion/custom-accordion.component';
import { ButtonComponent } from '../core/button/button.component';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-workflow-progress',
  templateUrl: './workflow-progress.component.html',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    AsyncPipe,
    NgIconComponent,
    CustomAccordionComponent,
    ButtonComponent,
  ],
  providers: [
    provideIcons({
      heroSparkles,
      heroCheckCircle,
      heroWrenchScrewdriver,
      heroStopCircle,
      heroChevronDoubleUp,
      heroChevronDoubleDown,
    }),
  ],
})
export class WorkflowProgressComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() workflowType!: WorkflowType;
  @Input() isVisible: boolean = false;
  @Input() isCompleted: boolean = false;
  @Input() initialTitle: string = 'Creating Solution...';
  @Input() subtitle: string = 'Relax while SpecifAI takes care of the rest...';
  @Input() completedTitle: string = 'Process Completed Successfully!';
  @Input() maxHeight: string = 'none';
  @Input() showCancelButton: boolean = true;
  @Input() showHeader: boolean = true;

  progress$!: Observable<WorkflowProgressEvent[]>;
  workflowStatus$!: Observable<WorkflowStatus>;
  isAborting = false;
  isExpandedAll = false;

  private destroy$ = new Subject<void>();

  constructor(
    private workflowProgressService: WorkflowProgressService,
    private dialogService: DialogService,
    private toasterService: ToasterService,
  ) {}

  ngOnInit(): void {
    if (this.projectId && this.workflowType) {
      this.progress$ = this.workflowProgressService.getProgressEvents$(
        this.projectId,
        this.workflowType,
      );

      this.workflowStatus$ =
        this.workflowProgressService.getCreationStatusObservable(
          this.projectId,
          this.workflowType,
        );

      this.workflowStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe((status) => {
          if (!status.isCreating) {
            this.isAborting = false;
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancelClick(): void {
    if (this.isAborting) {
      return;
    }

    this.dialogService
      .confirm({
        title: 'Cancel Process',
        description: `Are you sure you want to cancel the ${this.workflowType} creation process? This action cannot be undone.`,
        confirmButtonText: 'Yes, Cancel',
        cancelButtonText: 'No, Continue',
      })
      .subscribe((result: boolean) => {
        if (result) {
          this.cancelWorkflow();
        }
      });
  }

  private async cancelWorkflow(): Promise<void> {
    this.isAborting = true;

    try {
      const success = await this.workflowProgressService.abortWorkflow(
        this.projectId,
        this.workflowType,
      );

      if (!success) {
        this.toasterService.showWarning(
          `Unable to cancel ${this.workflowType} creation. The process may have already completed.`,
        );
      }
    } catch (error) {
      console.error(`Error cancelling ${this.workflowType} creation:`, error);
      this.toasterService.showError(
        `An error occurred while cancelling ${this.workflowType} creation. Please try again.`,
      );
    } finally {
      this.isAborting = false;
    }
  }

  hasInputOutput(event: WorkflowProgressEvent): boolean {
    return (
      (event.type === 'mcp' || event.type === 'action') &&
      (!!event.message?.input || !!event.message?.output)
    );
  }

  getAccordionId(event: WorkflowProgressEvent, index: number): string {
    return `progress-${event.type}-${index}-${event.timestamp}`;
  }

  formatData(data: any): string {
    if (data === null || data === undefined) {
      return '';
    }

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }

    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  shouldShowSpinner(
    event: WorkflowProgressEvent,
    progress: WorkflowProgressEvent[],
  ): boolean {
    if (event.type === 'action' || this.isCompleted) {
      return false;
    }

    if (event.correlationId) {
      const hasCorrespondingAction = progress.some(
        (e) => e.correlationId === event.correlationId && e.type === 'action',
      );
      return !hasCorrespondingAction;
    }

    const currentIndex = progress.indexOf(event);

    let lastActionIndex = -1;
    for (let i = progress.length - 1; i >= 0; i--) {
      if (progress[i].type === 'action') {
        lastActionIndex = i;
        break;
      }
    }

    return currentIndex > lastActionIndex;
  }

  toggleExpandAll(): void {
    this.isExpandedAll = !this.isExpandedAll;
  }

  shouldAccordionBeOpen(): boolean {
    return this.isExpandedAll;
  }

  hasAnyAccordionEvents(progress: WorkflowProgressEvent[]): boolean {
    return progress.some((event) => this.hasInputOutput(event));
  }
}
