import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, X } from "lucide-react";

import dellaIcon from "../../assets/della_chatbot_icon.png";
import { ShopContext } from "../context/shop-context";
import { sendChatbotMessage } from "../services/chatbotApi";

const starterPrompts = [
  "推荐 RM1000 以下适合客厅的作品",
  "Compare suitable gift products",
  "有什么雕塑适合办公室？",
];

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi, I am Della, your personal art guide. You can ask me for product recommendations, comparisons, budget filters, or product questions.",
  products: [],
};

const ChatbotPanel = () => {
  const { formatMoney } = useContext(ShopContext);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, isOpen]);

  const submitMessage = async (messageText = input) => {
    const nextMessage = messageText.trim();
    if (!nextMessage || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: nextMessage,
      products: [],
    };
    setInput("");

    setLoading(true);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await sendChatbotMessage(nextMessage, conversationId);
      if (response.data.conversation_id) {
        setConversationId(response.data.conversation_id);
      }
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response.data.answer?.summary || response.data.reply,
        answer: response.data.answer || null,
        products: response.data.products || [],
      };
      setMessages((current) =>
        response.data.conversation_was_reset
          ? [welcomeMessage, userMessage, assistantMessage]
          : [...current, assistantMessage],
      );
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text:
            error.response?.data?.detail ||
            "I cannot reach the AI assistant right now. Please try again later.",
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
              <span className="grid h-9 w-9 place-items-center bg-[#f8f3e7]">
                <img className="h-8 w-8 object-contain" src={dellaIcon} alt="" />
              </span>
              <div>
                <p className="text-sm font-semibold">Della</p>
                <p className="text-xs text-stone-300">Your personal art guide</p>
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
        className={`ml-auto grid h-14 w-14 place-items-center rounded-full border shadow-[0_18px_45px_rgba(28,25,23,0.28)] transition duration-200 hover:scale-105 active:scale-95 ${
          isOpen
            ? "border-stone-950 bg-stone-950 text-white hover:bg-stone-800"
            : "border-[#18245d]/20 bg-[#f8f3e7] text-[#18245d] hover:bg-white"
        }`}
        onClick={() => setIsOpen((current) => !current)}
        aria-controls="deltricart-chatbot-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close shopping assistant" : "Open shopping assistant"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <img className="h-11 w-11 object-contain" src={dellaIcon} alt="" />
        )}
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
          {!isUser ? (
            <img className="mt-0.5 h-5 w-5 shrink-0 object-contain" src={dellaIcon} alt="" />
          ) : null}
          <div className="min-w-0">
            <p className="whitespace-pre-line">{message.text}</p>
            {message.answer?.details?.length ? (
              <dl className="mt-3 divide-y divide-stone-200 border-t border-stone-200">
                {message.answer.details.map((detail, index) => (
                  <ContactDetail key={`${detail.label}-${index}`} detail={detail} />
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        {message.products?.length ? (
          <div className="mt-3 grid gap-2">
            {message.products.map((product) => (
              <ChatProductCard
                key={product.id}
                product={product}
                formatMoney={formatMoney}
                reason={message.answer?.recommendations?.find(
                  (item) => item.product_id === product.id,
                )?.reason}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ContactDetail = ({ detail }) => {
  const href =
    detail.kind === "email"
      ? `mailto:${detail.value}`
      : detail.kind === "phone"
        ? `tel:${detail.value.replace(/[^\d+]/g, "")}`
        : null;

  return (
    <div className="py-2 first:pt-3 last:pb-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
        {detail.label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-stone-800">
        {href ? (
          <a className="underline decoration-stone-300 underline-offset-2 hover:text-stone-950" href={href}>
            {detail.value}
          </a>
        ) : (
          detail.value
        )}
      </dd>
    </div>
  );
};

const ChatProductCard = ({ product, formatMoney, reason }) => {
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
        {reason ? <p className="mt-1 text-xs leading-5 text-stone-600">{reason}</p> : null}
      </div>
    </Link>
  );
};

export default ChatbotPanel;
