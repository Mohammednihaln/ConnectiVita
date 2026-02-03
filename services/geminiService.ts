
import { GoogleGenAI, Type } from "@google/genai";
import { LifeStageUpdate, CitizenProfile, ChatMessage, SchemeAnalysisResult, AppLanguage, Scheme, DetectedProfileUpdate, FocusAreaContent, SnapshotUpdateEntry } from "../types";
import { TRANSLATIONS } from "../translations";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Reusable config for reassuring tone
const getToneInstructions = (language: AppLanguage) => `
Tone Rules:
1. Language: OUTPUT STRICTLY IN ${language}.
2. Reassure FIRST. Start with "Nothing here is urgent." where appropriate.
3. Explain how small actions now reduce stress later.
4. NEVER instruct or pressure. Use "Consider" or "You might find it helpful" instead of "You must".
5. Keep it calm, supportive, and non-bureaucratic.
6. SIMPLICITY RULE: Use simple words. No complex sentences. Write like you are speaking to a friend.
`;

export const deepClean = (obj: any, seen = new WeakSet()): any => {
    // 1. Handle Primitives and Null
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // 2. Handle Dates
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // 3. Handle DOM Nodes / Windows / Events (Common source of 'src' circular errors)
    if (typeof Node !== 'undefined' && obj instanceof Node) return '[DOM Node]';
    if (typeof Window !== 'undefined' && obj instanceof Window) return '[Window]';
    if (typeof Event !== 'undefined' && obj instanceof Event) return '[Event]';

    // 4. Handle Circular References
    if (seen.has(obj)) {
        return '[Circular]';
    }
    seen.add(obj);

    // 5. Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => deepClean(item, seen));
    }

    // 6. Handle Objects
    const cleaned: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            try {
                // Skip internal React keys or large irrelevant objects if found
                if (key.startsWith('_') || key === 'nativeEvent') {
                    continue;
                }
                const val = obj[key];
                // Skip functions as they don't stringify anyway but might have props
                if (typeof val === 'function') continue;

                cleaned[key] = deepClean(val, seen);
            } catch (e) {
                cleaned[key] = '[Error Accessing Property]';
            }
        }
    }
    return cleaned;
};

export const safeStringifyProfile = (profile: CitizenProfile) => {
    try {
        // Whitelist fields to ensure no DOM nodes or extraneous properties (like 'src') get included
        const cleanProfile = {
            username: profile.username,
            accountScope: profile.accountScope,
            memberCount: profile.memberCount,
            primaryUser: profile.primaryUser,
            spouse: profile.spouse,
            children: profile.children,
            parents: profile.parents,
            siblings: profile.siblings,
            socialCategory: profile.socialCategory,

            // Include derived/optional fields for full state restoration
            state: profile.state || profile.primaryUser?.state,
            residenceType: profile.residenceType,
            livelihood: profile.livelihood,
            incomeStability: profile.incomeStability,
            financialPressure: profile.financialPressure,
            isPregnant: profile.isPregnant,
            childrenCounts: profile.childrenCounts
        };

        return JSON.stringify(deepClean(cleanProfile));
    } catch (e) {
        console.warn("Profile stringify error", e);
        return JSON.stringify({ note: "Profile data could not be fully serialized" });
    }
};

export const detectProfileChanges = async (
    currentProfile: CitizenProfile,
    userInput: string,
    language: AppLanguage
): Promise<DetectedProfileUpdate> => {
    try {
        const prompt = `
            You are a Data Consistency Engine.
            Current Profile JSON: ${safeStringifyProfile(currentProfile)}
            User Update Input: "${userInput}"
            
            Task:
            1. Identify what specifically changed in the family profile based on the user input.
            2. Return the FULL updated profile JSON with these changes applied.
            3. List the specific changes in a structured way for user confirmation.
            
            Rules:
            - Only change fields explicitly mentioned or strongly implied (e.g., "Daughter started college" implies Child X is now a Student in College).
            - Do NOT remove existing members unless explicitly told (e.g. "My father passed away").
            - If a new member is added (e.g. "We had a baby"), add them to the children array with appropriate default age (0).
            - Translate the "summary" and "affectedMember" and "field" names into ${language} for display.
            
            Output Schema:
            {
                "summary": "Short description of what changed in ${language}",
                "changes": [
                    { "field": "Display Name of Field", "oldValue": "Old Value String", "newValue": "New Value String", "affectedMember": "Name/Role of Member" }
                ],
                "newProfileState": { ...Full CitizenProfile Object ... }
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as DetectedProfileUpdate;

    } catch (e) {
        console.error("Profile Detection Error", e);
        throw e;
    }
};

export const analyzeLifeStageChange = async (
    currentStage: string,
    userInput: string,
    language: AppLanguage
): Promise<LifeStageUpdate> => {
    try {
        const prompt = `
      You are ConnectiVita, a supportive life-stage intelligence engine.
      Current Context: The family is currently in the "${currentStage}" stage.
      User Update: "${userInput}"

      Task: 
      1. Analyze this change. Determine the NEW primary life stage.
      2. Infer a "previousStage" if the context suggests a clear transition (e.g. "Pregnancy" -> "New Parent"). Otherwise leave empty.
      3. Identify ALL active life stages present in the household.
      4. Provide scheme indicators and focus area content.
      
      Rules:
      - 'previousStage': Name of the stage they likely just left, if any.
      - 'nextStagePrediction': A gentle "Coming Up" label (e.g. "Toddler Years (12-24mo)").
      - Translate ALL content to ${language}.

      Output JSON Schema:
      {
         currentStage: string,
         previousStage: string,
         activeStages: string[],
         schemeIndicators: string[],
         nextStagePrediction: string,
         immediateNeeds: string[],
         explanation: string,
         journeySummary: string,
         profileUpdates: {},
         focusAreas: {
            health: { title: string, shortDescription: string, whyItMatters: string },
            education: { title: string, shortDescription: string, whyItMatters: string },
            livelihood: { title: string, shortDescription: string, whyItMatters: string },
            support: { title: string, shortDescription: string, whyItMatters: string }
         }
      }
      
      ${getToneInstructions(language)}
    `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        return JSON.parse(text) as LifeStageUpdate;

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return {
            currentStage: currentStage,
            nextStagePrediction: "Unknown",
            immediateNeeds: ["Check back later"],
            explanation: "We couldn't process that update automatically.",
            journeySummary: "Profile updated."
        };
    }
};

// Generates fallback schemes if AI returns empty or fails
const generateFallbackSchemes = (profile: CitizenProfile, language: AppLanguage): Scheme[] => {
    // @ts-ignore
    const t = TRANSLATIONS[language]?.schemes?.defaults || TRANSLATIONS['English'].schemes.defaults;
    const schemes: Scheme[] = [];

    // 1. General Welfare (Always for Self)
    schemes.push({
        name: t.generalTitle,
        description: t.generalDesc,
        eligibilityReason: t.reason,
        benefits: "Health & Security Coverage",
        beneficiary: "You",
        beneficiaryType: "SELF",
        category: "Other",
        probability: "Likely applicable",
        applicationProcess: ["Contact local municipal office", "Submit ID proof"],
        requiredDocuments: ["Aadhaar", "Address Proof"],
        applicationMode: "Offline"
    });

    // 2. Child Support (If children exist)
    if (profile.children && profile.children.length > 0) {
        schemes.push({
            name: t.childTitle,
            description: t.childDesc,
            eligibilityReason: t.reason,
            benefits: "Education & Nutrition",
            beneficiary: "Children",
            beneficiaryType: "CHILD",
            category: "Education",
            probability: "Likely applicable",
            applicationProcess: ["Visit nearest Anganwadi or School", "Register child"],
            requiredDocuments: ["Birth Certificate", "Aadhaar"],
            applicationMode: "Assisted"
        });
    }

    // 3. Spouse / Maternal (If spouse exists)
    if (profile.spouse && (profile.spouse.age || profile.spouse.gender)) {
        schemes.push({
            name: t.maternalTitle,
            description: t.maternalDesc,
            eligibilityReason: t.reason,
            benefits: "Health & Support",
            beneficiary: "Spouse",
            beneficiaryType: "SPOUSE",
            category: "Health",
            probability: "May apply",
            applicationProcess: ["Visit Primary Health Centre", "Consult ANM"],
            requiredDocuments: ["ID Proof", "Bank Account"],
            applicationMode: "Assisted"
        });
    }

    // 4. Parents / Senior (If parents exist)
    if (profile.parents && profile.parents.length > 0) {
        schemes.push({
            name: t.seniorTitle,
            description: t.seniorDesc,
            eligibilityReason: t.reason,
            benefits: "Pension & Care",
            beneficiary: "Parents",
            beneficiaryType: "PARENT",
            category: "Pension",
            probability: "Likely applicable",
            applicationProcess: ["Apply at Social Welfare Office", "Verify Age"],
            requiredDocuments: ["Age Proof", "Aadhaar"],
            applicationMode: "Offline"
        });
    }

    return schemes;
};

export const getEligibleSchemes = async (
    profile: CitizenProfile,
    currentStage: string,
    language: AppLanguage
): Promise<SchemeAnalysisResult> => {
    try {
        const state = profile.state || profile.primaryUser?.state;
        if (!state) {
            return {
                status: 'missing_info',
                missingField: 'state',
                missingFieldQuestion: language === 'Hindi'
                    ? "सहायता विकल्पों की जाँच करने के लिए, क्या आप बता सकते हैं कि आप किस राज्य में रहते हैं?"
                    : "To check for support options, could you share which State you live in?"
            };
        }

        const prompt = `
            You are the Scheme Eligibility Engine for ConnectiVita.
            
            Context:
            - Profile: ${safeStringifyProfile(profile)}
            - Life Stage: ${currentStage}
            - Language: ${language}
            
            Task: Identify government schemes (India context) relevant to EACH member of this family.
            
            ELIGIBILITY LOGIC LAYERS:
            1. LAYER 1 (Likely Applicable): Strong match with Life Stage, Age, or Category. Label as 'Likely applicable'.
            2. LAYER 2 (Conditionally Applicable): Plausible match but specific criteria (income, exact caste) unknown. Label as 'Requires verification'.
            
            CRITICAL RULES (FALLBACK SAFETY):
            1. If strict eligibility checks fail, you MUST return schemes based on the Life Stage (Layer 1 or 2).
            2. Example: If pregnant, ALWAYS show PMMVY/Janani Suraksha (Likely applicable) even if specific income data is missing.
            3. Example: If elderly (>60), ALWAYS show IGNOAPS (Pension) as a suggestion.
            4. Example: If child (6-14), ALWAYS show Right to Education related benefits.
            5. NEVER return an empty list if the profile has family members. Always infer relevance from age/gender/life stage.
            6. Do NOT hide schemes due to missing data. Use 'Requires verification' or 'May apply'.
            
            Content Rules:
            1. Use the provided profile data (Age, Gender, Income, Caste, Employment, State).
            2. "beneficiary" field: Display Name/Role AND Age (e.g. "Mother (62)", "You (35)").
            3. "beneficiaryType" field: MUST be one of 'SELF' (primary user), 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', or 'FAMILY' (general household schemes).
            4. Return 'eligible' with a list of schemes.
            5. Do NOT make up schemes. Use real, well-known schemes.
            6. LIMIT: Maximum 3-4 schemes per family member.
            7. "eligibilityReason": Plain language explanation. E.g. "Shown because you have a child of school age."
            8. Translate Name, Description, Reason, Benefits, Beneficiary into ${language}.
            9. "category" MUST be one of: 'Health', 'Education', 'Pension', 'Livelihood', 'Housing', 'Other'.
            10. "applicationProcess": Array of 3-5 short, numbered steps (strings) in ${language}. Simple language.
            11. "requiredDocuments": Array of strings (e.g. 'Aadhaar', 'Bank Passbook') in ${language}.
            12. "applicationMode": One of 'Offline', 'Online', 'Assisted'.
            13. "probability": One of 'Likely applicable', 'May apply', 'Requires verification'.
                - 'Likely applicable': Strong match (Age + Gender + Life Stage match).
                - 'May apply': Good match but loose criteria.
                - 'Requires verification': Plausible but depends on specific doc/income not in profile.
            
            Output JSON:
            {
               "status": "eligible" | "missing_info" | "no_schemes_found",
               "missingField": "residenceType" (only if needed),
               "missingFieldQuestion": "string" (polite question in ${language}),
               "schemes": [ 
                   { 
                       "name": "", 
                       "description": "", 
                       "eligibilityReason": "Suggested because...", 
                       "benefits": "", 
                       "beneficiary": "Mother (62)",
                       "beneficiaryType": "PARENT", 
                       "category": "Health",
                       "probability": "Likely applicable",
                       "applicationProcess": ["Step 1", "Step 2"],
                       "requiredDocuments": ["Doc 1", "Doc 2"],
                       "applicationMode": "Offline"
                   } 
               ]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        status: { type: Type.STRING, enum: ['eligible', 'missing_info', 'no_schemes_found'] },
                        missingField: { type: Type.STRING },
                        missingFieldQuestion: { type: Type.STRING },
                        schemes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    eligibilityReason: { type: Type.STRING },
                                    benefits: { type: Type.STRING },
                                    beneficiary: { type: Type.STRING },
                                    beneficiaryType: { type: Type.STRING, enum: ['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'FAMILY'] },
                                    category: { type: Type.STRING, enum: ['Health', 'Education', 'Pension', 'Livelihood', 'Housing', 'Other'] },
                                    probability: { type: Type.STRING, enum: ['Likely applicable', 'May apply', 'Requires verification'] },
                                    applicationProcess: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    requiredDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    applicationMode: { type: Type.STRING, enum: ['Offline', 'Online', 'Assisted'] }
                                }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        const result = JSON.parse(text) as SchemeAnalysisResult;

        // ABSOLUTE RENDER GUARANTEE:
        // If AI returns NO schemes, or very few, MERGE with deterministic fallbacks.
        const fallbackSchemes = generateFallbackSchemes(profile, language);

        if (!result.schemes || result.schemes.length === 0) {
            result.schemes = fallbackSchemes;
            result.status = 'eligible';
        } else {
            // Check coverage: Ensure SELF, CHILD, etc. are represented if they exist in profile
            // This is a simple merge to ensure key members aren't left out.
            const existingTypes = new Set(result.schemes.map(s => s.beneficiaryType));
            fallbackSchemes.forEach(fb => {
                if (!existingTypes.has(fb.beneficiaryType)) {
                    result.schemes?.push(fb);
                }
            });
        }

        return result;

    } catch (e) {
        console.error("Scheme Check Error", e);
        // Fallback on error too
        return {
            status: 'eligible',
            schemes: generateFallbackSchemes(profile, language)
        };
    }
}

export const generateInitialSnapshot = async (profile: CitizenProfile, language: AppLanguage): Promise<LifeStageUpdate> => {
    try {
        const prompt = `
            Create an initial life-stage snapshot for a family.
            - Profile Data: ${safeStringifyProfile(profile)}

            Task: 
            1. Determine PRIMARY life stage and all active secondary stages.
            2. Infer a "previousStage" if one logically precedes this (e.g. if 'School Age', previous might be 'Early Childhood').
            3. Provide a gentle "nextStagePrediction" (Coming Up).
            4. Provide scheme indicators and focus areas.
            
            Rules:
            - 'previousStage': Name of likely previous stage (or empty if unknown).
            - 'nextStagePrediction': Name of coming up stage (e.g. "Adolescence").
            - Translate ALL content to ${language}.

            Output JSON Schema:
            {
                currentStage: string,
                previousStage: string,
                activeStages: string[],
                schemeIndicators: string[],
                nextStagePrediction: string,
                immediateNeeds: string[],
                explanation: string,
                journeySummary: string,
                focusAreas: {
                    health: { title: string, shortDescription: string, whyItMatters: string },
                    education: { title: string, shortDescription: string, whyItMatters: string },
                    livelihood: { title: string, shortDescription: string, whyItMatters: string },
                    support: { title: string, shortDescription: string, whyItMatters: string }
                }
            }
            
            ${getToneInstructions(language)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        currentStage: { type: Type.STRING },
                        previousStage: { type: Type.STRING },
                        activeStages: { type: Type.ARRAY, items: { type: Type.STRING } },
                        schemeIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
                        nextStagePrediction: { type: Type.STRING },
                        immediateNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        explanation: { type: Type.STRING },
                        journeySummary: { type: Type.STRING },
                        focusAreas: {
                            type: Type.OBJECT,
                            properties: {
                                health: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, shortDescription: { type: Type.STRING }, whyItMatters: { type: Type.STRING } } },
                                education: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, shortDescription: { type: Type.STRING }, whyItMatters: { type: Type.STRING } } },
                                livelihood: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, shortDescription: { type: Type.STRING }, whyItMatters: { type: Type.STRING } } },
                                support: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, shortDescription: { type: Type.STRING }, whyItMatters: { type: Type.STRING } } }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text) as LifeStageUpdate;

    } catch (e) {
        console.error("Initial Generation Error", e);
        return {
            currentStage: "Assessment Pending",
            nextStagePrediction: "Consultation needed",
            immediateNeeds: ["Complete profile"],
            explanation: "We need a bit more info.",
            journeySummary: "Profile created."
        };
    }
}

export const explainNeed = async (currentStage: string, need: string, language: AppLanguage): Promise<string> => {
    try {
        const prompt = `
            Context: Family is in "${currentStage}". Topic: "${need}".
            Task: Explain why this topic matters.
            Language: ${language}.
            Constraints: Max 2 sentences. Spoken style. Start with "Nothing is urgent."
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });

        return response.text || "This is helpful for your family.";
    } catch (e) {
        return "Loading...";
    }
}

export const getFamilyContextChatResponse = async (
    profile: CitizenProfile,
    currentStage: string,
    history: ChatMessage[],
    lastUserMessage: string,
    language: AppLanguage,
    schemes?: SchemeAnalysisResult | null,
    updateHistory?: SnapshotUpdateEntry[]
): Promise<string> => {
    try {
        const conversationHistory = history.map(msg =>
            `${msg.role === 'user' ? 'User' : 'ConnectiVita'}: ${msg.content}`
        ).join('\n');

        const schemeContext = schemes && schemes.schemes && schemes.schemes.length > 0
            ? `KNOWN ELIGIBLE SCHEMES: ${JSON.stringify(deepClean(schemes.schemes))}`
            : "No specific schemes checked yet. Encourage user to visit Schemes tab.";

        // Summarize recent updates
        const recentUpdates = updateHistory && updateHistory.length > 0
            ? updateHistory.slice(0, 3).map(u => `- ${u.date}: ${u.change_summary}`).join('\n')
            : "No recent updates recorded.";

        const prompt = `
            You are ConnectiVita, a warm, gentle, and supportive family assistant.
            
            CONTEXT:
            - Family Profile: ${safeStringifyProfile(profile)}
            - Current Life Stage: "${currentStage}"
            - Language: ${language}
            - Recent Life Changes:
            ${recentUpdates}
            
            ${schemeContext}

            CONVERSATION HISTORY:
            ${conversationHistory}
            
            USER QUESTION: "${lastUserMessage}"

            GUIDELINES:
            1. **Role**: You are a gentle family guide.
            2. **FORMATTING - STRICT**:
               - NO markdown symbols. NO asterisks (*), NO dashes (-), NO bullets.
               - Plain text paragraphs ONLY.
               - Max 3 short paragraphs.
               - Each paragraph max 2 sentences.
            
            3. **CONTENT - STRICT**:
               - NO scheme names. NO "PMMVY", "Ayushman Bharat", etc.
               - NO lists of benefits.
               - NO advice, instructions, or pressure words ("should", "must").
               - NO follow-up questions at the end.

            4. **Focus Area Explanations**:
               - If asking about a "focus area", explain why it matters based on the family profile.
               - Paragraph 1: Calm opening on why this matters now.
               - Paragraph 2: Relevance to the family situation.
               - Paragraph 3: Optional warm closing about routine/balance.

            5. **Output**: Respond ONLY in ${language}. Keep it natural, human, and symbol-free.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "I am here to help.";
    } catch (e) {
        console.error("Chat Error", e);
        return "I'm having trouble connecting right now. Please try again later.";
    }
}

export const generateChatTitle = async (message: string, language: AppLanguage): Promise<string> => {
    try {
        const prompt = `
            Summarize this user message into a very short chat title (max 4 words).
            Message: "${message}"
            Language: ${language}
            Output: Title only.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return (response.text || "New Chat").replace(/"/g, '').trim();
    } catch (e) {
        return "New Chat";
    }
}

export const generateWorkerInsight = async (data: string): Promise<string> => {
    try {
        const prompt = `
          Analyze this household context for a community worker:
          "${data}"
          
          Task: Provide one short, actionable insight or precaution (max 1 sentence).
      `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });

        return response.text || "Monitor situation.";
    } catch (e) {
        console.error("Worker Insight Error", e);
        return "Insight unavailable.";
    }
}
