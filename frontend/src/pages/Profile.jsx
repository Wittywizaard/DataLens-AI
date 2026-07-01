import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/Profile.module.css";

export function Profile() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className={styles.titleSection}>
            <h1>User Profile</h1>
            <p>Manage your account settings & data</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

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
            <span className={styles.infoLabel}>Files Analyzed</span>
            <span className={styles.infoValue}>{user.filesAnalyzed || 0} files</span>
          </div>
          {user.createdAt && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Account Created</span>
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
    </div>
  );
}
