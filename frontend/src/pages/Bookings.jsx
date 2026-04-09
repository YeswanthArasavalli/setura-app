import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState(""); // State for filtering
  
  // New state to track which button is currently loading
  const [updatingToken, setUpdatingToken] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    
    // Base query: order by token number ascending (1, 2, 3...)
    let query = supabase
      .from("bookings")
      .select("*")
      .order("token_number", { ascending: true });

    // If staff entered a Hospital ID, filter the database
    if (hospitalId.trim()) {
      query = query.eq("hospital_id", hospitalId.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
      alert("Failed to load the queue.");
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  }

  // <-- NEW FUNCTION: Updates the active token for the hospital -->
  async function updateCurrentToken(token, currentHospitalId) {
    setUpdatingToken(token); // Start loading state for this specific button

    const { error } = await supabase
      .from("hospitals")
      .update({ current_token: token })
      .eq("id", currentHospitalId);

    if (error) {
      console.error(error);
      alert("❌ Error updating the current token. Please try again.");
    } else {
      // Small visual success feedback instead of a jarring error alert
      alert(`✅ Token #${token} is now set as the Current Token!`);
    }
    
    setUpdatingToken(null); // End loading state
  }

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>Live Queue</h2>
      </div>

      {/* Filter Section: Input and Button */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter Hospital ID"
          value={hospitalId}
          onChange={(e) => setHospitalId(e.target.value)}
          style={{
            flex: 1, 
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "16px",
            boxSizing: "border-box"
          }}
        />
        <button 
          onClick={fetchBookings}
          style={{
            padding: "10px 16px",
            backgroundColor: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            whiteSpace: "nowrap"
          }}
        >
          {loading ? "Loading..." : "Load Queue"}
        </button>
      </div>

      {/* Status Messages */}
      {loading && <p style={{ textAlign: "center", color: "#666" }}>Loading queue...</p>}

      {!loading && bookings.length === 0 && (
        <p style={{ textAlign: "center", color: "#666", padding: "20px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
          No tokens found for this hospital.
        </p>
      )}

      {/* Queue List */}
      {bookings.map((b) => (
        <div 
          key={b.id} 
          style={{
            border: "1px solid #ddd",
            borderLeft: "5px solid #000", 
            padding: "16px",
            marginBottom: "16px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}
        >
          {/* Header Row: Name & Token */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>{b.user_name}</h3>
            <span style={{ 
              backgroundColor: "#000", 
              color: "#fff",
              padding: "6px 12px", 
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "16px"
            }}>
              Token #{b.token_number}
            </span>
          </div>

          {/* Medical Summary Section */}
          <div style={{ 
            marginTop: "12px", 
            paddingTop: "12px", 
            borderTop: "1px solid #eee", 
            fontSize: "14px", 
            color: "#444" 
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              
              <p style={{ margin: 0 }}>
                <b>📞 Phone:</b>{" "}
                {b.phone_number ? (
                  <a 
                    href={`tel:${b.phone_number}`} 
                    style={{ 
                      color: "#2563eb", 
                      textDecoration: "underline", 
                      fontWeight: "bold",
                      padding: "4px 0" 
                    }}
                  >
                    {b.phone_number}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
              
              <p style={{ margin: 0 }}><b>Age:</b> {b.age ? `${b.age} yrs` : "N/A"}</p>
              <p style={{ margin: 0 }}><b>Blood Group:</b> {b.blood_group || "N/A"}</p>
              <p style={{ margin: 0 }}><b>Village:</b> {b.village || "N/A"}</p>
            </div>
            
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", padding: "8px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
              <p style={{ margin: 0, color: b.has_diabetes ? "#d97706" : "#444", fontWeight: b.has_diabetes ? "bold" : "normal" }}>
                <b>Diabetes:</b> {b.has_diabetes ? "Yes" : "No"}
              </p>
              <p style={{ margin: 0, color: b.has_bp ? "#d97706" : "#444", fontWeight: b.has_bp ? "bold" : "normal" }}>
                <b>BP:</b> {b.has_bp ? "Yes" : "No"}
              </p>
            </div>
          </div>
          
          {/* <-- NEW BUTTON: Action area for the receptionist --> */}
          <div style={{ marginTop: "16px" }}>
            <button 
              onClick={() => updateCurrentToken(b.token_number, b.hospital_id)}
              disabled={updatingToken === b.token_number}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: updatingToken === b.token_number ? "#ccc" : "#2563eb", // Blue button for primary action
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: updatingToken === b.token_number ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
              }}
            >
              {updatingToken === b.token_number ? "Updating..." : `Call Patient (Set Token #${b.token_number} as Current)`}
            </button>
          </div>

        </div>
      ))}
    </div>
  );
}