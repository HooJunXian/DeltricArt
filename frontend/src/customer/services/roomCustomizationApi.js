import api from "../../api";

export const listRoomCustomizations = () => api.get("/api/room-customizations/");

export const getRoomCustomization = (roomId) =>
  api.get(`/api/room-customizations/${roomId}/`);

export const getRoomCustomizationImage = (roomId) =>
  api.get(`/api/room-customizations/${roomId}/image/`, { responseType: "blob" });

export const createRoomCustomization = (formData) =>
  api.post("/api/room-customizations/", formData);

export const updateRoomCustomization = (roomId, formData) =>
  api.patch(`/api/room-customizations/${roomId}/`, formData);

export const deleteRoomCustomization = (roomId) =>
  api.delete(`/api/room-customizations/${roomId}/`);
