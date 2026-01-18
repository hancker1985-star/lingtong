
import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const suggestAvatarPersona = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Analyze this image and provide a 3-word creative persona or title for this avatar (e.g., 'Modern Tech Visionary'). Respond with ONLY the 3 words." },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Image.split(',')[1]
              }
            }
          ]
        }
      ]
    });

    return response.text || "Unique Identity";
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Profile Avatar";
  }
};

/**
 * Uses Gemini to fill in gaps (outpaint) when the image scale causes empty spaces in the circle.
 */
export const outpaintAvatar = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          parts: [
            { text: "This is a circular profile avatar with some empty or transparent background areas due to zooming out. Please fill the entire square 800x800 area by extending the existing image background and subjects seamlessly. Ensure the final result is a complete, high-quality image that fills the whole frame without any missing parts or gaps." },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Image.split(',')[1]
              }
            }
          ]
        }
      ]
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from Gemini");
  } catch (error) {
    console.error("Gemini Outpainting error:", error);
    throw error;
  }
};

/**
 * Uses Gemini to enhance and sharpen the image quality.
 */
export const enhanceImageQuality = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          parts: [
            { text: "Please enhance the quality of this image. Increase sharpness, refine details, and improve color balance while maintaining the original subject and composition. Return a high-definition version of this circular avatar." },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Image.split(',')[1]
              }
            }
          ]
        }
      ]
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No enhanced image data returned");
  } catch (error) {
    console.error("Gemini Enhancement error:", error);
    throw error;
  }
};
