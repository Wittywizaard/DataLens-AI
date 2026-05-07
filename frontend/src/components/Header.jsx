import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/Header.module.css";

export function Header() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          📊 DataLens AI
        </Link>
        
        {user && (
          <div className={styles.userSection}>
            <button
              className={styles.userButton}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              👤 {user.name}
            </button>
            
            {showDropdown && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownItem}>
                  <strong>Email:</strong> {user.email}
                </div>
                <div className={styles.dropdownItem}>
                  <strong>Files:</strong> {user.filesAnalyzed || 0}
                </div>
                <Link to="/users" className={styles.dropdownLink}>
                  👥 View All Users
                </Link>
                <button
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
