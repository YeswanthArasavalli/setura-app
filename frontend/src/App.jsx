import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Hospitals from "./pages/Hospitals";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

// Navigation Logic: UI ని ప్రొఫెషనల్ గా ఉంచడానికి
function Navigation({ user, handleLogout }) {
  const location = useLocation();
  // Doctor Dashboard లో ఉన్నప్పుడు క్లీన్ లుక్ కోసం నవ్ బార్ ని హైడ్ చేస్తున్నాం
  const isDoctorPage = location.pathname.startsWith("/doctor-admin");

  if (isDoctorPage) return null;

  return (
    <nav style={{ 
      padding: "15px", backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0", 
      display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" 
    }}>
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#2563eb", fontWeight: "bold", fontSize: "18px" }}>
          🏠 SETURA Patient Portal
        </Link>
        {!user ? (
          <Link to="/login" style={{ textDecoration: "none", color: "#64748b", fontSize: "14px", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: "6px" }}>
            Doctor Login
          </Link>
        ) : (
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
            Logout (నిష్క్రమించు)
          </button>
        )}
      </div>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: "11px" }}>Narsapur Digital Healthcare Initiative</p>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. App లోడ్ అవ్వగానే పాత సెషన్ ఉందో లేదో చూడు
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // 2. లాగిన్ లేదా లాగౌట్ జరిగినప్పుడు వెంటనే యూజర్ స్టేట్ మార్చు
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      setUser(null);
      // Vercel లో సెషన్ క్లియర్ అవ్వడానికి హార్డ్ రీడైరెక్ట్ ఉత్తమం
      window.location.href = "/login";
    }
  };

  // సెషన్ చెక్ చేసే వరకు లోడింగ్ స్క్రీన్
  if (loading) return (
    <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#2563eb" }}>🏥 SETURA</h2>
      <p>🛡️ సెక్యూర్డ్ కనెక్షన్... లోడ్ అవుతోంది!</p>
    </div>
  );

  return (
    <Router>
      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b" }}>
        
        <Navigation user={user} handleLogout={handleLogout} />

        <div style={{ padding: "10px", maxWidth: "800px", margin: "0 auto" }}>
          <Routes>
            {/* Public: Patient Portal */}
            <Route path="/" element={<Hospitals />} />

            {/* ఇప్పటికే లాగిన్ అయ్యుంటే లాగిన్ పేజీ నుంచి డాష్‌బోర్డ్ కి పంపిస్తుంది */}
            <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/doctor-admin" replace />} />

            {/* Protected: Doctor Dashboard (లాగిన్ అయితేనే కనిపిస్తుంది) */}
            <Route 
              path="/doctor-admin" 
              element={user ? <Admin user={user} /> : <Navigate to="/login" replace />} 
            />

            {/* 404: వేరే ఏదైనా URL కొడితే హోమ్ కి వెళ్తుంది */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <footer style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8", fontSize: "12px", marginTop: "20px" }}>
          <p>© 2026 SETURA Systems - Narsapur</p>
          <p style={{ fontWeight: "500" }}>Empowering Local Healthcare with Big Data</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;