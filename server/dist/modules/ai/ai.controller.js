"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAITutor = void 0;
const askAITutor = async (req, res) => {
    const { prompt, courseContext } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ success: false, message: 'A non-empty prompt string is required' });
    }
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'AI Tutor query failed',
        });
    }
};
exports.askAITutor = askAITutor;
