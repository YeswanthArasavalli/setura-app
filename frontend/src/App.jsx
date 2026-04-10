import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Hospitals from "./pages/Hospitals";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

// Navigation Component: డాక్టర్ పేజీల్లో navbar ని దాచడానికి
function Navigation({ user, handleLogout }) {
  const location = useLocation();
  // Doctor Dashboard లో ఉన్నప్పుడు పైన లింకులు కనిపించవు
  const isDoctorPage = location.pathname.startsWith("/doctor");

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
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
            Logout
          </button>
        )}
      </div>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: "11px" }}>Narsapur Digital Healthcare Initiative</p>
    </nav>
  );
}

// Protected Route Wrapper: Vercel లో Login ఇబ్బంది లేకుండా ఉండటానికి
const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) return <div style={{ textAlign: "center", marginTop: "100px" }}>🛡️ Securing Connection...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. సెషన్ ఉందో లేదో చెక్ చెయ్యి
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    // 2. Auth స్టేటస్ మారినప్పుడు (Login/Logout) ఆటోమేటిక్ గా అప్డేట్ చెయ్యి
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.signOut();
    setUser(null);
    window.location.href = "/login"; // Logout అయ్యాక క్లీన్ గా రీడైరెక్ట్ అవ్వడానికి
  };

  return (
    <Router>
      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b" }}>
        
        <Navigation user={user} handleLogout={handleLogout} />

        <div style={{ padding: "10px", maxWidth: "800px", margin: "0 auto" }}>
          <Routes>
            {/* పేషెంట్లకు కనిపించే మెయిన్ పేజీ */}
            <Route path="/" element={<Hospitals />} />

            {/* లాగిన్ పేజీ: ఇప్పటికే లాగిన్ అయ్యుంటే అడ్మిన్ కి వెళ్తుంది */}
            <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/doctor-admin" replace />} />

            {/* డాక్టర్ డాష్‌బోర్డ్: ఇది Protected (లాగిన్ అయితేనే ఓపెన్ అవుతుంది) */}
            <Route 
              path="/doctor-admin" 
              element={
                <ProtectedRoute user={user} loading={loading}>
                  <Admin user={user} />
                </ProtectedRoute>
              } 
            />

            {/* 404: పేజీ దొరకకపోతే హోమ్ కి పంపిస్తుంది */}
            <Route path="*" element={<div style={{ textAlign: "center", marginTop: "100px" }}><h2>404 - Not Found</h2><Link to="/">Go Home</Link></div>} />
          </Routes>
        </div>

        <footer style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8", fontSize: "12px", marginTop: "40px", borderTop: "1px solid #e2e8f0" }}>
          <p>© 2026 SETURA Systems - Narsapur</p>
          <p style={{ fontWeight: "500" }}>Empowering Local Healthcare with Big Data</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
