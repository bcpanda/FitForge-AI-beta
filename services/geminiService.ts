
import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is available from environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

const workoutPlanSchema = {
  type: Type.OBJECT,
  properties: {
    workout: {
      type: Type.ARRAY,
      description: "An array of exercises for the workout session.",
      items: {
        type: Type.OBJECT,
        properties: {
          exerciseName: {
            type: Type.STRING,
            description: "The name of the exercise.",
          },
          sets: {
            type: Type.INTEGER,
            description: "The number of sets.",
          },
          reps: {
            type: Type.STRING,
            description: "The target repetition range.",
          },
        },
        required: ["exerciseName", "sets", "reps"],
      },
    },
  },
  required: ["workout"],
};

const model = "gemini-2.5-flash";

/**
 * Generates a workout plan using the Gemini AI model from a text prompt.
 * @param goal The user's fitness goal (e.g., "build muscle", "lose fat").
 * @returns A JSON object representing the workout plan.
 */
export const generateWorkoutPlan = async (goal: string): Promise<any> => {
  const prompt = `
    You are an expert fitness coach. Your task is to create a structured workout plan for a single session based on the user's fitness goal.
    The response MUST be a JSON object that strictly adheres to the provided schema.
    The JSON object must contain a "workout" key, which is an array of exercise objects.
    Each exercise object must have "exerciseName" (string), "sets" (number), and "reps" (string, e.g., "8-12").
    The "workout" array must not be empty. It must contain at least one exercise. If you cannot generate a specific plan for the given goal, you must provide a generic, simple workout plan with at least one exercise, instead of an empty array.
    Do not include any introductory text, explanations, or markdown outside of the JSON object.

    User's Fitness Goal: "${goal}"
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: workoutPlanSchema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("AI returned an empty response.");
    }
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating workout plan from prompt:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate workout plan: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
};


/**
 * Generates a workout plan by parsing a PDF file using the Gemini AI model.
 * @param pdfBase64 The base64-encoded string of the PDF file.
 * @param transcribe If true, transcribe the workout exactly. Otherwise, generate a structured plan.
 * @returns A JSON object representing the workout plan.
 */
export const generateWorkoutPlanFromPdf = async (pdfBase64: string, transcribe: boolean = false): Promise<any> => {
  const pdfPart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: pdfBase64,
    },
  };

  const promptText = transcribe
    ? `
      You are a data extraction expert. Your task is to transcribe the workout plan from the provided PDF document.
      The response MUST be a JSON object and nothing else.
      The JSON object must have a "workout" key, which is an array of exercises.
      Each exercise object in the array should have three properties:
      1. "exerciseName" (string): The name of the exercise, transcribed as accurately as possible.
      2. "sets" (number): The number of sets to perform.
      3. "reps" (string): The suggested rep range or count (e.g., "8-12", "15", "To Failure"). Transcribe this exactly.
      Do not interpret, summarize, or create a new plan. Transcribe the information directly from the document. If the document is not a workout plan or is unreadable, return a JSON object with an empty "workout" array. Do not include any text, notes, or explanations outside of the JSON structure.
    `
    : `
      You are an expert fitness assistant. Your task is to analyze the provided PDF document, which contains a workout plan, and extract the exercises into a structured JSON format.
      The response MUST be a JSON object and nothing else.
      The JSON object should have a single key "workout", which is an array of exercises.
      Each exercise object in the array should have three properties:
      1. "exerciseName" (string): The name of the exercise.
      2. "sets" (number): The number of sets to perform.
      3. "reps" (string): The suggested rep range (e.g., "8-12", "15-20").
      Carefully parse the document to identify each exercise, its corresponding number of sets, and the repetition scheme. If the document is not a workout plan or is unreadable, return an empty "workout" array. Do not include any text, notes, or explanations outside of the JSON structure.
    `;

  const textPart = { text: promptText };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [textPart, pdfPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: workoutPlanSchema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("AI returned an empty response after parsing the PDF.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating workout plan from PDF:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to parse PDF and generate workout plan: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
};

/**
 * Generates a workout plan by parsing an image file using the Gemini AI model.
 * @param imageBase64 The base64-encoded string of the image file.
 * @param mimeType The MIME type of the image file.
 * @param transcribe If true, transcribe the workout exactly. Otherwise, generate a structured plan.
 * @returns A JSON object representing the workout plan.
 */
export const generateWorkoutPlanFromImage = async (imageBase64: string, mimeType: string, transcribe: boolean = false): Promise<any> => {
  const imagePart = {
    inlineData: {
      mimeType,
      data: imageBase64,
    },
  };

  const promptText = transcribe
    ? `
      You are a data extraction expert. Your task is to transcribe the workout plan from the provided image.
      The response MUST be a JSON object and nothing else.
      The JSON object must have a "workout" key, which is an array of exercises.
      Each exercise object in the array should have three properties:
      1. "exerciseName" (string): The name of the exercise, transcribed as accurately as possible.
      2. "sets" (number): The number of sets to perform.
      3. "reps" (string): The suggested rep range or count (e.g., "8-12", "15", "To Failure"). Transcribe this exactly.
      Do not interpret, summarize, or create a new plan. Transcribe the information directly from the image. If the image is not a workout plan or is unreadable, return a JSON object with an empty "workout" array. Do not include any text, notes, or explanations outside of the JSON structure.
    `
    : `
      You are an expert fitness assistant. Your task is to analyze the provided image, which contains a workout plan, and extract the exercises into a structured JSON format.
      The response MUST be a JSON object and nothing else.
      The JSON object should have a single key "workout", which is an array of exercises.
      Each exercise object in the array should have three properties:
      1. "exerciseName" (string): The name of the exercise.
      2. "sets" (number): The number of sets to perform.
      3. "reps" (string): The suggested rep range (e.g., "8-12", "15-20").
      Carefully parse the image to identify each exercise, its corresponding number of sets, and the repetition scheme. If the image is not a workout plan or is unreadable, return an empty "workout" array. Do not include any text, notes, or explanations outside of the JSON structure.
    `;

  const textPart = { text: promptText };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: workoutPlanSchema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("AI returned an empty response after parsing the image.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating workout plan from image:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to parse image and generate workout plan: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
};


/**
 * Generates a workout plan by analyzing a YouTube video URL using the Gemini AI model.
 * @param videoUrl The URL of the YouTube workout video.
 * @param transcribe If true, transcribe the workout exactly. Otherwise, generate a structured plan.
 * @returns A JSON object representing the workout plan.
 */
export const generateWorkoutPlanFromVideoUrl = async (videoUrl: string, transcribe: boolean = false): Promise<any> => {
  const prompt = transcribe
    ? `
      You are a data extraction expert. Your task is to transcribe the workout plan from the provided YouTube video URL using your search capabilities.
      The response MUST be a JSON object and nothing else. Do not include any markdown, introductory text, or explanations outside of the JSON object itself.
      The JSON object should have a single key "workout", which is an array of exercises.
      Each exercise object in the array should have three properties:
      1. "exerciseName" (string): The name of the exercise, transcribed as accurately as possible from the video's title, description, or transcript.
      2. "sets" (number): The number of sets to perform.
      3. "reps" (string): The suggested rep range or count (e.g., "8-12", "15-20", "30 seconds"). Transcribe this exactly.
      Do not interpret, summarize, or create a new plan. Transcribe the information directly from the video's content. If it's not a workout video or you cannot determine a clear plan, return a JSON with an empty "workout" array.

      YouTube URL: "${videoUrl}"
    `
    : `
      You are an expert fitness coach. Your task is to analyze the content of the workout video from the provided YouTube URL using your search capabilities and create a structured workout plan.
      The response MUST be a JSON object and nothing else. Do not include any markdown, introductory text, or explanations outside of the JSON object itself.
      The JSON object should have a single key "workout", which is an array of exercises.
      Each exercise object in the array should have three properties:
      1. "exerciseName" (string): The name of the exercise.
      2. "sets" (number): The number of sets to perform.
      3. "reps" (string): The suggested rep range (e.g., "8-12", "15-20").

      Analyze the video's content (title, description, available transcript) to identify the exercises.
      If the video is not a workout video or you cannot determine a clear plan from the available information, return a JSON with an empty "workout" array.

      YouTube URL: "${videoUrl}"
    `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    let jsonString = '';
    
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);

    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonString = jsonBlockMatch[1];
    } else {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonString = text.substring(firstBrace, lastBrace + 1);
      } else {
        // Fallback for when the model returns just the JSON object as a string.
        jsonString = text;
      }
    }

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from AI response. Raw text:", text);
      throw new Error("AI returned a response, but it was not in the expected JSON format.");
    }
  } catch (error) {
    console.error("Error generating workout plan from video URL:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate workout plan from video: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
};

/**
 * Fetches details for a YouTube video using its URL.
 * @param videoUrl The URL of the YouTube video.
 * @returns A JSON object with video details.
 */
export const getYouTubeVideoDetails = async (videoUrl: string): Promise<{ title: string; channel: string; description: string; }> => {
    const prompt = `
    Based on the YouTube URL provided, find the video's title, the channel name, and a brief description (around 3-4 sentences).
    Respond ONLY with a single JSON object containing three keys: "title", "channel", and "description".
    Do not include any markdown, introductory text, or explanations outside of the JSON object itself.
    If you cannot find the details, return a JSON object with empty strings for the values.

    YouTube URL: "${videoUrl}"
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    let jsonString = '';
    
    // Logic to extract JSON from the response text
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);

    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonString = jsonBlockMatch[1];
    } else {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonString = text.substring(firstBrace, lastBrace + 1);
      } else {
        jsonString = text;
      }
    }

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from AI response for video details. Raw text:", text);
      throw new Error("AI returned video details in an unexpected format.");
    }
  } catch (error) {
    console.error("Error fetching YouTube video details:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to fetch video details: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching video details.");
  }
};

/**
 * Generates a new lifestyle challenge using the Gemini AI model.
 * @param existingChallenges An array of current challenges to avoid duplicates.
 * @returns A string with the new challenge.
 */
export const generateLifestyleChallenge = async (existingChallenges: string[]): Promise<string> => {
  const prompt = `
    You are a wellness and motivation coach.
    Generate a single, concise, and actionable lifestyle challenge for today.
    The challenge should be healthy and positive. Examples: "Take a 15-minute walk during your lunch break.", "Try a 5-minute meditation session.", "Drink a full glass of water first thing in the morning."
    Do not repeat any of the challenges from this list: ${JSON.stringify(existingChallenges)}.
    
    Respond with ONLY the text of the new challenge, and nothing else. No introductory text, no quotes, just the challenge. The response must be a single sentence.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    
    const text = response.text.trim();
    if (!text) {
        throw new Error("AI returned an empty response for the lifestyle challenge.");
    }
    // Remove potential quotes from the response
    return text.replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating lifestyle challenge:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate lifestyle challenge: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI for a new challenge.");
  }
};
