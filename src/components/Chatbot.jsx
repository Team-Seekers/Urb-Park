import React, { useState, useRef, useEffect } from "react";
import { getBotResponseStream } from "../services/geminiService";
import { ICONS } from "../constants";

const Chatbot = () => {
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
