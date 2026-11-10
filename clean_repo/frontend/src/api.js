import axios from "axios";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({ baseURL: BASE, timeout: 60000 });

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(new Error(err.response?.data?.error || err.message || "Something went wrong"))
);

export const uploadFile = (file, onProgress) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded / e.total) * 100)),
  });
};

export const analyzeData = (fileId, query, conversationHistory = []) =>
  api.post("/analyze", { fileId, query, conversationHistory });

export const deleteFile = (fileId) => api.delete(`/files/${fileId}`);
