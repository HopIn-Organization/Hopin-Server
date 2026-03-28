import { GoogleGenerativeAI } from '@google/generative-ai';

export interface OnboardingTask {
  order: number;
  title: string;
  description: string;
  estimatedDays: number;
}

interface GeminiResponse {
  tasks: OnboardingTask[];
}

const MODEL_NAME = 'gemini-1.5-flash';

export class LLMService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateOnboardingTasks(prompt: string): Promise<OnboardingTask[]> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed: GeminiResponse = JSON.parse(text);

    if (!Array.isArray(parsed.tasks)) {
      throw new Error('Unexpected response structure from Gemini: missing tasks array');
    }

    return parsed.tasks;
  }
}
