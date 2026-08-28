import api from "../../api";

export const sendChatbotMessage = (message) =>
  api.post("/api/chatbot/", { message });
