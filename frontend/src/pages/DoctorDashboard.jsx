import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom"; 
import { supabase } from "../lib/supabaseClient";

export default function DoctorDashboard() {
  const { hospitalSlug } = useParams(); 
  const [bookings, setBookings] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Hospital and its Bookings Logic
  const fetchHospitalAndBookings = useCallback(async () => {
    if (!hospitalSlug) return;
    
    setLoading(true);
    try {
      // Step A: Hospital details techukovali (Slug based)
      const { data: hospData, error: hospError } = await supabase
        .from("hospitals")
        .select("*")
        .eq("slug", hospitalSlug)
        .single();

      if (hospError || !hospData) throw new Error("Hospital not found");
      setHospital(hospData);

      // Step B: Bookings techukovali
      const { data: bookData, error: bookError } = await supabase
        .from("bookings")
        .select("*")
        .eq("hospital_id", hospData.id)
        .order("token_number", { ascending: true });

      if (bookError) throw bookError;
      setBookings(bookData || []);

    } catch (err) {
      console.error("Dashboard Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [hospitalSlug]);

  useEffect(() => {
    fetchHospitalAndBookings();

    // 2. Real-time Sync: Patient book cheyagane auto refresh
    const subscription = supabase
      .channel("doctor-dashboard-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => fetchHospitalAndBookings())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hospitals" }, (payload) => {
          if (payload.new.slug === hospitalSlug) {
              setHospital(payload.new);
          }
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [hospitalSlug, fetchHospitalAndBookings]);

  // 3. Next patient ni piliche logic
  async function callPatient(tokenNumber) {
    if (!hospital) return;

    // Optimistic UI update for snappy feel
    const oldToken = hospital.current_token;
    setHospital(prev => ({ ...prev, current_token: tokenNumber }));

    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: tokenNumber })
      .eq("id", hospital.id);

    if (error) {
      console.error("Update failed:", error);
      setHospital(prev => ({ ...prev, current_token: oldToken }));
      alert("Error: Could not update token");
    }
  }

  if (loading) return (
    <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "sans-serif" }}>
      <h3 style={{ color: "#2563eb" }}>🔄 Loading Live Dashboard...</h3>
    </div>
  );

  if (!hospital) return (
    <div style={{ textAlign: "center", color: "red", marginTop: "50px" }}>
      <h2>❌ Hospital Not Found!</h2>
      <p>Please check the URL slug.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: 'sans-serif' }}>
      
      {/* 🏥 Header Section */}
      <header style={{ textAlign: 'center', marginBottom: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>{hospital.name}</h2>
        <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fef3c7", borderRadius: "10px", display: "inline-block" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#92400e" }}>NOW SERVING: </span>
            <span style={{ fontSize: "28px", fontWeight: "900", color: "#dc2626" }}>#{hospital.current_token || 0}</span>
        </div>
      </header>

      <button 
        onClick={fetchHospitalAndBookings} 
        style={{ width: '100%', marginBottom: '20px', padding: '12px', cursor: 'pointer', borderRadius: '10px', border: '1px solid #2563eb', backgroundColor: '#fff', color: '#2563eb', fontWeight: 'bold' }}
      >
        ↻ Refresh Patient List
      </button>

      {/* 📋 Patient List */}
      {bookings.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', backgroundColor: '#fff', borderRadius: '10px' }}>No patients booked yet.</p>
      ) : (
        bookings.map((patient) => (
          <div key={patient.id} style={{
            border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", marginBottom: "15px",
            backgroundColor: patient.token_number === hospital.current_token ? "#f0fdf4" : "#fff",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            opacity: patient.token_number < hospital.current_token ? 0.6 : 1,
            borderLeft: patient.token_number === hospital.current_token ? "6px solid #22c55e" : "1px solid #e2e8f0"
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                {patient.user_name} <span style={{ color: '#2563eb' }}>(Token #{patient.token_number})</span>
              </h3>
              <a href={`tel:${patient.phone_number}`} style={{ textDecoration: 'none', backgroundColor: '#dcfce7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📞
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px', fontSize: '14px', color: '#475569' }}>
              <p style={{ margin: 0 }}>Age: <b>{patient.age || 'N/A'}</b></p>
              <p style={{ margin: 0 }}>Blood: <b style={{color: '#dc2626'}}>{patient.blood_group || 'N/A'}</b></p>
              <p style={{ margin: 0 }}>Village: <b>{patient.village || 'N/A'}</b></p>
              <p style={{ margin: 0 }}>Sugar/BP: <b>{patient.has_diabetes ? 'YES' : 'No'}/{patient.has_bp ? 'YES' : 'No'}</b></p>
            </div>

            {patient.token_number > (hospital.current_token || 0) && (
              <button
                onClick={() => callPatient(patient.token_number)}
                style={{
                  width: "100%", marginTop: "15px", padding: "14px",
                  backgroundColor: "#1e293b", color: "#fff", border: "none",
                  borderRadius: "10px", fontWeight: "bold", cursor: "pointer"
                }}
              >
                CALL NEXT (Token #{patient.token_number})
              </button>
            )}

            {patient.token_number === hospital.current_token && (
               <div style={{ textAlign: 'center', color: '#15803d', fontWeight: 'bold', marginTop: '15px', padding: '10px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                 🟢 Currently in Consultation
               </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}