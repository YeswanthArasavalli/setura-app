import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin({ user }) {
  const [hospital, setHospital] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    if (user) {
      loadHospitalData();
    }

    // Real-time: Patient book cheyagane auto refresh
    const subscription = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => {
        if (hospital) fetchBookings(hospital.id);
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user, hospital?.id]);

  async function loadHospitalData() {
    setLoading(true);
    try {
      // 1. Get Hospital details linked to the logged-in User
      const { data: hospData, error: hospError } = await supabase
        .from("hospitals")
        .select("*")
        .eq("user_id", user.id) // Security: Doctor aayana data matrame chustharu
        .single();

      if (hospError) throw hospError;
      setHospital(hospData);

      // 2. Initial Fetch
      await fetchBookings(hospData.id, hospData.current_token);
    } catch (err) {
      console.error("Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBookings(hId, currentToken) {
    const { data: bookData } = await supabase
      .from("bookings")
      .select("*")
      .eq("hospital_id", hId)
      .order("token_number", { ascending: true });

    const list = bookData || [];
    setBookings(list);

    // Update Analytics (MSc Logic)
    setStats({
      total: list.length,
      pending: list.filter(b => b.token_number > (currentToken || 0)).length
    });
  }

  async function setCurrent(token) {
    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: token })
      .eq("id", hospital.id);

    if (!error) {
      setHospital({ ...hospital, current_token: token });
      fetchBookings(hospital.id, token);
    }
  }

  if (loading) return <p style={{ textAlign: "center", marginTop: "50px" }}>Securing Connection...</p>;
  if (!hospital) return <p style={{ textAlign: "center", color: "red", marginTop: "50px" }}>No Hospital Linked to this Account.</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* Analytics Header */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
        <div style={{ flex: 1, backgroundColor: "#2563eb", color: "#fff", padding: "20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)" }}>
          <small style={{ fontWeight: "bold", letterSpacing: "1px" }}>TOTAL TODAY</small>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "32px" }}>{stats.total}</h2>
        </div>
        <div style={{ flex: 1, backgroundColor: "#ef4444", color: "#fff", padding: "20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px rgba(239, 68, 68, 0.2)" }}>
          <small style={{ fontWeight: "bold", letterSpacing: "1px" }}>IN QUEUE</small>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "32px" }}>{stats.pending}</h2>
        </div>
      </div>

      <header style={{ textAlign: "center", marginBottom: "30px", padding: "25px", backgroundColor: "#fff", borderRadius: "15px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "24px" }}>{hospital.name}</h2>
        <p style={{ color: "#64748b", margin: "5px 0 15px 0" }}>Digital Reception Control</p>
        <div style={{ display: "inline-block", backgroundColor: "#fef3c7", padding: "10px 25px", borderRadius: "50px", border: "2px solid #fde68a" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#92400e" }}>NOW SERVING: </span>
          <span style={{ fontSize: "24px", fontWeight: "900", color: "#92400e" }}>#{hospital.current_token || 0}</span>
        </div>
      </header>

      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "#94a3b8", backgroundColor: "#fff", borderRadius: "12px" }}>
          📭 No bookings yet for today.
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} style={{
            border: "1px solid #e2e8f0", borderRadius: "15px", padding: "18px", marginBottom: "15px",
            backgroundColor: b.token_number === hospital.current_token ? "#f0fdf4" : b.token_number < hospital.current_token ? "#f8fafc" : "#fff",
            boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
            opacity: b.token_number < hospital.current_token ? 0.6 : 1,
            transition: "0.3s"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>
                {b.user_name} <span style={{ color: "#2563eb" }}>- #{b.token_number}</span>
              </h4>
              <div style={{ display: "flex", gap: "10px" }}>
                 <a href={`tel:${b.phone_number}`} style={{ textDecoration: "none", backgroundColor: "#dcfce7", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>📞</a>
              </div>
            </div>

            <p style={{ margin: "12px 0", fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
              📍 {b.village} | Blood: <b>{b.blood_group || "N/A"}</b> | Age: <b>{b.age || "N/A"}</b>
              <br />
              <span style={{ fontSize: "12px" }}>
                {b.has_diabetes && "🩸 Diabetes "} {b.has_bp && "💓 BP"}
              </span>
            </p>

            {b.token_number > (hospital.current_token || 0) && (
              <button
                onClick={() => setCurrent(b.token_number)}
                style={{
                  width: "100%", padding: "14px", backgroundColor: "#1e293b", color: "#fff",
                  border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer",
                  fontSize: "15px", letterSpacing: "0.5px"
                }}
              >
                CALL PATIENT (Token #{b.token_number})
              </button>
            )}
            
            {b.token_number === hospital.current_token && (
              <div style={{ textAlign: "center", color: "#15803d", fontWeight: "bold", padding: "5px", border: "1px dashed #15803d", borderRadius: "8px" }}>
                🟢 IN CONSULTATION
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}