import React, { useEffect, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      loginWithToken(token).then(() => {
        navigate("/");
      });
    } else {
      navigate("/login");
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Authenticating...</h2>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }}></div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
}
