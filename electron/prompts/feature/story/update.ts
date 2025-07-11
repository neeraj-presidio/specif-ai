import { CRITICAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS } from '../../context/editor-instructions';
import { MARKDOWN_RULES } from '../../context/markdown-rules';
import { SPECIAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS } from '../../context/editor-instructions';

export interface UpdateStoryPromptParams {
  name: string;
  description: string;
  reqDesc: string;
  featureId: string;
  existingFeatureDescription: string;
  newFeatureDescription: string;
  fileContent: string;
}

export function updateStoryPrompt(params: UpdateStoryPromptParams): string {
  return `You are a senior architect tasked with updating an existing feature for the provided app based on the new user story description provided by the client. Below is the description of the app and inputs from the client:

App Name:
${params.name}

App Description:
${params.description}

Requirement Type: Product Requirement

Product Requirement Description:
${params.reqDesc}

User Story ID:
${params.featureId}

Existing User Story Description:
${params.existingFeatureDescription}

Client Request - New User Story Description:
${params.newFeatureDescription}

File Content:
${params.fileContent}

Your task is to update the existing feature by incorporating the client's requests and the information from the provided file content. 
Ensure that the revised feature is clear, concise, comprehensive, and actionable, while addressing the following:

1. Always refine, rephrase, or expand the "Client Request - New User Story Description" to make it more actionable and user-centric, even if the input is already detailed.
2. Derive actionable and measurable acceptance criteria from the "Client Request - New User Story Description."
3. Categorize the feature where applicable (e.g., frontend, backend, API integration, UX screens, Infra changes).
4. Ensure the feature description focuses on the end-user's needs and goals.
5. Generate an apt feature name based on the updated acceptance criteria.

The updated feature must strictly adhere to the client's request and the provided file content, with no additional or irrelevant information included. However, you must always enhance the content to ensure it is actionable, user-centric, and aligned with best practices.

${CRITICAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS}

STRICT:
(!) Output Structure must be a valid JSON. Follow this exact structure without any modifications:

# RESPONSE FORMAT EXAMPLE
{
    "features": [
        {
            "id": "<featureId>"
            "<feature name>": "[description of feature]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the feature as sentences]"
        }
    ]
}

Use the following format to generate the user story:
- Ability to <user action> the <feature>
- In order to <mention the user need>
- As a <persona or user>
- I want the <end goal or objective of the feature>

Special Instructions:
1. The "id" in the response must match the User Story ID provided (${params.featureId}).
2. Return strictly ONE OBJECT in the "features" array.
3. Ensure the feature description is clear, concise, comprehensive, and follows the specified format.
5. Provide examples of enriched user stories to guide the output. For instance:
   - Ability to manage user profiles efficiently.
   - In order to streamline user account management.
   - As an admin user.
   - I want to have a centralized dashboard for managing user accounts.
6. You are allowed to use Markdown for the description of the feature. You MUST ONLY use valid Markdown according to the following rules:
    ${MARKDOWN_RULES}
7. ${SPECIAL_EDITOR_TABLES_AND_LINKS_INSTRUCTIONS}

STRICT:
(!) Return a list of features ONLY: no headers, footers, or additional text.

Please ensure the feature name and description are user-centric, actionable, and comprehensive. Output only valid JSON. Do not include \`\`\`json\`\`\` at the start or end of the response.`;
}
