import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Hospitals from "./pages/Hospitals";
import DoctorDashboard from "./pages/DoctorDashboard"; // Ikkada 'Bookings' badulu 'DoctorDashboard' pettu

function App() {
  return (
    <Router>
      <div style={{ fontFamily: "sans-serif", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        
        {/* Navigation Bar - Demo kosam simple ga uncha */}
        <nav style={{ 
          padding: "15px", 
          backgroundColor: "#fff", 
          borderBottom: "1px solid #e2e8h0", 
          display: "flex", 
          gap: "20px",
          justifyContent: "center" 
        }}>
          <Link to="/" style={{ textDecoration: "none", color: "#2563eb", fontWeight: "bold" }}>🏠 Patient View</Link>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Doctor Link: <code>/doctor/your-slug</code>
          </p>
        </nav>

        <div style={{ padding: "20px" }}>
          <Routes>
            {/* 1. Patient Page (Andaru hospitals ni chustaru) */}
            <Route path="/" element={<Hospitals />} />

            {/* 2. Doctor Dashboard (Slug based filtering) */}
            {/* Example URL: setura.vercel.app/doctor/surya-hospital */}
            <Route path="/doctor/:hospitalSlug" element={<DoctorDashboard />} />

            {/* 404 Page (Oka vela wrong link kodithe) */}
            <Route path="*" element={<h2 style={{ textAlign: "center", marginTop: "50px" }}>404 - Page Not Found</h2>} />
          </Routes>
        </div>

        <footer style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "12px" }}>
          © 2026 SETURA Systems - Narsapur
        </footer>
      </div>
    </Router>
  );
}

export default App;
