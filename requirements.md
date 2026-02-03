# Requirements Document: ConnectiVita

## Introduction

ConnectiVita is a family-centric, life-stage-aware web application designed to help individuals and families in India understand which government schemes may apply to them based on household composition and life context. The application provides a calm, explainable, multilingual experience that respects user privacy while delivering personalized scheme recommendations.

### Problem Statement

In India, hundreds of government welfare schemes exist across central and state levels, covering education, healthcare, housing, employment, agriculture, and social security. However, citizens face significant challenges:

- **Discovery Gap**: Most families are unaware of schemes they qualify for
- **Complexity Barrier**: Eligibility criteria are scattered across multiple portals and documents
- **Life-Stage Blindness**: Existing tools do not account for changing family circumstances
- **Language Barriers**: Information is often available only in English or limited regional languages
- **Cognitive Overload**: Dense bureaucratic language and complex forms discourage engagement
- **Time Sensitivity**: Families miss application windows due to lack of awareness

ConnectiVita addresses these challenges by providing a human-centric, context-aware interface that meets families where they are in their life journey.

### Product Vision & Goals

**Vision**: Empower every Indian family to access the government support they are entitled to, through a calm, respectful, and intelligent digital companion.

**Goals**:
1. Reduce the discovery gap for government schemes by providing personalized, automatic eligibility assessment
2. Lower cognitive load through natural language interaction and visual summaries
3. Respect user privacy by collecting only necessary information with explicit consent
4. Support multilingual access to ensure inclusivity across linguistic communities
5. Provide explainable recommendations that build trust and understanding
6. Adapt to changing life circumstances through conversational updates

### Explicit Non-Goals

ConnectiVita explicitly does NOT:
- Submit applications on behalf of users to government portals
- Verify eligibility officially or provide legal guarantees
- Store identity documents (Aadhaar, PAN, etc.)
- Scrape or mirror government portal content
- Provide medical, legal, or financial advice
- Send email notifications or reminders
- Provide dashboards for government workers or administrators
- Replace official government portals (myScheme, etc.)
- Guarantee scheme availability or application success

### User Personas

**Persona 1: Priya - Young Mother in Urban Setting**
- Age: 28, married, one child (3 years old)
- Works part-time, husband is primary earner
- Comfortable with smartphones, prefers Hindi
- Needs: Maternity benefits, child education schemes, healthcare coverage
- Pain points: Limited time, overwhelmed by government websites

**Persona 2: Rajesh - Middle-Aged Farmer**
- Age: 45, married, three children (ages 12, 15, 18)
- Owns small agricultural land, seasonal income
- Basic smartphone literacy, prefers regional language (Telugu)
- Needs: Agricultural subsidies, education loans, crop insurance
- Pain points: Low digital literacy, language barriers, distrust of online systems

**Persona 3: Meera - Elderly Widow**
- Age: 68, widowed, lives with son's family
- Limited smartphone use, relies on family for digital tasks
- Prefers Tamil, needs assistance navigating interfaces
- Needs: Pension schemes, senior citizen benefits, healthcare schemes
- Pain points: Vision challenges, fear of making mistakes, needs simple interfaces

**Persona 4: Arjun - Recent Graduate**
- Age: 22, single, living with parents
- Tech-savvy, comfortable with English and Hindi
- Needs: Employment schemes, skill development programs, startup support
- Pain points: Information overload, unclear eligibility criteria

## Glossary

- **System**: The ConnectiVita web application
- **User**: An individual accessing the application
- **Family_Account**: A user account representing a household with multiple members
- **Individual_Account**: A user account representing a single person
- **Family_Member**: A person included in a family account (self, spouse, children, parents, siblings)
- **Life_Stage**: A phase in a person's life (e.g., pregnancy, early childhood, education, employment, retirement)
- **Scheme**: A government welfare program with eligibility criteria
- **Eligibility**: Whether a family member qualifies for a specific scheme based on provided data
- **Journey**: A timeline visualization of past, present, and upcoming life stages
- **Focus_Area**: A life-stage priority relevant to the family (e.g., "Early Childhood", "Higher Education")
- **Snapshot**: A visual summary of the family composition
- **Update_History**: A chronological record of changes made to family data
- **Chatbot**: An AI-powered conversational interface for explanations and queries
- **myScheme**: The official Government of India scheme discovery portal

## Functional Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to securely authenticate using email or Google, so that my family data remains private and accessible only to me.

#### Acceptance Criteria

1. WHEN a user visits the application for the first time, THE System SHALL display authentication options for email and Google sign-in
2. WHEN a user selects email authentication, THE System SHALL collect email address and password with validation
3. WHEN a user selects Google authentication, THE System SHALL redirect to Google OAuth flow and handle the callback
4. WHEN authentication succeeds, THE System SHALL create a user session and redirect to the onboarding flow
5. WHEN a returning user provides valid credentials, THE System SHALL restore their session and display the dashboard
6. IF authentication fails, THEN THE System SHALL display a clear error message and allow retry

### Requirement 2: Onboarding and Account Type Selection

**User Story:** As a new user, I want to choose between an individual or family account with clear explanations, so that I provide only relevant information.

#### Acceptance Criteria

1. WHEN a newly authenticated user first accesses the application, THE System SHALL display a welcome screen explaining the purpose and data usage
2. WHEN the welcome screen is displayed, THE System SHALL request explicit permission to collect family data
3. WHEN the user grants permission, THE System SHALL present a choice between Individual_Account and Family_Account
4. WHEN the user selects Individual_Account, THE System SHALL configure data collection for a single person
5. WHEN the user selects Family_Account, THE System SHALL configure data collection for multiple family members
6. THE System SHALL explain the difference between account types in simple language

