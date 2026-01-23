
import { GoogleGenAI, Type } from "@google/genai";
import { LifeStageUpdate, CitizenProfile, ChatMessage, SchemeAnalysisResult, AppLanguage, Scheme } from "../types";

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

const safeStringifyProfile = (profile: CitizenProfile) => {
    // Extract comprehensive profile data for AI context
    return JSON.stringify({
        primaryUser: profile.primaryUser,
        spouse: profile.spouse,
        children: profile.children,
        parents: profile.parents,
        siblings: profile.siblings,
        socialCategory: profile.socialCategory,
        // Fallbacks/Derived
        summaryState: profile.state || profile.primaryUser.state,
        summaryLivelihood: profile.livelihood || profile.primaryUser.occupation,
        totalMembers: profile.memberCount
    });
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
      1. Analyze this change. Determine the new life stage and top 3 support areas.
      2. Extract any factual profile updates implied by the user.
      
      Output JSON Schema:
      {
         currentStage: string (in ${language}),
         nextStagePrediction: string (in ${language}),
         immediateNeeds: string[] (in ${language}),
         explanation: string (in ${language}),
         journeySummary: string (in ${language}),
         profileUpdates: {
            // Keep generic as implementation handles deep merge if needed, 
            // but for now AI primarily updates summary fields or we rely on explicit flows
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
            nextStagePrediction: { type: Type.STRING },
            immediateNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
            explanation: { type: Type.STRING },
            journeySummary: { type: Type.STRING },
            profileUpdates: { type: Type.OBJECT, properties: {} } // Simplified for robustness
          }
        }
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
        const state = profile.state || profile.primaryUser.state;
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
            1. Use the provided profile data strictly.
            2. "beneficiary" field MUST specify who it is for AND their approximate age if known (e.g. "Mother (62)", "Child (5)", "You (35)").
            3. Return 'eligible' with a list of schemes.
            4. Do NOT make up schemes. Use real, well-known schemes (PMMVY, Janani Suraksha, PM KISAN, PM Vishwakarma, etc).
            5. LIMIT: Maximum 3-4 schemes per beneficiary.
            6. "eligibilityReason": Plain language explanation why they match (e.g. "Because she is above 60 and from rural area").
            7. Translate Name, Description, Reason, Benefits, Beneficiary into ${language}.
            
            Output JSON:
            {
               "status": "eligible" | "missing_info" | "no_schemes_found",
               "missingField": "residenceType" (only if needed),
               "missingFieldQuestion": "string" (polite question in ${language}),
               "schemes": [ { "name": "", "description": "", "eligibilityReason": "", "benefits": "", "beneficiary": "" } ]
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
                                    beneficiary: { type: Type.STRING }
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

            Task: Determine PRIMARY life stage, next predicted stage, top 3 needs, and explanation.
            
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
                        nextStagePrediction: { type: Type.STRING },
                        immediateNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        explanation: { type: Type.STRING },
                        journeySummary: { type: Type.STRING }
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
    needs: string[],
    history: ChatMessage[],
    lastUserMessage: string,
    language: AppLanguage,
    schemes?: Scheme[]
): Promise<string> => {
    try {
         const conversationHistory = history.map(msg => 
            `${msg.role === 'user' ? 'User' : 'ConnectiVita'}: ${msg.content}`
         ).join('\n');

         const schemeContext = schemes && schemes.length > 0 
            ? `KNOWN ELIGIBLE SCHEMES: ${JSON.stringify(schemes)}` 
            : "No specific schemes checked yet. Use general knowledge based on profile.";

         const prompt = `
            You are ConnectiVita, a warm, gentle, and supportive family assistant.
            
            CONTEXT:
            - Family Profile: ${safeStringifyProfile(profile)}
            - Current Life Stage: "${currentStage}"
            - Language: ${language}
            
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
