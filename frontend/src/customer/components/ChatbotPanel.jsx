import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";

import { ShopContext } from "../context/shop-context";
import { sendChatbotMessage } from "../services/chatbotApi";

const starterPrompts = [
  "推荐 RM300 以下适合客厅的作品",
  "Compare suitable gift products",
  "有什么雕塑适合办公室？",
];

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi, I am DeltricArt's shopping assistant. You can ask me for product recommendations, comparisons, budget filters, or product questions.",
  products: [],
};

const ChatbotPanel = () => {
  const { authLoading, formatMoney, user } = useContext(ShopContext);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, isOpen]);

  if (authLoading || !user) {
    return null;
  }

  const submitMessage = async (messageText = input) => {
    const nextMessage = messageText.trim();
    if (!nextMessage || loading) return;

    setInput("");

    setLoading(true);
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: nextMessage,
        products: [],
      },
    ]);

    try {
      const response = await sendChatbotMessage(nextMessage);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: response.data.reply,
          products: response.data.products || [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text:
            error.response?.data?.detail ||
            "I cannot reach the AI assistant right now. Please make sure Ollama is running.",
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-4 z-[70] sm:right-6">
      <section
        id="deltricart-chatbot-panel"
        className={`mb-3 grid w-[calc(100vw-2rem)] max-w-md transform-gpu overflow-hidden border border-stone-200 bg-white shadow-[0_24px_70px_rgba(28,25,23,0.22)] transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
          isOpen
            ? "grid-rows-[1fr] translate-y-0 scale-100 opacity-100"
            : "pointer-events-none grid-rows-[0fr] translate-y-4 scale-95 opacity-0"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex h-[min(680px,calc(100vh-7rem))] flex-col">
          <header className="flex items-center justify-between border-b border-stone-200 bg-stone-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center bg-white text-stone-950">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold">DeltricArt Assistant</p>
                <p className="text-xs text-stone-300">Powered by Qwen3:8b</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center text-stone-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-stone-50 px-4 py-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  formatMoney={formatMoney}
                />
              ))}
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              ) : null}
              <div ref={scrollRef} />
            </div>
          </div>

          <div className="border-t border-stone-200 bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="shrink-0 border border-stone-200 px-3 py-2 text-xs text-stone-600 transition hover:border-stone-950 hover:text-stone-950"
                  onClick={() => submitMessage(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage();
              }}
            >
              <input
                className="min-w-0 flex-1 border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-stone-950"
                placeholder="Ask about products, budget, gifts, or comparison..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                type="submit"
                className="grid h-10 w-10 place-items-center bg-stone-950 text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-stone-950 text-white shadow-[0_18px_45px_rgba(28,25,23,0.28)] transition duration-200 hover:scale-105 hover:bg-stone-800 active:scale-95"
        onClick={() => setIsOpen((current) => !current)}
        aria-controls="deltricart-chatbot-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close shopping assistant" : "Open shopping assistant"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

const ChatMessage = ({ message, formatMoney }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={`inline-flex gap-2 px-3 py-2 text-sm leading-6 ${
            isUser
              ? "bg-stone-950 text-white"
              : "border border-stone-200 bg-white text-stone-800"
          }`}
        >
          {!isUser ? <Bot className="mt-1 h-4 w-4 shrink-0 text-stone-500" /> : null}
          <p className="whitespace-pre-line">{message.text}</p>
        </div>

        {message.products?.length ? (
          <div className="mt-3 grid gap-2">
            {message.products.map((product) => (
              <ChatProductCard
                key={product.id}
                product={product}
                formatMoney={formatMoney}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ChatProductCard = ({ product, formatMoney }) => {
  const image = product.image || product.images?.[0];

  return (
    <Link
      to={`/product/${product.id}`}
      className="grid grid-cols-[72px_1fr] gap-3 border border-stone-200 bg-white p-2 text-left transition hover:border-stone-950"
    >
      <div className="aspect-square overflow-hidden bg-stone-100">
        {image ? (
          <img alt={product.name} className="h-full w-full object-cover" src={image} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-stone-400">No image</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-semibold text-stone-950">{product.name}</p>
        <p className="mt-1 line-clamp-1 text-xs text-stone-500">
          {product.category_path || product.category_name || "Artwork"}
        </p>
        <p className="mt-2 text-sm font-semibold text-stone-950">
          {formatMoney ? formatMoney(product.price) : `RM${product.price}`}
        </p>
      </div>
    </Link>
  );
};

export default ChatbotPanel;
