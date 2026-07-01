import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/Profile.module.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function Profile() {
  const { user, token, deleteAccount } = useAuth();
  const navigate = useNavigate();
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [analyses, setAnalyses] = useState([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  // Fetch saved analyses on mount
  useEffect(() => {
    if (!token) return;
    const fetchAnalyses = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/saved-analyses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalyses(res.data.analyses || []);
      } catch (err) {
        console.error("Failed to fetch saved analyses:", err);
      } finally {
        setLoadingAnalyses(false);
      }
    };
    fetchAnalyses();
  }, [token]);

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Please sign in to view your profile.</p>
          <button className={styles.backBtn} onClick={() => navigate("/")}>Go to Home</button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    const confirmation = confirm(
      "⚠️ WARNING: Are you absolutely sure you want to delete your account? This action is permanent and all your analyzed files and chat history will be deleted forever."
    );
    if (confirmation) {
      setLoading(true);
      setError("");
      try {
        await deleteAccount();
        navigate("/");
      } catch (err) {
        setError(err.response?.data?.error || "Failed to delete account. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLoadAnalysis = async (id) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/api/auth/saved-analyses/${id}/load`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const { success, messages, ...fileInfo } = res.data;
      if (success) {
        // Set values in sessionStorage so the Dashboard loads it immediately on initialization
        sessionStorage.setItem("datalens_fileId", fileInfo.fileId);
        sessionStorage.setItem("datalens_fileInfo", JSON.stringify(fileInfo));
        sessionStorage.setItem("datalens_messages", JSON.stringify(messages || []));
        
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load saved analysis session.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id, e) => {
    e.stopPropagation();
    const confirmation = confirm("Are you sure you want to delete this saved analysis?");
    if (!confirmation) return;

    try {
      await axios.delete(`${API_URL}/api/auth/saved-analyses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalyses(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete saved analysis.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className={styles.titleSection}>
            <h1>User Profile</h1>
            <p>Manage your account settings, data & saved analyses</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.grid}>
          {/* Left Column: Profile Info & Danger Zone */}
          <div>
            <div className={styles.sectionTitle}>👤 Account Information</div>
            <div className={styles.infoSection}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{user.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{user.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total Runs</span>
                <span className={styles.infoValue}>{user.filesAnalyzed || 0} files</span>
              </div>
              {user.createdAt && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Joined On</span>
                  <span className={styles.infoValue}>
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button 
                className={styles.backBtn} 
                onClick={() => navigate("/")}
                disabled={loading}
              >
                ← Back to Dashboard
              </button>
              <button 
                className={styles.deleteBtn} 
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Deleting Account..." : "❌ Delete Account"}
              </button>
            </div>
          </div>

          {/* Right Column: Saved Analyses History */}
          <div className={styles.historySection}>
            <div className={styles.sectionTitle}>💾 Saved Analyses ({analyses.length})</div>
            
            {loadingAnalyses ? (
              <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Loading saved sessions...
              </div>
            ) : analyses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📂</div>
                <div>No saved analyses yet</div>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
                  Upload a spreadsheet and click "Save Analysis" in the workspace to store your sessions permanently here!
                </p>
              </div>
            ) : (
              <div className={styles.historyList}>
                {analyses.map((item) => (
                  <div key={item._id} className={styles.historyItem}>
                    <div className={styles.itemMeta}>
                      <div className={styles.itemName} title={item.fileName}>
                        {item.fileName}
                      </div>
                      <div className={styles.itemDetails}>
                        <span>📊 {item.rowCount?.toLocaleString() || 0} rows</span>
                        <span>
                          📅{" "}
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.itemButtons}>
                      <button 
                        className={styles.loadBtn} 
                        onClick={() => handleLoadAnalysis(item._id)}
                        disabled={loading}
                      >
                        Load
                      </button>
                      <button 
                        className={styles.removeBtn} 
                        onClick={(e) => handleDeleteAnalysis(item._id, e)}
                        disabled={loading}
                        title="Delete saved session"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
