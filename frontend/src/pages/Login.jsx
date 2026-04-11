import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // SUCCESS: Doctor dashboard (Protected Route) ki pampali
      // Manam App.jsx lo pettina route "/doctor-admin" kabatti ikkada adhe vaduthunnam
      navigate("/doctor-admin");
      
    } catch (error) {
      alert("❌ Login Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const containerStyle = {
    maxWidth: "400px",
    margin: "80px auto",
    padding: "30px",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    fontFamily: "sans-serif",
    textAlign: "center",
    border: "1px solid #e5e7eb"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
    color: "#000"
  };

  const buttonStyle = {
    width: "100%",
    padding: "14px",
    marginTop: "20px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s",
    opacity: loading ? 0.7 : 1
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ color: "#1e293b", margin: "0", fontSize: "28px", fontWeight: "800" }}>🏥 SETURA</h1>
        <p style={{ color: "#64748b", marginTop: "5px", fontWeight: "500" }}>Staff & Doctor Portal</p>
      </div>

      <form onSubmit={handleLogin}>
        <div style={{ textAlign: "left", marginBottom: "5px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Email Address</label>
        </div>
        <input 
          type="email" 
          placeholder="doctor@hospital.com" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          style={inputStyle} 
          required 
        />

        <div style={{ textAlign: "left", marginBottom: "5px", marginTop: "10px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Password</label>
        </div>
        <input 
          type="password" 
          placeholder="••••••••" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          style={inputStyle} 
          required 
        />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Authenticating..." : "Login to Dashboard"}
        </button>
      </form>

      <div style={{ marginTop: "25px", fontSize: "12px", color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: "15px" }}>
        Narsapur Digital Healthcare Initiative<br/>
        <b>Admin Access Only</b>
      </div>
    </div>
  );
}