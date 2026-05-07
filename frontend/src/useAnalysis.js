import { useState, useCallback, useRef } from "react";
import { uploadFile, analyzeData, deleteFile } from "./api.js";

export default function useAnalysis() {
  const [fileInfo, setFileInfo]       = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [messages, setMessages]       = useState([]);
  const [analyzing, setAnalyzing]     = useState(false);
  const historyRef = useRef([]);

  const handleUpload = useCallback(async (file) => {
    setUploading(true); setUploadProgress(0); setMessages([]); historyRef.current = [];
    try {
      const data = await uploadFile(file, setUploadProgress);
      setFileInfo(data);
    } catch (err) {
      setMessages([{ role: "error", content: err.message, id: Date.now() }]);
    } finally { setUploading(false); setUploadProgress(0); }
  }, []);

  const handleQuery = useCallback(async (query) => {
    if (!fileInfo?.fileId) return;
    const id = Date.now();
    setMessages(prev => [...prev, { role: "user", content: query, id }]);
    setAnalyzing(true);
    try {
      const data = await analyzeData(fileInfo.fileId, query, historyRef.current);
      const aiId = Date.now();
      setMessages(prev => [...prev, { role: "assistant", result: data.result, id: aiId }]);
      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: query },
        { role: "assistant", content: JSON.stringify(data.result).slice(0, 300) },
      ].slice(-8);
    } catch (err) {
      setMessages(prev => [...prev, { role: "error", content: err.message, id: Date.now() }]);
    } finally { setAnalyzing(false); }
  }, [fileInfo]);

  const handleReset = useCallback(async () => {
    if (fileInfo?.fileId) { try { await deleteFile(fileInfo.fileId); } catch (_) {} }
    setFileInfo(null); setMessages([]); historyRef.current = [];
  }, [fileInfo]);

  return { fileInfo, uploading, uploadProgress, messages, analyzing, handleUpload, handleQuery, handleReset };
}
