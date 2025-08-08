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
    
    - Searching: Users can search for parking arenas using various filters or find nearby parking within a 5 km radius.
    - Booking: A user can book a parking slot up to one month in advance, gets a QR code e-ticket, and can manage it on their profile page.
    - Entry/Exit: Entry to a parking lot is granted by an automatic number plate extraction system. Users must enter within their allotted time or within a 15-minute grace period. Upon exit, a confirmation is required. If a car is not taken back, the system will alert the nearby police station.
    - Cancellation Policy: A user gets a notification if they haven't arrived after 30 minutes, and the booking is automatically cancelled after 1 hour of no-show.
    - Payment: Payments are secure, handled through the Razorpay gateway. Users can choose prepaid or pay-as-you-go options at the lot.
    - Listing a space: Users can submit a form to list their own parking space, which is then reviewed by an admin.
    - Alerts: Users will be notified via web or email if they park in the wrong slot.
    
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
