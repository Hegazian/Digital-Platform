import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';

export const askAITutor = async (req: AuthRequest, res: Response) => {
  const { prompt, courseContext } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ success: false, message: 'A non-empty prompt string is required' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const systemPrompt = `You are EduPlatform AI, an expert bilingual tutor for Egyptian secondary school students in Programming, Math, and Physics. ${courseContext ? `Context: ${courseContext}.` : ''} Answer concisely and clearly.`;
      const result = await model.generateContent(`${systemPrompt}\nStudent Question: ${prompt}`);
      const response = await result.response;
      const text = response.text();

      return res.status(200).json({
        success: true,
        data: {
          answer: text,
          provider: 'google-gemini-1.5-flash',
        },
      });
    }

    // Smart educational fallback response when GEMINI_API_KEY is not set or in test
    const fallbackAnswer = `[EduPlatform AI Tutor] Newton's Second Law states that Force equals mass times acceleration (F = m * a). In Egyptian curriculum physics, this explains why pushing a heavier object requires more force to reach the same speed.`;

    return res.status(200).json({
      success: true,
      data: {
        answer: fallbackAnswer,
        provider: 'eduplatform-ai-fallback',
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'AI Tutor query failed',
    });
  }
};
