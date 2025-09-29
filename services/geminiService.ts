/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { WardrobeItem } from "../types";

const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = () => {
            reject(new Error(`Could not load image from URL. This may be a CORS issue. Check the browser console for more details.`));
        };
        image.src = url;
    });
};


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
1.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE the corresponding clothing item worn by the person in the 'model image' with the new garment. No part of the original clothing should be visible.
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
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it. The person, all clothing, and the background style must remain identical. The only change is the person's pose, which should now be: "${poseInstruction}". Return ONLY the final image.`;
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

export const getStyleSuggestion = async (imageUrl: string, context?: string): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    const prompt = `You are a fashion stylist. Look at the outfit on the person in the image. Suggest one single accessory or clothing item to add that would complement the look ${context || ''}. For example, 'a leather belt to define the waist' or 'white sneakers for a casual vibe'. Be concise. Your response should be a short phrase, no more than 15 words.`;
    
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

export const repatternGarment = async (baseImageUrl: string, garmentName: string, patternPrompt: string): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const prompt = `You are a fashion AI specializing in textile design. You will be given an image of a person wearing an outfit and a text prompt describing a new pattern. Your task is to find the garment named '${garmentName}' and seamlessly replace its current pattern/color with the new one described in the prompt: '${patternPrompt}'. IMPORTANT: Do not alter the person, their pose, the background, or any other clothing items. The lighting, shadows, and folds on the repatterned garment must look natural and consistent with the original image. Return ONLY the edited image.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [baseImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
}

export const getLookbookStory = async (imageUrl: string): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);
    const prompt = "You are a creative writer for a high-fashion magazine. Look at the person and their outfit in this image. Write a short, evocative \"lookbook\" description (2-3 sentences) that captures the mood and style of their ensemble. Be creative and descriptive.";
    
    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: [imagePart, { text: prompt }] },
    });
    
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Request was blocked: ${response.promptFeedback.blockReason}`);
    }
    
    const story = response.text;
    if (!story) {
      throw new Error('The AI model did not provide a story.');
    }
    return story;
};

export const cleanupGarmentImage = async (garmentFile: File): Promise<File> => {
    const garmentPart = await fileToPart(garmentFile);
    const prompt = `You are a photo editor for an e-commerce store. Your task is to take this image of a garment and prepare it for a product catalog. Isolate the main clothing item, removing any background, hangers, tags, or people. Correct the lighting to be bright and even. Place the cleaned-up garment on a pure white background (#FFFFFF). Return ONLY the edited image.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [garmentPart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    const dataUrl = handleApiResponse(response);
    return await urlToFile(dataUrl, `enhanced-${garmentFile.name}`);
};

export const generateBlendedGarment = async (item1: WardrobeItem, item2: WardrobeItem): Promise<File> => {
    const file1 = await urlToFile(item1.url, item1.name);
    const file2 = await urlToFile(item2.url, item2.name);
    
    const part1 = await fileToPart(file1);
    const part2 = await fileToPart(file2);

    const prompt = `You are an avant-garde AI fashion designer. You will be given two garment images. Your task is to invent a single, new clothing item that creatively fuses the core characteristics (style, fabric, pattern, silhouette) of both inputs. The result should be a novel, imaginative design. Present the final creation on a clean, neutral studio background. Return ONLY the image of the newly designed garment.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [part1, part2, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    const dataUrl = handleApiResponse(response);
    return await urlToFile(dataUrl, `blend-${item1.name}-${item2.name}.png`);
};