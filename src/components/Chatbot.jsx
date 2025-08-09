import React, { useState, useRef, useEffect } from "react";
import { getBotResponseStream } from "../services/geminiService";
import { ICONS } from "../constants";
import { useNavigate } from "react-router-dom";

const Chatbot = () => {
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "initial",
          text: "Hello! I am Parky, your AI assistant. How can I help you today?",
          sender: "bot",
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const toTitleCaseSingleWord = (word) => {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  const extractBookingIntent = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (!lower.includes("book") || !lower.includes("ticket")) return null;

    // Try to extract city after "for" up to "on"/"from"/end
    let city = null;
    const forMatch = /\bfor\s+([^,\n]+?)(?:\s+on|\s+from|\.|,|$)/i.exec(text);
    if (forMatch && forMatch[1]) {
      city = forMatch[1].trim();
      // Keep only first word for city name for safety
      city = city.split(/\s+/)[0];
      city = toTitleCaseSingleWord(city);
    }

    // Extract date (YYYY-MM-DD) if present
    let dateStr = null;
    const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(text);
    if (dateMatch) {
      dateStr = dateMatch[1];
    }

    // Extract time range: from HH:MM to HH:MM (24h or 12h with am/pm)
    let startTimeStr = null;
    let endTimeStr = null;
    const timeRangeMatch = /from\s+([0-2]?\d(?::\d{2})?\s*(?:am|pm)?)\s+to\s+([0-2]?\d(?::\d{2})?\s*(?:am|pm)?)/i.exec(
      text
    );
    if (timeRangeMatch) {
      startTimeStr = timeRangeMatch[1].toLowerCase();
      endTimeStr = timeRangeMatch[2].toLowerCase();
    }

    if (!city) return null;

    // Build ISO start/end using today if date missing
    const baseDate = dateStr ? new Date(dateStr) : new Date();
    const to24h = (t) => {
      if (!t) return null;
      const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(t.trim());
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const ampm = m[3];
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      return { h, min };
    };

    let startISO = null;
    let endISO = null;
    if (startTimeStr && endTimeStr) {
      const s = to24h(startTimeStr);
      const e = to24h(endTimeStr);
      if (s && e) {
        const start = new Date(baseDate);
        start.setHours(s.h, s.min, 0, 0);
        const end = new Date(baseDate);
        end.setHours(e.h, e.min, 0, 0);
        if (end <= start) {
          // If end before start, assume end is next day
          end.setDate(end.getDate() + 1);
        }
        startISO = start.toISOString();
        endISO = end.toISOString();
      }
    }

    return {
      city,
      startISO,
      endISO,
    };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: botMessageId, text: "", sender: "bot" },
    ]);

    // Try to detect booking intent and navigate
    try {
      const intent = extractBookingIntent(input);
      if (intent && intent.city) {
        const params = new URLSearchParams();
        params.set("city", intent.city);
        if (intent.startISO && intent.endISO) {
          params.set("start", intent.startISO);
          params.set("end", intent.endISO);
        }
        navigate(`/find?${params.toString()}`);
      }
    } catch (_) {
      // ignore intent parse errors
    }

    let fullResponse = "";
    try {
      const stream = getBotResponseStream(messages, input);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat stream error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, text: "Sorry, an error occurred." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110 z-50"
        aria-label="Open Chat"
      >
        {ICONS.CHAT}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 w-full max-w-sm h-full max-h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-40">
          <header className="bg-green-600 text-white p-4 flex justify-between items-center rounded-t-lg">
            <h3 className="font-bold">Chat with Parky</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-yellow-300"
            >
              &times;
            </button>
          </header>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex my-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-xs ${
                    msg.sender === "user"
                      ? "bg-yellow-500 text-gray-900"
                      : "bg-gray-200"
                  }`}
                >
                  {msg.sender === "bot" && msg.text === "" ? (
                    <div className="flex items-center justify-center space-x-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></span>
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t">
            <div className="flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 p-2 border rounded-l-lg focus:ring-green-600 focus:border-green-600"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-r-lg hover:bg-green-700 disabled:bg-gray-400"
                disabled={isLoading || !input.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
