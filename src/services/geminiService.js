import { GoogleGenAI } from "@google/genai";

let ai = null;
let chat = null;

try {
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  } else {
    console.error(
      "Gemini API key is not available. The AI assistant will be disabled."
    );
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

const initializeChat = () => {
  if (!ai) return;
  const systemInstruction = `You are Parky, a friendly and helpful AI assistant for the UrbPark application. 
    Your goal is to assist users with questions about finding parking, booking, payments, listing their own space, and troubleshooting issues.
    Be concise, clear, and maintain a positive and helpful tone.
    - Booking: A user finds a lot, books it, and gets a QR code.
    - Cancellation Policy: They get a notification after 30 mins if not arrived. The booking is automatically cancelled after 1 hour of no-show.
    - Payment: Prepaid or Pay-as-you-go at the lot.
    - Listing a space: Users can submit a form to list their own parking space, which is then reviewed by an admin.
    Do not provide information outside of the scope of the UrbPark application.`;

  chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction,
      temperature: 0.7,
      topP: 0.9,
    },
    // The thinking config is omitted to use default high-quality reasoning
  });
};

export const getBotResponseStream = async function* (history, newMessage) {
  if (!ai) {
    yield "Sorry, the AI assistant is currently unavailable due to a configuration issue.";
    return;
  }

  if (!chat) {
    initializeChat();
  }

  try {
    const response = await chat.sendMessageStream({ message: newMessage });
    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error fetching bot response:", error);
    yield "I'm having trouble connecting right now. Please try again later.";
    // Reset chat on error
    chat = null;
  }
};
