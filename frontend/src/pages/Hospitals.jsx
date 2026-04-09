import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(null); 
  const [message, setMessage] = useState(""); 
  
  // Patient Form States
  const [userName, setUserName] = useState(""); 
  const [phone, setPhone] = useState(""); 
  const [age, setAge] = useState("");
  const [village, setVillage] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasBP, setHasBP] = useState(false);

  // <-- Live Status Tracking States -->
  const [myToken, setMyToken] = useState(null);
  const [bookedHospitalId, setBookedHospitalId] = useState(null);

  const inputStyle = {
    width: "100%", 
    padding: "12px", 
    borderRadius: "6px", 
    border: "1px solid #ccc",
    fontSize: "16px",
    boxSizing: "border-box",
    marginBottom: "12px"
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  async function fetchHospitals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .order("id", { ascending: true }); // Keeps the list order stable

    if (error) {
      console.error("Error fetching hospitals:", error);
      setMessage("❌ Failed to load hospitals. Please check your internet.");
    } else {
      setHospitals(data || []);
    }
    setLoading(false);
  }

  async function bookToken(hospitalId) {
    setMessage(""); 

    if (!userName.trim()) {
      setMessage("❌ Please enter patient name before booking.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      setMessage("❌ Please enter a valid 10-digit Indian phone number.");
      return;
    }

    if (age && isNaN(age)) {
      setMessage("❌ Age must be a valid number.");
      return;
    }

    setIsBooking(hospitalId); 

    const { count, error: countError } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId);

    if (countError) {
      console.error("Error fetching count:", countError);
      setMessage("❌ Error generating token number. Please try again.");
      setIsBooking(null);
      return;
    }

    const tokenNumber = (count || 0) + 1;

    const { error } = await supabase
      .from("bookings")
      .insert([
        {
          user_name: userName.trim(),
          phone_number: phone.trim(),
          age: age ? parseInt(age) : null,
          village: village.trim(),
          blood_group: bloodGroup.trim(),
          has_diabetes: hasDiabetes,
          has_bp: hasBP,
          hospital_id: hospitalId,
          token_number: tokenNumber
        }
      ]);

    if (error) {
      console.error(error);
      setMessage("❌ Error booking token. Please try again.");
    } else {
      setMessage(`✅ Token booked successfully!`);
      
      // <-- Save token and hospital ID for the live tracker -->
      setMyToken(tokenNumber);
      setBookedHospitalId(hospitalId);
      
      // Clear form inputs
      setUserName(""); 
      setPhone(""); 
      setAge("");
      setVillage("");
      setBloodGroup("");
      setHasDiabetes(false);
      setHasBP(false);

      // Fetch hospitals again instantly so the new token counts are synced
      fetchHospitals();
    }
    
    setIsBooking(null); 
  }

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Patient Registration</h2>

      {message && (
        <div style={{
          padding: "12px",
          marginBottom: "20px",
          borderRadius: "6px",
          backgroundColor: message.includes("✅") ? "#dcfce7" : "#fee2e2",
          color: message.includes("✅") ? "#166534" : "#991b1b",
          border: `1px solid ${message.includes("✅") ? "#bbf7d0" : "#fecaca"}`,
          textAlign: "center",
          fontWeight: "bold"
        }}>
          {message}
        </div>
      )}

      {/* Hide the form if they already booked a token to keep the screen clean */}
      {!myToken && (
        <div style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #eee", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px", color: "#333" }}>
            Fill Details (Optional info can be left blank)
          </h3>
          
          <input type="text" placeholder="Patient Name (Required)" value={userName} onChange={(e) => setUserName(e.target.value)} style={inputStyle} />
          <input type="tel" placeholder="Phone Number (Required)" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} maxLength="10" />
          
          <div style={{ display: "flex", gap: "12px" }}>
            <input type="text" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input type="text" placeholder="Blood Group (e.g., O+)" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>

          <input type="text" placeholder="Village / Town" value={village} onChange={(e) => setVillage(e.target.value)} style={inputStyle} />

          <div style={{ display: "flex", gap: "20px", padding: "10px", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "6px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" checked={hasDiabetes} onChange={(e) => setHasDiabetes(e.target.checked)} style={{ width: "18px", height: "18px" }} />
              Diabetes
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" checked={hasBP} onChange={(e) => setHasBP(e.target.checked)} style={{ width: "18px", height: "18px" }} />
              Blood Pressure
            </label>
          </div>
        </div>
      )}

      {/* Refresh Button so patients can check if the queue moved */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", marginTop: "30px" }}>
        <h2 style={{ margin: 0 }}>Select Hospital</h2>
        <button 
          onClick={fetchHospitals}
          style={{ padding: "8px 12px", backgroundColor: "#eee", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
        >
          {loading ? "..." : "↻ Refresh Status"}
        </button>
      </div>

      {loading && hospitals.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>Loading hospitals...</p>}
      {!loading && hospitals.length === 0 && <p style={{ textAlign: "center" }}>No hospitals found.</p>}

      {hospitals.map((hospital) => {
        const currentToken = hospital.current_token || 0;
        
        return (
          <div key={hospital.id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", marginBottom: "16px", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>{hospital.name}</h3>
            <p style={{ margin: "0 0 16px 0", color: "#666" }}>{hospital.location}</p>

            <div style={{ backgroundColor: "#fef3c7", padding: "12px", borderRadius: "6px", marginBottom: "16px", textAlign: "center", border: "1px solid #fde68a" }}>
              <span style={{ fontWeight: "bold", color: "#92400e", fontSize: "16px" }}>
                📢 Now Serving: Token #{currentToken}
              </span>
            </div>
            
            {/* <-- Live Tracker UI is perfectly setup here --> */}
            {bookedHospitalId === hospital.id && myToken ? (
              <div style={{ padding: "16px", backgroundColor: "#e0f2fe", borderRadius: "8px", border: "1px solid #bae6fd", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#0369a1", fontSize: "20px" }}>🎟️ Your Token: #{myToken}</h3>
                
                <div style={{ fontSize: "18px", marginTop: "12px" }}>
                  {myToken <= currentToken && (
                    <p style={{ margin: 0, fontWeight: "bold", color: "#166534" }}>👉 It's your turn! Please go inside.</p>
                  )}
                  {myToken === currentToken + 1 && (
                    <p style={{ margin: 0, fontWeight: "bold", color: "#b45309" }}>⏳ Be ready, you are next!</p>
                  )}
                  {myToken > currentToken + 1 && (
                    <p style={{ margin: 0, color: "#0369a1", fontWeight: "bold" }}>⌛ Please wait. ({myToken - currentToken - 1} people ahead of you)</p>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => bookToken(hospital.id)}
                disabled={isBooking === hospital.id || myToken !== null}
                style={{
                  width: "100%", padding: "12px",
                  backgroundColor: (isBooking === hospital.id || myToken !== null) ? "#ccc" : "#000",
                  color: "#fff", border: "none", borderRadius: "6px",
                  cursor: (isBooking === hospital.id || myToken !== null) ? "not-allowed" : "pointer",
                  fontWeight: "bold", fontSize: "16px"
                }}
              >
                {isBooking === hospital.id ? "Booking..." : "Book Token"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}