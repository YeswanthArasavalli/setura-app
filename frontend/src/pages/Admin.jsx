import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin({ user }) {
  const [hospital, setHospital] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  // Data fetch chese main logic
  const loadDashboard = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // 1. Get Hospital using User UID
      const { data: hospData, error: hospError } = await supabase
        .from("hospitals")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (hospError) throw hospError;
      setHospital(hospData);

      // 2. Get Bookings
      const { data: bookData } = await supabase
        .from("bookings")
        .select("*")
        .eq("hospital_id", hospData.id)
        .order("token_number", { ascending: true });

      const list = bookData || [];
      setBookings(list);
      
      setStats({
        total: list.length,
        pending: list.filter(b => b.token_number > (hospData.current_token || 0)).length
      });
    } catch (err) {
      console.error("Dashboard Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadDashboard(user.id);
    }

    // Real-time update logic
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadDashboard(user?.id))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, loadDashboard]);

  async function setCurrent(token) {
    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: token })
      .eq("id", hospital.id);

    if (!error) {
      setHospital(prev => ({ ...prev, current_token: token }));
      loadDashboard(user.id);
    }
  }

  if (loading) return <h2 style={{ textAlign: "center", marginTop: "50px" }}>🔄 Loading Doctor Dashboard...</h2>;

  if (!hospital) return (
    <div style={{ textAlign: "center", marginTop: "50px", padding: "20px", border: "2px dashed red", borderRadius: "10px" }}>
      <h3 style={{ color: "red" }}>❌ No Hospital Profile Linked</h3>
      <p>Go to Supabase -> Hospitals Table -> user_id column</p>
      <p style={{ fontSize: "12px", background: "#eee", padding: "10px" }}>
        <b>Your UID:</b> {user?.id}
      </p>
      <p>Paste the above UID in your hospital's row.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      {/* Stats Section */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <div style={{ flex: 1, background: "#2563eb", color: "#fff", padding: "15px", borderRadius: "10px", textAlign: "center" }}>
          <small>TOTAL PATIENTS</small>
          <h2 style={{ margin: 0 }}>{stats.total}</h2>
        </div>
        <div style={{ flex: 1, background: "#dc2626", color: "#fff", padding: "15px", borderRadius: "10px", textAlign: "center" }}>
          <small>WAITING</small>
          <h2 style={{ margin: 0 }}>{stats.pending}</h2>
        </div>
      </div>

      <header style={{ textAlign: "center", marginBottom: "30px", padding: "20px", background: "#fff", borderRadius: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: 0 }}>{hospital.name}</h2>
        <div style={{ marginTop: "10px", fontSize: "20px", fontWeight: "900", color: "#92400e", background: "#fef3c7", padding: "8px", borderRadius: "10px" }}>
          NOW SERVING: #{hospital.current_token || 0}
        </div>
      </header>

      {bookings.length === 0 ? (
        <p style={{ textAlign: "center", color: "#64748b" }}>No bookings today.</p>
      ) : (
        bookings.map(b => (
          <div key={b.id} style={{
            border: "1px solid #e2e8f0", borderRadius: "12px", padding: "15px", marginBottom: "12px",
            background: b.token_number === hospital.current_token ? "#dcfce7" : b.token_number < hospital.current_token ? "#f1f5f9" : "#fff",
            opacity: b.token_number < hospital.current_token ? 0.7 : 1
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h4 style={{ margin: 0 }}>{b.user_name} - #{b.token_number}</h4>
              <a href={`tel:${b.phone_number}`} style={{ textDecoration: "none" }}>📞</a>
            </div>
            <p style={{ fontSize: "13px", color: "#475569" }}>📍 {b.village} | Sugar: {b.has_diabetes ? "Yes" : "No"}</p>
            {b.token_number > (hospital.current_token || 0) && (
              <button onClick={() => setCurrent(b.token_number)} style={{ width: "100%", padding: "12px", background: "#1e293b", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                Call Next Patient
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
