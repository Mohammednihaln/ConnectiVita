# Design Document: ConnectiVita

## Overview

ConnectiVita is a family-centric, life-stage-aware web application that helps Indian individuals and families discover government schemes relevant to their household composition and life context. The system inverts traditional scheme discovery by analyzing family data to proactively identify applicable schemes, rather than requiring users to search for schemes.

The application is built on a modern web stack using React for the frontend, Firebase for backend services, Firestore for data persistence, and Gemini AI for conversational intelligence. The architecture prioritizes user privacy, data security, accessibility, and a calm user experience suitable for diverse Indian families across languages and technical literacy levels.

### Core Design Philosophy

1. **Family as Primary Unit**: The system treats families, not individuals, as the fundamental unit of analysis
2. **Life-Stage Intelligence**: Recommendations are driven by life stages rather than scheme categories
3. **Explainability First**: Every recommendation and feature includes accessible explanations
4. **Calm UX**: Non-alarming, low-stress interface with progressive disclosure
5. **Privacy by Design**: Minimal data collection, user-controlled deletion, no identity storage
6. **Multilingual Access**: Full support for multiple Indian languages throughout the experience
7. **Mobile-First**: Optimized for smartphone usage while supporting all device types

## Design Principles

### 1. Conditional Intelligence

The system employs conditional question trees that adapt based on:
- **Gender-aware logic**: Questions adjust based on reported gender
- **Relationship-aware logic**: Follow-up questions depend on family relationships
- **Context-aware logic**: Questions appear only when relevant to previous answers

### 2. Time-Aware Eligibility

Eligibility calculations consider temporal factors:
- Current ages and age-based thresholds
- Scheme deadlines and application windows
- Life stage transitions (upcoming birthdays, graduations, retirements)
- Historical context (when events occurred)

### 3. Progressive Disclosure

Information is revealed gradually to reduce cognitive load:
- Summary views with expandable details
- "Explain this" options for deeper understanding
- Focused views (per family member) before comprehensive views
- Chatbot for on-demand explanations

### 4. Separation of Concerns

Clear boundaries between system responsibilities:
- ConnectiVita: Discovery and information
- myScheme Portal: Official applications and verification
- User: Final decision-making and application submission

## High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
│  (Web Browser - Desktop, Tablet, Mobile)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
│  - React Components (UI)                                     │
│  - Tailwind CSS (Styling)                                    │
│  - React Router (Navigation)                                 │
│  - State Management (Context/Redux)                          │
│  - Multilingual Text Provider                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Services                         │
│  - Authentication (Email, Google OAuth)                      │
│  - Firestore Database (User & Family Data)                   │
│  - Cloud Functions (Business Logic)                          │
│  - Hosting (Static Assets)                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  - Gemini AI (Chatbot Intelligence)                          │
│  - myScheme Portal (Application Redirection)                 │
│  - Scheme Data Source (API or Static Data)                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication Flow**: User → Firebase Auth → Session Token → Frontend
2. **Data Collection Flow**: User Input → Conditional Logic → Validation → Firestore
3. **Eligibility Flow**: Family Data → Eligibility Engine → Filtered Schemes → Display
4. **Chatbot Flow**: User Query + Family Context → Gemini AI → Plain Text Response
5. **Update Flow**: User Change → Parse/Validate → Update Firestore → Recalculate → Refresh UI

## Core Components

### 1. Authentication Module

**Responsibilities**:
- Handle email/password registration and login
- Manage Google OAuth flow
- Maintain session tokens
- Enforce session timeouts (30 minutes inactivity)
- Secure logout with session cleanup

**Key Interfaces**:
```
AuthService:
  - register(email, password) → User
  - loginWithEmail(email, password) → Session
  - loginWithGoogle() → Session
  - logout() → void
  - getCurrentUser() → User | null
  - refreshSession() → Session
```

### 2. Onboarding Module

**Responsibilities**:
- Display welcome and permission information
- Collect account type choice (Individual vs Family)
- Initialize user profile
- Guide through initial data collection

**Key Interfaces**:
```
OnboardingService:
  - showWelcome() → void
  - selectAccountType(type: 'individual' | 'family') → void
  - initializeProfile(accountType) → UserProfile
```

### 3. Family Data Collection Module

**Responsibilities**:
- Present structured questions with conditional logic
- Apply gender-aware and relationship-aware question flows
- Validate user inputs
- Store family composition data
- Support both initial collection and editing

**Key Interfaces**:
```
DataCollectionService:
  - getNextQuestion(currentAnswers) → Question
  - validateAnswer(question, answer) → ValidationResult
  - saveFamily Data(familyData) → void
  - applyConditionalLogic(answers) → Question[]
```

**Conditional Logic Engine**:
- Maintains question dependency graph
- Evaluates conditions based on previous answers
- Determines which questions to show/hide
- Supports nested conditions (e.g., "if married AND spouse is female, ask...")

### 4. Family Snapshot Component

**Responsibilities**:
- Visualize family structure
- Display key member information
- Update dynamically when data changes
- Provide quick overview for user verification

**Key Interfaces**:
```
FamilySnapshot:
  - render(familyData) → VisualRepresentation
  - highlightMember(memberId) → void
  - getDisplayData(familyData) → SnapshotData
```

**Display Logic**:
- Primary user at center or top
- Spouse adjacent to user
- Children displayed in age order
- Parents and siblings in separate groupings
- Visual indicators for relationships

### 5. Life Journey Timeline Component

**Responsibilities**:
- Identify past life events from family data
- Determine current life stage
- Predict upcoming life events
- Display timeline in three sections (previous, now, coming up)
- Support full-screen view

**Key Interfaces**:
```
LifeJourneyService:
  - analyzePastEvents(familyData) → Event[]
  - determineCurrentStage(familyData) → LifeStage
  - predictUpcomingEvents(familyData) → Event[]
  - generateTimeline(familyData) → Timeline
```

**Event Detection Logic**:
- Past: Marriage date, children's births, education completions
- Current: Children's current education level, employment status, health conditions
- Upcoming: Children's school transitions, retirement age approaching, milestone birthdays


### 6. Focus Areas Component

**Responsibilities**:
- Analyze current life stage
- Identify priority areas for the family
- Rank focus areas by relevance
- Display clear, actionable focus areas

**Key Interfaces**:
```
FocusAreasService:
  - calculateFocusAreas(familyData, lifeStage) → FocusArea[]
  - rankByRelevance(focusAreas) → FocusArea[]
  - getFocusAreaDescription(area) → string
```

**Focus Area Determination Logic**:
- Infant children → "Child Health & Nutrition", "Maternity Benefits"
- School-age children → "Education Support", "Scholarships"
- Elderly parents → "Healthcare for Seniors", "Pension Schemes"
- Young adults → "Skill Development", "Employment Programs"
- Business owners → "Business Support", "Loan Schemes"

### 7. Eligibility Engine

**Responsibilities**:
- Calculate scheme eligibility for each family member
- Apply time-aware logic (ages, deadlines, windows)
- Filter schemes to show only eligible ones
- Recalculate when family data changes
- Support family member-based filtering

**Key Interfaces**:
```
EligibilityEngine:
  - calculateEligibility(familyData, schemes) → EligibilityResult[]
  - filterByMember(results, memberId) → EligibilityResult[]
  - isEligible(member, scheme) → boolean
  - getEligibilityReason(member, scheme) → string
```

**Eligibility Calculation Logic**:
```
For each scheme:
  For each family member:
    Check age criteria (current age vs scheme requirements)
    Check gender criteria (if applicable)
    Check income criteria (if provided)
    Check location criteria (state, district)
    Check relationship criteria (e.g., "for children of...")
    Check temporal criteria (application deadlines, windows)
    
    If all criteria met:
      Mark member as eligible
      Store eligibility reason
    Else:
      Mark member as ineligible
      Store reason for ineligibility (optional, for explanations)
```

**Time-Aware Logic**:
- Current date vs application deadlines
- Age calculations based on current date
- Scheme availability windows
- Upcoming eligibility (e.g., "eligible in 2 months when child turns 6")

### 8. Schemes Display Component

**Responsibilities**:
- Display eligible schemes as cards
- Show scheme details (name, description, benefits)
- Provide "How to Apply" information
- Support family member navigation
- Enable redirection to myScheme portal

**Key Interfaces**:
```
SchemesDisplay:
  - renderSchemeCards(eligibilityResults) → SchemeCard[]
  - filterByCategory(category) → SchemeCard[]
  - expandSchemeDetails(schemeId) → SchemeDetails
  - redirectToMyScheme(schemeId) → void
```

**Scheme Card Structure**:
- Scheme name (translated)
- Brief description (2-3 sentences)
- Eligible family members (icons or names)
- Key benefits (bullet points)
- "How to Apply" section (expandable)
- "Apply Now" button (redirects to myScheme)

### 9. Update Mechanisms

#### 9.1 Natural Language Updates ("Has Anything Changed")

**Responsibilities**:
- Accept natural language input
- Parse input to identify changes
- Map changes to family data fields
- Request clarification if ambiguous
- Update family data and trigger recalculation

**Key Interfaces**:
```
NaturalLanguageUpdateService:
  - parseUpdate(input, familyData) → ParsedUpdate
  - identifyChanges(parsedUpdate) → DataChange[]
  - requestClarification(ambiguity) → Question
  - applyChanges(changes, familyData) → UpdatedFamilyData
```

**Parsing Logic**:
- Use Gemini AI to understand natural language
- Extract entities (family members, dates, events)
- Map to structured data fields
- Handle common phrases ("my son started school", "we had a baby", "I got a new job")

#### 9.2 Structured Editing ("Edit Family Details")

**Responsibilities**:
- Display single-page editing interface
- Present family members one at a time
- Apply conditional logic during editing
- Validate changes before saving
- Trigger recalculation after save

**Key Interfaces**:
```
StructuredEditingService:
  - loadEditingInterface(familyData) → EditingUI
  - navigateToMember(memberId) → MemberEditForm
  - validateChanges(changes) → ValidationResult
  - saveChanges(changes) → UpdatedFamilyData
```

**Editing Flow**:
1. User selects "Edit Family Details"
2. System displays first family member (usually primary user)
3. User modifies fields
4. System shows/hides conditional questions based on changes
5. User navigates to next family member or saves
6. System validates all changes
7. System saves to Firestore
8. System recalculates eligibility and updates UI

### 10. Update History Component

**Responsibilities**:
- Record all family data changes
- Display chronological history
- Support deletion of history entries
- Show "Last Updated" indicator

**Key Interfaces**:
```
UpdateHistoryService:
  - recordChange(change, timestamp) → HistoryEntry
  - getHistory(userId) → HistoryEntry[]
  - deleteEntry(entryId) → void
  - getLastUpdated(userId) → timestamp
```

**History Entry Structure**:
```
HistoryEntry:
  - id: string
  - timestamp: Date
  - changeType: 'add' | 'edit' | 'delete'
  - affectedMember: string
  - description: string (human-readable)
  - previousValue: any (optional)
  - newValue: any
```

### 11. Chatbot Module

**Responsibilities**:
- Accept user queries
- Inject family context into prompts
- Generate plain-text responses using Gemini AI
- Maintain conversation history
- Support new chat sessions
- Respond in user's selected language

**Key Interfaces**:
```
ChatbotService:
  - sendMessage(message, sessionId) → Response
  - createNewSession(userId) → Session
  - getSessionHistory(sessionId) → Message[]
  - injectContext(familyData, query) → ContextualPrompt
```

**Context Injection**:
```
Prompt Structure:
  System Instructions:
    - You are a helpful assistant for ConnectiVita
    - Provide plain-text responses without markdown
    - Be concise and clear
    - Explain government schemes in simple language
    - Respond in [user's language]
  
  Family Context:
    - Family composition: [summary]
    - Current life stage: [stage]
    - Focus areas: [areas]
    - Eligible schemes: [list]
  
  User Query:
    - [user's question]
```

**Response Constraints**:
- Plain text only (no markdown, HTML, or formatting)
- Maximum 200 words per response
- Simple language (avoid jargon)
- Accurate information based on family context
- Offer to explain further if needed

### 12. Multilingual System

**Responsibilities**:
- Store translations for all UI text
- Provide language selection interface
- Translate scheme information
- Support chatbot responses in multiple languages
- Persist language preference

**Key Interfaces**:
```
MultilingualService:
  - setLanguage(languageCode) → void
  - getTranslation(key, languageCode) → string
  - translateScheme(scheme, languageCode) → TranslatedScheme
  - getSupportedLanguages() → Language[]
```

**Translation Architecture**:
- Static UI text: JSON translation files per language
- Dynamic content (schemes): Stored in Firestore with language variants
- Chatbot: Language code passed to Gemini AI prompt
- Fallback: English if translation missing

**Supported Languages (Initial)**:
- English (en)
- Hindi (hi)
- Tamil (ta)

### 13. Settings Module

**Responsibilities**:
- Provide access to edit family snapshot
- Enable chat history clearing
- Support account deletion
- Manage user preferences

**Key Interfaces**:
```
SettingsService:
  - navigateToEditSnapshot() → void
  - clearChatHistory(userId) → void
  - deleteAccount(userId) → void
  - updatePreferences(preferences) → void
```

**Account Deletion Flow**:
1. User selects "Delete Account"
2. System displays confirmation dialog with warning
3. User confirms deletion
4. System deletes:
   - User profile
   - Family data
   - Chat history
   - Update history
   - Session tokens
5. System logs out user
6. System displays confirmation message

## Data Models

### User Model

```
User:
  - id: string (Firebase UID)
  - email: string
  - authProvider: 'email' | 'google'
  - accountType: 'individual' | 'family'
  - languagePreference: string (language code)
  - createdAt: timestamp
  - lastLogin: timestamp
```

### Family Data Model

```
FamilyData:
  - userId: string (references User)
  - primaryUser: Person
  - spouse: Person | null
  - children: Person[]
  - parents: Person[]
  - siblings: Person[]
  - lastUpdated: timestamp
  - createdAt: timestamp

Person:
  - id: string
  - name: string
  - relationship: 'self' | 'spouse' | 'child' | 'parent' | 'sibling'
  - gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  - dateOfBirth: Date
  - age: number (calculated)
  - educationLevel: string | null
  - employmentStatus: string | null
  - healthConditions: string[] | null
  - additionalInfo: Map<string, any> (conditional fields)
```

### Scheme Model

```
Scheme:
  - id: string
  - name: Map<languageCode, string>
  - description: Map<languageCode, string>
  - benefits: Map<languageCode, string[]>
  - eligibilityCriteria: EligibilityCriteria
  - howToApply: Map<languageCode, string>
  - mySchemeUrl: string
  - category: string[]
  - level: 'central' | 'state' | 'district'
  - state: string | null
  - district: string | null
  - applicationDeadline: Date | null
  - applicationWindow: DateRange | null

EligibilityCriteria:
  - ageMin: number | null
  - ageMax: number | null
  - gender: string[] | null
  - relationships: string[] | null
  - incomeMax: number | null
  - educationLevel: string[] | null
  - employmentStatus: string[] | null
  - location: LocationCriteria | null
  - customCriteria: Map<string, any>
```

### Chat Session Model

```
ChatSession:
  - id: string
  - userId: string
  - createdAt: timestamp
  - lastMessageAt: timestamp
  - messages: Message[]

Message:
  - id: string
  - role: 'user' | 'assistant'
  - content: string
  - timestamp: timestamp
```

### Update History Model

```
UpdateHistoryEntry:
  - id: string
  - userId: string
  - timestamp: timestamp
  - changeType: 'add' | 'edit' | 'delete'
  - affectedMember: string
  - description: string
  - previousValue: any | null
  - newValue: any
```

## Life-Stage Intelligence Logic

### Life Stage Detection

The system identifies life stages based on family composition:

```
detectLifeStage(familyData):
  stages = []
  
  // Check for pregnancy/infants
  if hasChildrenUnder1(familyData):
    stages.add('new_parent')
  
  // Check for young children
  if hasChildrenAge1to5(familyData):
    stages.add('early_childhood')
  
  // Check for school-age children
  if hasChildrenAge6to18(familyData):
    stages.add('school_age_children')
  
  // Check for college-age children
  if hasChildrenAge18to25(familyData):
    stages.add('higher_education')
  
  // Check for elderly parents
  if hasParentsOver60(familyData):
    stages.add('elderly_care')
  
  // Check for retirement age
  if primaryUserAge > 58:
    stages.add('approaching_retirement')
  
  // Check for young adults
  if primaryUserAge < 30 AND noChildren:
    stages.add('young_adult')
  
  return stages
```

### Focus Area Mapping

```
mapLifeStageToFocusAreas(lifeStages):
  focusAreas = []
  
  for stage in lifeStages:
    switch stage:
      case 'new_parent':
        focusAreas.add('Maternity Benefits')
        focusAreas.add('Child Health & Nutrition')
      case 'early_childhood':
        focusAreas.add('Child Development')
        focusAreas.add('Immunization Programs')
      case 'school_age_children':
        focusAreas.add('Education Support')
        focusAreas.add('Scholarships')
      case 'higher_education':
        focusAreas.add('Higher Education Loans')
        focusAreas.add('Skill Development')
      case 'elderly_care':
        focusAreas.add('Healthcare for Seniors')
        focusAreas.add('Pension Schemes')
      case 'approaching_retirement':
        focusAreas.add('Retirement Planning')
        focusAreas.add('Senior Citizen Benefits')
      case 'young_adult':
        focusAreas.add('Employment Programs')
        focusAreas.add('Skill Training')
  
  return rankByRelevance(focusAreas)
```


## Family Snapshot Design

### Visual Representation

The Family Snapshot provides an at-a-glance view of household composition:

**Layout Structure**:
```
┌─────────────────────────────────────┐
│       Family Snapshot               │
├─────────────────────────────────────┤
│                                     │
│         [Primary User]              │
│         Name, Age                   │
│                                     │
│    [Spouse]                         │
│    Name, Age                        │
│                                     │
│    Children:                        │
│    [Child 1] Name, Age              │
│    [Child 2] Name, Age              │
│                                     │
│    Parents:                         │
│    [Parent 1] Name, Age             │
│    [Parent 2] Name, Age             │
│                                     │
│    Last Updated: [timestamp]        │
└─────────────────────────────────────┘
```

**Display Rules**:
- Primary user always displayed first
- Spouse displayed if present
- Children sorted by age (oldest first)
- Parents and siblings in separate sections
- Visual icons indicate relationships
- Age calculated dynamically from date of birth
- "Last Updated" shows most recent change

### Update Triggers

The Family Snapshot updates automatically when:
- User completes initial data collection
- User edits family details
- User submits natural language update
- User adds or removes family members

## Editing & Conditional Logic Design

### Conditional Question Tree

The system uses a directed acyclic graph (DAG) to represent question dependencies:

```
Question Node:
  - id: string
  - text: Map<languageCode, string>
  - fieldName: string
  - inputType: 'text' | 'number' | 'date' | 'select' | 'radio'
  - options: any[] | null
  - conditions: Condition[]
  - validations: Validation[]

Condition:
  - dependsOn: string (field name)
  - operator: '==' | '!=' | '>' | '<' | 'in' | 'not_in'
  - value: any
  - logicalOperator: 'AND' | 'OR' | null
```

**Example Conditional Flow**:
```
Q1: "Are you married?"
  → If YES:
    Q2: "What is your spouse's name?"
    Q3: "What is your spouse's gender?"
    Q4: "What is your spouse's date of birth?"
    → If spouse.gender == 'female' AND spouse.age < 45:
      Q5: "Is your spouse pregnant?"
  → If NO:
    Skip to Q6

Q6: "Do you have children?"
  → If YES:
    Q7: "How many children?"
    For each child:
      Q8: "Child's name?"
      Q9: "Child's date of birth?"
      Q10: "Child's gender?"
      → If child.age >= 3:
        Q11: "Is the child in school?"
        → If YES:
          Q12: "What grade/class?"
```

### Gender-Aware Logic

Questions adapt based on reported gender:

```
if person.gender == 'female' AND person.age >= 15 AND person.age <= 49:
  ask("Are you pregnant?")
  ask("Do you have children?")

if person.gender == 'male' AND person.age >= 18:
  ask("Are you married?")
  if married:
    ask("Does your spouse work?")
```

### Relationship-Aware Logic

Questions adapt based on family relationships:

```
if relationship == 'child' AND age < 18:
  ask("Who is the primary caregiver?")
  ask("Is the child in school?")

if relationship == 'parent' AND age > 60:
  ask("Does this parent live with you?")
  ask("Does this parent have any health conditions?")

if relationship == 'spouse':
  ask("Is your spouse employed?")
  ask("What is your spouse's education level?")
```

### Edit Family Details Page Design

**Single-Page Interface**:
- Display one family member at a time
- Navigation: Previous/Next buttons
- Progress indicator (e.g., "Member 2 of 5")
- Save button (validates and persists all changes)
- Cancel button (discards changes)

**Dynamic Field Display**:
- Fields appear/disappear based on conditional logic
- Smooth transitions (fade in/out)
- Clear visual indication when fields are added
- Preserve user input when navigating between members

**Validation**:
- Real-time validation as user types
- Clear error messages below fields
- Prevent save if validation fails
- Highlight invalid fields

## Schemes Eligibility Engine

### Eligibility Calculation Algorithm

```
calculateEligibility(familyData, schemes):
  results = []
  
  for scheme in schemes:
    eligibleMembers = []
    
    for member in getAllFamilyMembers(familyData):
      if isEligible(member, scheme):
        eligibleMembers.add(member)
        reason = generateEligibilityReason(member, scheme)
        eligibleMembers[member].reason = reason
    
    if eligibleMembers.length > 0:
      results.add({
        scheme: scheme,
        eligibleMembers: eligibleMembers
      })
  
  return results

isEligible(member, scheme):
  criteria = scheme.eligibilityCriteria
  
  // Check age
  if criteria.ageMin AND member.age < criteria.ageMin:
    return false
  if criteria.ageMax AND member.age > criteria.ageMax:
    return false
  
  // Check gender
  if criteria.gender AND member.gender NOT IN criteria.gender:
    return false
  
  // Check relationship
  if criteria.relationships AND member.relationship NOT IN criteria.relationships:
    return false
  
  // Check education
  if criteria.educationLevel AND member.educationLevel NOT IN criteria.educationLevel:
    return false
  
  // Check employment
  if criteria.employmentStatus AND member.employmentStatus NOT IN criteria.employmentStatus:
    return false
  
  // Check temporal criteria
  if criteria.applicationDeadline AND currentDate > criteria.applicationDeadline:
    return false
  
  if criteria.applicationWindow:
    if currentDate < criteria.applicationWindow.start OR currentDate > criteria.applicationWindow.end:
      return false
  
  // Check custom criteria
  for customCriterion in criteria.customCriteria:
    if NOT evaluateCustomCriterion(member, customCriterion):
      return false
  
  return true
```

### Time-Aware Recalculation

Eligibility is recalculated:
- When family data changes (immediate)
- When user logs in (check for age changes, deadline changes)
- Daily background job (update ages, check deadlines)

```
recalculateEligibility(userId):
  familyData = getFamilyData(userId)
  
  // Update ages based on current date
  for member in getAllFamilyMembers(familyData):
    member.age = calculateAge(member.dateOfBirth, currentDate)
  
  // Get active schemes (not past deadline)
  activeSchemes = getActiveSchemes(currentDate)
  
  // Calculate eligibility
  eligibilityResults = calculateEligibility(familyData, activeSchemes)
  
  // Store results
  storeEligibilityResults(userId, eligibilityResults)
  
  return eligibilityResults
```

### Family Member Navigation

**Filter Logic**:
```
filterSchemesByMember(eligibilityResults, memberCategory):
  filtered = []
  
  switch memberCategory:
    case 'You':
      filtered = results where primaryUser in eligibleMembers
    case 'Spouse':
      filtered = results where spouse in eligibleMembers
    case 'Children':
      filtered = results where any child in eligibleMembers
    case 'Parents':
      filtered = results where any parent in eligibleMembers
    case 'Siblings':
      filtered = results where any sibling in eligibleMembers
  
  return filtered
```

**UI Navigation**:
- Tabs or buttons for each category
- Badge showing count of eligible schemes per category
- Active category highlighted
- Smooth transition when switching categories

## Chatbot Design

### Context Injection Strategy

**Family Context Summary**:
```
generateFamilyContext(familyData):
  context = "Family Composition:\n"
  context += "- Primary User: " + familyData.primaryUser.name + ", " + familyData.primaryUser.age + " years old\n"
  
  if familyData.spouse:
    context += "- Spouse: " + familyData.spouse.name + ", " + familyData.spouse.age + " years old\n"
  
  if familyData.children.length > 0:
    context += "- Children: " + familyData.children.length + "\n"
    for child in familyData.children:
      context += "  - " + child.name + ", " + child.age + " years old\n"
  
  if familyData.parents.length > 0:
    context += "- Parents: " + familyData.parents.length + "\n"
  
  context += "\nCurrent Life Stage: " + detectLifeStage(familyData) + "\n"
  context += "Focus Areas: " + getFocusAreas(familyData).join(", ") + "\n"
  
  return context
```

**Prompt Construction**:
```
buildChatbotPrompt(userQuery, familyData, language):
  prompt = "System Instructions:\n"
  prompt += "You are a helpful assistant for ConnectiVita, a government scheme discovery platform.\n"
  prompt += "Provide clear, concise answers in plain text without any markdown or formatting.\n"
  prompt += "Explain government schemes in simple language that anyone can understand.\n"
  prompt += "Be empathetic and supportive.\n"
  prompt += "Respond in " + language + ".\n"
  prompt += "Keep responses under 200 words.\n\n"
  
  prompt += generateFamilyContext(familyData) + "\n\n"
  
  prompt += "User Question: " + userQuery + "\n\n"
  prompt += "Response:"
  
  return prompt
```

### Response Processing

```
processChatbotResponse(rawResponse):
  // Remove any markdown formatting
  cleaned = removeMarkdown(rawResponse)
  
  // Remove HTML tags
  cleaned = stripHtmlTags(cleaned)
  
  // Trim whitespace
  cleaned = cleaned.trim()
  
  // Ensure plain text
  if containsFormatting(cleaned):
    cleaned = convertToPlainText(cleaned)
  
  return cleaned
```

### Chat History Management

**Storage**:
- Each chat session stored as separate document in Firestore
- Messages stored as array within session document
- Sessions sorted by lastMessageAt timestamp

**Display**:
- List of previous sessions with first message as preview
- Click to open full session
- "New Chat" button creates new session
- Current session highlighted

**New Chat Flow**:
1. User clicks "New Chat"
2. System creates new ChatSession document
3. System clears current conversation display
4. User starts fresh conversation
5. Previous session remains accessible in history

## Multilingual Architecture

### Translation Storage

**Static UI Text**:
```
translations/
  en.json
  hi.json
  ta.json

en.json:
{
  "welcome.title": "Welcome to ConnectiVita",
  "welcome.subtitle": "Discover government schemes for your family",
  "onboarding.accountType": "Choose account type",
  "onboarding.individual": "Individual",
  "onboarding.family": "Family",
  ...
}
```

**Dynamic Content (Schemes)**:
```
Scheme document in Firestore:
{
  id: "scheme_123",
  name: {
    en: "Pradhan Mantri Matru Vandana Yojana",
    hi: "प्रधानमंत्री मातृ वंदना योजना",
    ta: "பிரதம மந்திரி மாத்ரு வந்தனா யோஜனா"
  },
  description: {
    en: "Maternity benefit program...",
    hi: "मातृत्व लाभ कार्यक्रम...",
    ta: "மகப்பேறு நலன் திட்டம்..."
  },
  ...
}
```

### Language Selection Flow

```
setUserLanguage(languageCode):
  // Validate language code
  if NOT isSupportedLanguage(languageCode):
    throw Error("Unsupported language")
  
  // Update user preference
  updateUserPreference(userId, 'languagePreference', languageCode)
  
  // Update UI
  reloadTranslations(languageCode)
  
  // Update chatbot
  setChatbotLanguage(languageCode)
  
  // Refresh displayed content
  refreshAllContent()
```

### Fallback Strategy

```
getTranslation(key, languageCode):
  translation = translations[languageCode][key]
  
  if translation:
    return translation
  
  // Fallback to English
  translation = translations['en'][key]
  
  if translation:
    return translation
  
  // Fallback to key itself
  return key
```

## Privacy & Consent Design

### Onboarding Consent

**Welcome Screen**:
- Clear explanation of data collection
- List of data types collected
- Purpose of data collection
- User rights (view, edit, delete)
- Explicit consent checkbox
- Link to privacy policy

**Consent Flow**:
1. User sees welcome screen
2. User reads data collection information
3. User checks "I understand and consent" checkbox
4. User clicks "Continue"
5. System records consent timestamp
6. User proceeds to account type selection

### Data Minimization

**Principles**:
- Collect only data necessary for eligibility determination
- No identity documents (Aadhaar, PAN, etc.)
- No financial account information
- No precise location (only state/district if needed)
- No contact information beyond email for authentication

**Optional Fields**:
- Mark non-essential fields as optional
- Allow users to skip optional questions
- Provide "Prefer not to say" options for sensitive fields

### User Control

**Data Access**:
- View all stored data through Family Snapshot
- Download complete family summary
- Clear visibility of what data is stored

**Data Modification**:
- Edit any field at any time
- Delete family members
- Update information through multiple methods

**Data Deletion**:
- Delete individual update history entries
- Clear all chat history
- Delete entire account and all associated data
- Permanent deletion (no recovery)

### Secure Storage

**Encryption**:
- TLS 1.2+ for all data in transit
- Firestore encryption at rest (automatic)
- No client-side storage of sensitive data
- Session tokens stored securely

**Access Control**:
- User can only access their own data
- Firebase security rules enforce user isolation
- No admin access to user data without explicit permission
- Audit logs for data access (Firebase automatic)

