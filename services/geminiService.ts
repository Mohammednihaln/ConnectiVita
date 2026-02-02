
import { GoogleGenAI, Type } from "@google/genai";
import { LifeStageUpdate, CitizenProfile, ChatMessage, SchemeAnalysisResult, AppLanguage, Scheme, DetectedProfileUpdate, FocusAreaContent, SnapshotUpdateEntry } from "../types";

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
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (seen.has(obj)) {
        return '[Circular]';
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
        return obj.map(item => deepClean(item, seen));
    }

    const cleaned: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
             cleaned[key] = deepClean(obj[key], seen);
        }
    }
    return cleaned;
};

const safeStringifyProfile = (profile: CitizenProfile) => {
    try {
        const cleanProfile = {
            primaryUser: profile.primaryUser,
            spouse: profile.spouse,
            children: profile.children,
            parents: profile.parents,
            siblings: profile.siblings,
            socialCategory: profile.socialCategory,
            // Fallbacks/Derived
            summaryState: profile.state || profile.primaryUser?.state,
            summaryLivelihood: profile.livelihood || profile.primaryUser?.occupation,
            totalMembers: profile.memberCount
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

        // IMPORTANT: Do NOT use responseSchema here. 
        // The CitizenProfile object is too complex/nested for strict API schema validation rules (requires all objects to have properties).
        // We rely on responseMimeType: "application/json" and the prompt's schema description.
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

    // IMPORTANT: No strict schema for this function either, to allow flexibility in profileUpdates.
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
            
            Task: Identify government schemes (India context) relevant to this family.
            
            Rules:
            1. Use the provided profile data strictly (Age, Gender, Income, Caste, Employment, State).
            2. EXCLUDE government employees unless specific schemes apply to them.
            3. "beneficiary" field MUST specify the Member Name/Role AND Age (e.g. "Mother (62)", "You (35)").
            4. Return 'eligible' with a list of schemes.
            5. Do NOT make up schemes. Use real, well-known schemes (PMMVY, Janani Suraksha, PM KISAN, PM Vishwakarma, Ayushman Bharat, etc).
            6. LIMIT: Maximum 3-4 schemes per beneficiary.
            7. "eligibilityReason": Plain language explanation starting with "Suggested because...".
            8. Translate Name, Description, Reason, Benefits, Beneficiary into ${language}.
            9. "category" MUST be one of: 'Health', 'Education', 'Pension', 'Livelihood', 'Housing', 'Other'.
            
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
                       "category": "Health"
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
                                    category: { type: Type.STRING, enum: ['Health', 'Education', 'Pension', 'Livelihood', 'Housing', 'Other'] }
                                }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text) as SchemeAnalysisResult;

    } catch (e) {
        console.error("Scheme Check Error", e);
        return { status: 'no_schemes_found' };
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
                                health: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, shortDescription: {type: Type.STRING}, whyItMatters: {type: Type.STRING} } },
                                education: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, shortDescription: {type: Type.STRING}, whyItMatters: {type: Type.STRING} } },
                                livelihood: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, shortDescription: {type: Type.STRING}, whyItMatters: {type: Type.STRING} } },
                                support: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, shortDescription: {type: Type.STRING}, whyItMatters: {type: Type.STRING} } }
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

export const generateChatTitle = async (firstMessage: string, language: AppLanguage): Promise<string> => {
    try {
        const prompt = `
            Generate a short, friendly title (max 4 words) for a chat that starts with: "${firstMessage}".
            Language: ${language}.
            Do not use quotes.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text?.trim() || "New Conversation";
    } catch (e) {
        return "Conversation";
    }
}

export const getFamilyContextChatResponse = async (
    profile: CitizenProfile,
    currentStage: string,
    needs: string[],
    history: ChatMessage[],
    lastUserMessage: string,
    language: AppLanguage,
    schemes?: Scheme[],
    updateHistory?: SnapshotUpdateEntry[]
): Promise<string> => {
    try {
         const conversationHistory = history.map(msg => 
            `${msg.role === 'user' ? 'User' : 'ConnectiVita'}: ${msg.content}`
         ).join('\n');

         const schemeContext = schemes && schemes.length > 0 
            ? `KNOWN ELIGIBLE SCHEMES: ${JSON.stringify(deepClean(schemes))}` 
            : "No specific schemes checked yet. Use general knowledge based on profile.";

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

            INSTRUCTIONS:
            1. Answer the user's question with a calm, friendly tone.
            2. If specific schemes are listed in CONTEXT, use them to answer questions about eligibility. Explain WHY they are eligible (e.g. "Because your mother is 62 years old...").
            3. If no schemes are listed, give general advice but suggest they visit the "Schemes" tab for a personalized check.
            4. Be non-authoritative. Use phrases like "You might be eligible for...", "This could help with...".
            5. Keep answers concise, simple and easy to read.
            6. LANGUAGE: Respond ONLY in ${language}.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "I am here to help.";
    } catch (e) {
        return "System offline.";
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
