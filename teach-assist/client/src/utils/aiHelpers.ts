// src/utils/aiHelpers.ts

import { aiAxiosInstance } from "./axiosInstance";

/**
 * Improves the provided text using AI.
 * @param text - The original text to be improved.
 * @returns The improved text.
 * @throws Will throw an error if the AI request fails.
 */
export const improveText = async (text: string): Promise<string> => {
  try {
    const response = await aiAxiosInstance.post<{ improved_text: string }>(
      "/improve-text",
      { text }
    );
    return response.data.improved_text;
  } catch (error) {
    console.error("Error improving text:", error);
    throw error;
  }
};
