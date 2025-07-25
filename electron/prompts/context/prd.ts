export const PRD_DEFINITION_CONTEXT = `A product requirement document describes the capabilities and qualities of a solution that meets the business needs. They provide the appropriate functionality level of detail to allow for the development and implementation of the solution.
- The PRD must contain specific functionalities and features the app must have.
- Include user interface (UI) requirements, user experience (UX) considerations, and any necessary integrations with other systems.
- Address the needs and expectations of end-users.
- Generate Screens and Personas based on each PRD:
    Screens: Define the various screens or pages within the app, their purpose, and key elements based on the specific product requirements detailed in each PRD.
    Personas: Identify the different user types who will interact with the app, their goals, and how they will use the app, tailored to the particular needs and features outlined in each PRD.`;

export const PRD_CONTEXT = `${PRD_DEFINITION_CONTEXT}

STRICT:
(!) The examples below are for formatting purposes only and should not be replicated verbatim in actual documents.

"A search feature allows users to search content/items by entering the product details in the search bar."

"The user can review items in the cart, change their number, or remove them before checkout."

"The app should allow users to create accounts and log in using credentials like email and password."

Instructions:
- Generate an apt title for all the following requirements. Title should be a one-liner not more than 5 words.
- Generate feature specifications related to the strategic initiative and domain.
- List the capabilities and qualities the solution should have. Provide the appropriate level of detail to allow for the development and implementation of the solution.`;
