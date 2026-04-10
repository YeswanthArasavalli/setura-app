import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin({ user }) {
  const [hospital, setHospital] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  // 1. Fetch Bookings Logic (Memoized to prevent loops)
  const fetchBookings = useCallback(async (hId, currentToken) => {
    const { data: bookData, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("hospital_id", hId)
      .order("token_number", { ascending: true });

    if (!error) {
      const list = bookData || [];
      setBookings(list);
      setStats({
        total: list.length,
        pending: list.filter(b => b.token_number > (currentToken || 0)).length
      });
    }
  }, []);

  // 2. Initial Data Load
  const loadHospitalData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data: hospData, error: hospError } = await supabase
        .from("hospitals")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (hospError) throw hospError;
      
      setHospital(hospData);
      await fetchBookings(hospData.id, hospData.current_token);
    } catch (err) {
      console.error("Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchBookings]);

  useEffect(() => {
    loadHospitalData();

    // 3. Real-time Subscription
    const subscription = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "bookings" 
      }, (payload) => {
        // Naya booking raagane current hospital state tho sync chesi fetch chesthundhi
        if (payload.new.hospital_id) {
           loadHospitalData(); 
        }
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [loadHospitalData]);

  // 4. Update Token Logic
  async function setCurrent(token) {
    if (!hospital) return;

    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: token })
      .eq("id", hospital.id);

    if (!error) {
      // Local state update for instant UI feedback
      const updatedHosp = { ...hospital, current_token: token };
      setHospital(updatedHosp);
      fetchBookings(hospital.id, token);
    }
  }

  if (loading) return (
    <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#2563eb" }}>🏥 SETURA Admin</h2>
      <p>Securing Connection & Fetching Data...</p>
    </div>
  );

  if (!hospital) return (
    <div style={{ textAlign: "center", color: "red", marginTop: "50px", padding: "20px" }}>
      <h3>❌ No Hospital Linked</h3>
      <p>Mee User ID ({user?.id}) ni database lo link cheyandi.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* Analytics Header */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
        <div style={{ flex: 1, backgroundColor: "#2563eb", color: "#fff", padding: "20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)" }}>
          <small style={{ fontWeight: "bold", fontSize: "10px", letterSpacing: "1px" }}>TOTAL TODAY</small>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "28px" }}>{stats.total}</h2>
        </div>
        <div style={{ flex: 1, backgroundColor: "#ef4444", color: "#fff", padding: "20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px rgba(239, 68, 68, 0.2)" }}>
          <small style={{ fontWeight: "bold", fontSize: "10px", letterSpacing: "1px" }}>IN QUEUE</small>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "28px" }}>{stats.pending}</h2>
        </div>
      </div>

      <header style={{ textAlign: "center", marginBottom: "30px", padding: "25px", backgroundColor: "#fff", borderRadius: "15px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>{hospital.name}</h2>
        <p style={{ color: "#64748b", margin: "5px 0 15px 0", fontSize: "14px" }}>Digital Reception Control</p>
        <div style={{ display: "inline-block", backgroundColor: "#fef3c7", padding: "10px 25px", borderRadius: "50px", border: "2px solid #fde68a" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#92400e" }}>NOW SERVING: </span>
          <span style={{ fontSize: "24px", fontWeight: "900", color: "#92400e" }}>#{hospital.current_token || 0}</span>
        </div>
      </header>

      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "#94a3b8", backgroundColor: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
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
              <h4 style={{ margin: 0, fontSize: "17px", color: "#1e293b" }}>
                {b.user_name} <span style={{ color: "#2563eb" }}>- #{b.token_number}</span>
              </h4>
              <a href={`tel:${b.phone_number}`} style={{ textDecoration: "none", backgroundColor: "#dcfce7", width: "35px", height: "35px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📞</a>
            </div>

            <p style={{ margin: "10px 0", fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              📍 {b.village} | Blood: <b>{b.blood_group || "N/A"}</b> | Age: <b>{b.age || "N/A"}</b>
              <br />
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                {b.has_diabetes && "🩸 Diabetes "} {b.has_bp && "💓 BP"}
              </span>
            </p>

            {b.token_number > (hospital.current_token || 0) && (
              <button
                onClick={() => setCurrent(b.token_number)}
                style={{
                  width: "100%", padding: "12px", backgroundColor: "#1e293b", color: "#fff",
                  border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer",
                  fontSize: "14px", letterSpacing: "0.5px"
                }}
              >
                CALL PATIENT (Token #{b.token_number})
              </button>
            )}
            
            {b.token_number === hospital.current_token && (
              <div style={{ textAlign: "center", color: "#15803d", fontWeight: "bold", padding: "8px", border: "1px dashed #15803d", borderRadius: "10px", fontSize: "14px" }}>
                🟢 IN CONSULTATION
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
