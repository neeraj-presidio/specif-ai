import { Component, Input, OnInit } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { JiraIntegrationComponent } from './jira-integration/jira-integration.component';
import { AdoIntegrationComponent } from './ado-integration/ado-integration.component';

export type PmoIntegrationType = 'jira' | 'ado';

@Component({
  selector: 'app-pmo-integration',
  templateUrl: './pmo-integration.component.html',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    ReactiveFormsModule,
    JiraIntegrationComponent,
    AdoIntegrationComponent,
  ],
})
export class PmoIntegrationComponent implements OnInit {
  @Input() projectId!: string;
  @Input() appInfo: any = {};
  
  selectedIntegrationType = new FormControl<PmoIntegrationType>('jira');
  
  // Accordion states
  jiraAccordionOpen: boolean = false;
  adoAccordionOpen: boolean = false;

  ngOnInit(): void {
    this.initializeAccordionStates();
    this.setupIntegrationTypeListener();
  }

  private setupIntegrationTypeListener(): void {
    this.selectedIntegrationType.valueChanges.subscribe((type) => {
      // Close all accordions when switching types
      this.jiraAccordionOpen = false;
      this.adoAccordionOpen = false;
      
      // Open the accordion for the selected type
      if (type === 'jira') {
        this.jiraAccordionOpen = true;
      } else if (type === 'ado') {
        this.adoAccordionOpen = true;
      }
    });
  }

  private initializeAccordionStates(): void {
    // Set initial accordion state based on current selection
    const currentType = this.selectedIntegrationType.value;
    if (currentType === 'jira') {
      this.jiraAccordionOpen = true;
    } else if (currentType === 'ado') {
      this.adoAccordionOpen = true;
    }
  }

  // Accordion toggle handlers
  onJiraToggleAccordion(): void {
    this.jiraAccordionOpen = !this.jiraAccordionOpen;
  }

  onAdoToggleAccordion(): void {
    this.adoAccordionOpen = !this.adoAccordionOpen;
  }
}
