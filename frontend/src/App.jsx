import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Hospitals from "./pages/Hospitals";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

// Navigation Logic: UI neat ga undadaniki
function Navigation({ user, handleLogout }) {
  const location = useLocation();
  const isDoctorPage = location.pathname.startsWith("/doctor");

  // Doctor Dashboard lo unnappudu cleaner look kosam Navbar hide chestunnam
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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading Setura...</div>;

  return (
    <Router>
      <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b" }}>
        
        <Navigation user={user} handleLogout={handleLogout} />

        <div style={{ padding: "10px", maxWidth: "800px", margin: "0 auto" }}>
          <Routes>
            {/* Public: Patient View */}
            <Route path="/" element={<Hospitals />} />

            {/* Public: Login Page (Redirect to dashboard if already logged in) */}
            <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/doctor-admin" />} />

            {/* Protected: Doctor Dashboard */}
            <Route 
              path="/doctor-admin" 
              element={user ? <Admin user={user} /> : <Navigate to="/login" />} 
            />

            {/* 404 Page */}
            <Route path="*" element={<div style={{ textAlign: "center", marginTop: "100px" }}><h2>404 - Not Found</h2><Link to="/">Go Home</Link></div>} />
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