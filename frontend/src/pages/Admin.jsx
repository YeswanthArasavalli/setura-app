import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin({ user }) {
  const [hospital, setHospital] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  // 1. Fetch Bookings Logic (Memoized to prevent unnecessary re-renders)
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

  // 2. Initial Data Load (Stronger Logic for Session Persistence)
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
      console.error("Dashboard Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchBookings]);

  useEffect(() => {
    loadHospitalData();

    // 3. Real-time Subscription (Handling both Bookings and Hospital Status)
    const channel = supabase
      .channel("admin-room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        if (hospital && payload.new.hospital_id === hospital.id) {
          fetchBookings(hospital.id, hospital.current_token);
        } else {
          loadHospitalData(); 
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hospitals" }, (payload) => {
        if (hospital && payload.new.id === hospital.id) {
          setHospital(payload.new);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadHospitalData, hospital, fetchBookings]);

  // 4. Update Token Logic (Optimistic UI Update for Snappy Feel)
  async function setCurrent(token) {
    if (!hospital) return;

    const oldToken = hospital.current_token;
    // UI ni ventane update chesthunnam (Optimistic)
    setHospital(prev => ({ ...prev, current_token: token }));
    setStats(prev => ({ ...prev, pending: bookings.filter(b => b.token_number > token).length }));

    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: token })
      .eq("id", hospital.id);

    if (error) {
      // Failed aithe server state ki roll back chesthunnam
      console.error("Update failed:", error);
      setHospital(prev => ({ ...prev, current_token: oldToken }));
      fetchBookings(hospital.id, oldToken);
    }
  }

  if (loading) return (
    <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#2563eb" }}>🏥 SETURA Admin</h2>
      <p style={{ color: "#64748b" }}>Securing Connection & Fetching Data...</p>
    </div>
  );

  if (!hospital) return (
    <div style={{ textAlign: "center", marginTop: "80px", padding: "20px", border: "1px solid #fee2e2", borderRadius: "12px", maxWidth: "400px", margin: "80px auto" }}>
      <h3 style={{ color: "#dc2626" }}>❌ No Hospital Linked</h3>
      <p style={{ fontSize: "14px", color: "#4b5563" }}>Mee account ki ఏ hospital లింక్ అయ్యి లేదు.</p>
      <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", fontSize: "11px", wordBreak: "break-all", marginTop: "10px" }}>
        <b>User ID:</b> {user?.id}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "'Inter', sans-serif" }}>
      
      {/* 📊 Analytics Dashboard */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
        <div style={{ flex: 1, backgroundColor: "#2563eb", color: "#fff", padding: "20px", borderRadius: "16px", textAlign: "center", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)" }}>
          <small style={{ fontWeight: "600", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", opacity: 0.9 }}>Total Patients</small>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "32px", fontWeight: "800" }}>{stats.total}</h2>
        </div>
        <div style={{ flex: 1, backgroundColor: "#ef4444", color: "#fff", padding: "20px", borderRadius: "16px", textAlign: "center", boxShadow: "0 10px 15px -3px rgba(239, 68, 68, 0.3)" }}>
          <small style={{ fontWeight: "600", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", opacity: 0.9 }}>In Queue</small>
          <h2 style={{ margin: "5px 0 0 0", fontSize: "32px", fontWeight: "800" }}>{stats.pending}</h2>
        </div>
      </div>

      <header style={{ textAlign: "center", marginBottom: "30px", padding: "25px", backgroundColor: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "24px", fontWeight: "800" }}>{hospital.name}</h2>
        <p style={{ color: "#64748b", margin: "5px 0 15px 0", fontSize: "14px", fontWeight: "500" }}>Digital Reception Control Panel</p>
        <div style={{ display: "inline-block", backgroundColor: "#fffbeb", padding: "12px 30px", borderRadius: "50px", border: "2px solid #fde68a" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#92400e" }}>NOW SERVING: </span>
          <span style={{ fontSize: "28px", fontWeight: "900", color: "#92400e" }}>#{hospital.current_token || 0}</span>
        </div>
      </header>

      {/* 📋 Patient List */}
      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", backgroundColor: "#fff", borderRadius: "20px", border: "2px dashed #e2e8f0" }}>
          <span style={{ fontSize: "40px" }}>📭</span>
          <p style={{ marginTop: "10px", fontWeight: "500" }}>No bookings yet for today.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {bookings.map((b) => {
            const isServing = b.token_number === hospital.current_token;
            const isCompleted = b.token_number < hospital.current_token;

            return (
              <div key={b.id} style={{
                border: "1px solid #e2e8f0", borderRadius: "18px", padding: "20px",
                backgroundColor: isServing ? "#f0fdf4" : isCompleted ? "#f8fafc" : "#fff",
                boxShadow: isServing ? "0 4px 12px rgba(34, 197, 94, 0.1)" : "0 2px 4px rgba(0,0,0,0.02)",
                opacity: isCompleted ? 0.6 : 1,
                transition: "all 0.3s ease",
                borderLeft: isServing ? "6px solid #22c55e" : "1px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "18px", color: "#1e293b", fontWeight: "700" }}>
                    {b.user_name} <span style={{ color: "#2563eb", fontWeight: "500", fontSize: "14px" }}>(Token #{b.token_number})</span>
                  </h4>
                  <a href={`tel:${b.phone_number}`} style={{ 
                    textDecoration: "none", backgroundColor: "#dcfce7", width: "40px", height: "40px", 
                    borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>📞</a>
                </div>

                <div style={{ margin: "12px 0", fontSize: "14px", color: "#475569", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <span>📍 {b.village || "Narsapur"}</span>
                  <span>| Age: <b>{b.age || "N/A"}</b></span>
                  <span>| Blood: <b style={{ color: "#dc2626" }}>{b.blood_group || "N/A"}</b></span>
                </div>
                
                <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                  {b.has_diabetes && <span style={{ fontSize: "11px", backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold" }}>🩸 DIABETES</span>}
                  {b.has_bp && <span style={{ fontSize: "11px", backgroundColor: "#e0e7ff", color: "#3730a3", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold" }}>💓 BP</span>}
                </div>

                {!isCompleted && !isServing && (
                  <button
                    onClick={() => setCurrent(b.token_number)}
                    style={{
                      width: "100%", padding: "14px", backgroundColor: "#1e293b", color: "#fff",
                      border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    CALL PATIENT NEXT
                  </button>
                )}
                
                {isServing && (
                  <div style={{ textAlign: "center", color: "#15803d", fontWeight: "800", padding: "10px", backgroundColor: "#dcfce7", borderRadius: "10px", fontSize: "13px" }}>
                    🟢 IN CONSULTATION
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}