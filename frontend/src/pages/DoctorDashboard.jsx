import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // URL nundi slug tiskovadaniki
import { supabase } from "../lib/supabaseClient";

export default function DoctorDashboard() {
  const { hospitalSlug } = useParams(); // URL: /doctor/:hospitalSlug
  const [bookings, setBookings] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hospitalSlug) {
      fetchHospitalAndBookings();
    }
  }, [hospitalSlug]);

  async function fetchHospitalAndBookings() {
    setLoading(true);
    
    // 1. First, hospital details techukovali (Slug ni base chesi)
    const { data: hospData, error: hospError } = await supabase
      .from("hospitals")
      .select("*")
      .eq("slug", hospitalSlug)
      .single();

    if (hospError || !hospData) {
      console.error("Hospital not found");
      setLoading(false);
      return;
    }

    setHospital(hospData);

    // 2. Ippudu aa specific hospital ID unna patients ni matrame filter cheyali
    const { data: bookData, error: bookError } = await supabase
      .from("bookings")
      .select("*")
      .eq("hospital_id", hospData.id) // <--- ID filter ikkade jarugutundi
      .order("token_number", { ascending: true });

    if (!bookError) {
      setBookings(bookData || []);
    }
    setLoading(false);
  }

  // Next patient ni piliche logic
  async function callPatient(tokenNumber) {
    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: tokenNumber })
      .eq("id", hospital.id);

    if (!error) {
      setHospital({ ...hospital, current_token: tokenNumber });
      alert(`Calling Patient #${tokenNumber}`);
    }
  }

  if (loading) return <p style={{textAlign: 'center', marginTop: '50px'}}>Loading Dashboard...</p>;
  if (!hospital) return <p style={{textAlign: 'center', color: 'red'}}>Hospital Not Found!</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, color: '#2563eb' }}>{hospital.name} - Live Queue</h2>
        <p style={{ color: '#64748b' }}>Now Serving: <strong style={{fontSize: '24px', color: '#dc2626'}}>#{hospital.current_token || 0}</strong></p>
      </header>

      <button onClick={fetchHospitalAndBookings} style={{ width: '100%', marginBottom: '20px', padding: '10px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc' }}>
        ↻ Refresh List
      </button>

      {bookings.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>No patients booked yet.</p>
      ) : (
        bookings.map((patient) => (
          <div key={patient.id} style={{
            border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "15px",
            backgroundColor: patient.token_number === hospital.current_token ? "#f0fdf4" : "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{patient.user_name} <span style={{ color: '#2563eb' }}>(Token #{patient.token_number})</span></h3>
              <a href={`tel:${patient.phone_number}`} style={{ textDecoration: 'none', backgroundColor: '#dcfce7', padding: '5px 10px', borderRadius: '5px', fontSize: '14px', color: '#166534', fontWeight: 'bold' }}>
                📞 Call
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '14px', color: '#475569' }}>
              <p style={{ margin: 0 }}>Age: <b>{patient.age || 'N/A'}</b></p>
              <p style={{ margin: 0 }}>Blood: <b>{patient.blood_group || 'N/A'}</b></p>
              <p style={{ margin: 0 }}>Village: <b>{patient.village || 'N/A'}</b></p>
              <p style={{ margin: 0 }}>Diabetes: <b>{patient.has_diabetes ? 'Yes' : 'No'}</b></p>
              <p style={{ margin: 0 }}>BP: <b>{patient.has_bp ? 'Yes' : 'No'}</b></p>
            </div>

            {patient.token_number > (hospital.current_token || 0) && (
              <button
                onClick={() => callPatient(patient.token_number)}
                style={{
                  width: "100%", marginTop: "15px", padding: "12px",
                  backgroundColor: "#2563eb", color: "#fff", border: "none",
                  borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
                }}
              >
                Call Patient (Set Token #{patient.token_number} as Current)
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}