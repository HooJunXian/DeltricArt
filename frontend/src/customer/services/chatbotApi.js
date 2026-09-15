import api from "../../api";

export const sendChatbotMessage = (message, conversationId = null) =>
  api.post("/api/chatbot/", {
    message,
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
