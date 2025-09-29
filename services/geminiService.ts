/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';


export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert photo editor. Your task is to isolate the person in this image and place them on a clean, neutral studio backdrop (light gray, #f0f0f0). Do NOT change the person's appearance, clothing, or pose. The final image should be photorealistic and centered. If the original image is not a full-body shot, create a well-composed portrait. Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    const prompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.

**Crucial Rules:**
1.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE the clothing item worn by the person in the 'model image' with the new garment. No part of the original clothing (e.g., collars, sleeves, patterns) should be visible in the final image.
2.  **Preserve the Model:** The person's face, hair, body shape, and pose from the 'model image' MUST remain unchanged.
3.  **Preserve the Background:** The entire background from the 'model image' MUST be preserved perfectly.
4.  **Apply the Garment:** Realistically fit the new garment onto the person. It should adapt to their pose with natural folds, shadows, and lighting consistent with the original scene.
5.  **Output:** Return ONLY the final, edited image. Do not include any text.`;
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The person, clothing, and background style must remain identical. The new perspective should be: "${poseInstruction}". Return ONLY the final image.`;
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateBackground = async (baseImageUrl: string, prompt: string): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const fullPrompt = `You are a professional photo editor. Your task is to seamlessly change the background of the provided image. The subject (person and their clothing) must remain completely unchanged, including their lighting and shadows. The new background should be photorealistic and match this description: "${prompt}". Return ONLY the edited image.`;
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [baseImagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const getStyleSuggestion = async (imageUrl: string): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    const prompt = "You are a fashion stylist. Look at the outfit on the person in the image. Suggest one single accessory or clothing item to add that would complement the look. For example, 'a leather belt to define the waist' or 'white sneakers for a casual vibe'. Be concise. Your response should be a short phrase, no more than 15 words.";
    
    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: [imagePart, { text: prompt }] },
    });
    
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }
    
    const suggestion = response.text;
    if (!suggestion) {
      throw new Error('The AI model did not provide a style suggestion.');
    }
    return suggestion;
};

export const getColorPalette = async (imageUrl: string): Promise<string[]> => {
    const imagePart = dataUrlToPart(imageUrl);
    const prompt = "Analyze the colors of the outfit worn by the person in this image. Extract the 5 most dominant and complementary colors from their clothing. Return them as an array of hex color codes in a JSON object.";

    const response = await ai.models.generateContent({
        model: textModel,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    colors: {
                        type: Type.ARRAY,
                        description: 'An array of 5 hex color codes representing the outfit palette.',
                        items: { type: Type.STRING }
                    }
                },
                required: ['colors']
            }
        }
    });
    
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }
    
    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("The AI model did not return a color palette.");
    }
    
    try {
        const result = JSON.parse(jsonText);
        if (result.colors && Array.isArray(result.colors) && result.colors.length > 0) {
            return result.colors;
        }
        throw new Error("Invalid format for color palette from AI.");
    } catch (e) {
        console.error("Failed to parse color palette JSON:", jsonText, e);
        throw new Error("The AI model returned a malformed color palette.");
    }
};

const PHOTOSHOOT_PROMPTS = [
    "Recreate this image in a cinematic, street style photo taken in Tokyo at night, with vibrant neon lights blurring in the background.",
    "Recreate this image as a high-fashion editorial shot. The model should be in a minimalist, brutalist architectural setting with dramatic shadows.",
    "Recreate this image as a candid, joyful lifestyle photo. The model should be laughing, set against a vibrant, colorful mural in a sunny, urban park.",
];

export const generatePhotoshoot = async (baseImageUrl: string): Promise<string[]> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);

    const photoshootPromises = PHOTOSHOOT_PROMPTS.map(prompt => {
        const fullPrompt = `You are an expert creative director and photographer AI. Your task is to completely reimagine the provided image based on a creative brief. The person and their clothing must remain the same, but you will change their pose, expression, and the entire background to fit the new scene. The lighting should be adjusted to be consistent with the new environment. The creative brief is: "${prompt}". Return ONLY the final, edited image.`;

        return ai.models.generateContent({
            model: imageModel,
            contents: { parts: [baseImagePart, { text: fullPrompt }] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        }).then(handleApiResponse);
    });

    return Promise.all(photoshootPromises);
};
