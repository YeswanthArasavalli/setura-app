import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(null);
  const [language, setLanguage] = useState("te");

  // Form States
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [village, setVillage] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasBP, setHasBP] = useState(false);

  // Booking States
  const [myToken, setMyToken] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [message, setMessage] = useState("");

  const t = {
    en: {
      title: "🏥 SETURA Booking", regTitle: "Patient Details", name: "Name *", phone: "Phone *", age: "Age", 
      village: "Village", blood: "Blood Group", diabetes: "Diabetes", bp: "BP", book: "Book Token", 
      serving: "Now Serving", success: "Token booked!", error: "Name & Phone required", 
      yourToken: "Your Token", wa: "Send via WhatsApp ✅"
    },
    te: {
      title: "🏥 సెతుర బుకింగ్", regTitle: "పేషెంట్ వివరాలు", name: "పేరు *", phone: "ఫోన్ *", age: "వయస్సు", 
      village: "ఊరు", blood: "బ్లడ్ గ్రూప్", diabetes: "షుగర్", bp: "బీపీ", book: "టోకెన్ బుక్ చేయండి", 
      serving: "ప్రస్తుతం", success: "టోకెన్ బుక్ అయింది!", error: "పేరు & ఫోన్ అవసరం", 
      yourToken: "మీ టోకెన్", wa: "వాట్సాప్ ద్వారా పంపండి ✅"
    },
    hi: {
      title: "🏥 सेतुरा बुकिंग", regTitle: "मरीज का विवरण", name: "नाम *", phone: "फोन *", age: "उम्र", 
      village: "गांव", blood: "ब्लड ग्रुप", diabetes: "शुगर", bp: "बीपी", book: "टोकन बुक करें", 
      serving: "अभी चल रहा", success: "टोकन बुक हो गया!", error: "नाम और फोन जरूरी", 
      yourToken: "आपका टोकन", wa: "व्हाट्सएप भेजें ✅"
    }
  };

  // Memoized fetch function to prevent unnecessary re-renders in Vercel
  const fetchHospitals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setHospitals(data || []);
    } catch (err) {
      console.error("Vercel Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();

    // Real-time channel for Vercel
    const channel = supabase
      .channel("public:hospitals")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hospitals" }, () => {
        fetchHospitals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHospitals]);

  async function bookToken(h) {
    if (!userName.trim() || !phone.trim()) {
      setMessage(`❌ ${t[language].error}`);
      return;
    }

    setIsBooking(h.id);
    setMessage("");

    try {
      // 1. Get next token (Vercel-Safe fetching)
      const { data: lastBooking, error: fetchError } = await supabase
        .from("bookings")
        .select("token_number")
        .eq("hospital_id", h.id)
        .order("token_number", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextToken = lastBooking?.length > 0 ? lastBooking[0].token_number + 1 : 1;

      // 2. Insert booking
      const { error: insertError } = await supabase.from("bookings").insert([{
        user_name: userName.trim(),
        phone_number: phone.trim(),
        age: age ? parseInt(age) : null,
        village: village.trim() || "Narsapur",
        blood_group: bloodGroup.trim() || "N/A",
        has_diabetes: hasDiabetes,
        has_bp: hasBP,
        hospital_id: h.id,
        token_number: nextToken
      }]);

      if (insertError) throw insertError;

      setMyToken(nextToken);
      setSelectedHospital(h);
      setMessage(`✅ ${t[language].success} #${nextToken}`);
      fetchHospitals();

    } catch (err) {
      console.error("Booking Error:", err.message);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsBooking(null);
    }
  }

  const getWAMessage = () => {
    if (!selectedHospital) return "";
    const msg = `*SETURA TOKEN CONFIRMATION*\n------------------\nHospital: ${selectedHospital.name}\nToken: #${myToken}\nPatient: ${userName}\n------------------\nPlease show this at the counter.`;
    return encodeURIComponent(msg);
  };

  const inputStyle = {
    width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db",
    fontSize: "16px", boxSizing: "border-box", marginBottom: "12px", outline: "none", color: "#000",
    backgroundColor: "#fff" // Ensuring white background for Vercel dark-mode issues
  };

  return (
    <div style={{ maxWidth: 500, margin: "20px auto", padding: "10px", fontFamily: "sans-serif" }}>
      
      {/* Lang Switch */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginBottom: "15px" }}>
        {["en", "te", "hi"].map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)} style={{ 
            padding: "6px 14px", borderRadius: "15px", border: "1px solid #2563eb", 
            backgroundColor: language === lang ? "#2563eb" : "#fff", 
            color: language === lang ? "#fff" : "#2563eb", cursor: "pointer", fontWeight: "bold"
          }}>
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <h2 style={{ textAlign: "center", color: "#1e293b", fontWeight: "900", marginBottom: "20px" }}>{t[language].title}</h2>

      {message && (
        <div style={{ padding: "12px", borderRadius: "8px", marginBottom: "20px", textAlign: "center", fontWeight: "bold",
          backgroundColor: message.includes("✅") ? "#dcfce7" : "#fee2e2", color: message.includes("✅") ? "#166534" : "#991b1b"
        }}>
          {message}
        </div>
      )}

      {!myToken && (
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginBottom: "25px", border: "1px solid #e5e7eb" }}>
          <h4 style={{ marginTop: 0, color: "#475569", marginBottom: "15px" }}>{t[language].regTitle}</h4>
          <input placeholder={t[language].name} value={userName} onChange={e => setUserName(e.target.value)} style={inputStyle} />
          <input placeholder={t[language].phone} type="tel" maxLength="10" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "10px" }}>
            <input placeholder={t[language].age} type="number" value={age} onChange={e => setAge(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input placeholder={t[language].blood} value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <input placeholder={t[language].village} value={village} onChange={e => setVillage(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "20px", padding: "5px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#1e293b", fontWeight: "500" }}>
              <input type="checkbox" checked={hasDiabetes} onChange={e => setHasDiabetes(e.target.checked)} style={{ width: 18, height: 18 }} /> {t[language].diabetes}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#1e293b", fontWeight: "500" }}>
              <input type="checkbox" checked={hasBP} onChange={e => setHasBP(e.target.checked)} style={{ width: 18, height: 18 }} /> {t[language].bp}
            </label>
          </div>
        </div>
      )}

      <h3 style={{ color: "#334155", marginLeft: "5px" }}>{t[language].select}</h3>

      {loading ? <div style={{ textAlign: "center", padding: "20px" }}>🌀 Loading Hospitals...</div> : 
        hospitals.map(h => (
          <div key={h.id} style={{ 
            border: "1px solid #e2e8f0", borderRadius: "16px", padding: "18px", marginBottom: "16px", 
            backgroundColor: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: 0, color: "#1e293b", fontSize: "18px" }}>{h.name}</h4>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>📍 {h.location || "Narsapur"}</p>
              </div>
              <div style={{ backgroundColor: "#fef3c7", padding: "8px 12px", borderRadius: "10px", textAlign: "center" }}>
                <span style={{ fontSize: "10px", color: "#92400e", fontWeight: "800", display: "block" }}>{t[language].serving}</span>
                <span style={{ fontSize: "20px", fontWeight: "900", color: "#92400e" }}>#{h.current_token || 0}</span>
              </div>
            </div>

            <hr style={{ margin: "18px 0", border: "0", borderTop: "1px solid #f1f5f9" }} />

            {myToken && selectedHospital?.id === h.id ? (
              <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#eff6ff", borderRadius: "12px", textAlign: "center", border: "1px solid #bfdbfe" }}>
                <span style={{ color: "#1e40af", fontWeight: "bold", fontSize: "14px" }}>{t[language].yourToken}</span>
                <h1 style={{ margin: "5px 0", color: "#1e40af", fontSize: "45px", fontWeight: "900" }}>#{myToken}</h1>
                <a href={`https://wa.me/91${phone}?text=${getWAMessage()}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ width: "100%", marginTop: "12px", padding: "14px", backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>
                    {t[language].wa}
                  </button>
                </a>
              </div>
            ) : (
              <button 
                onClick={() => bookToken(h)} 
                disabled={isBooking !== null || myToken !== null}
                style={{ 
                  width: "100%", padding: "15px", borderRadius: "12px", border: "none", 
                  backgroundColor: (isBooking || myToken) ? "#cbd5e1" : "#2563eb", 
                  color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer",
                  boxShadow: (isBooking || myToken) ? "none" : "0 4px 6px rgba(37, 99, 235, 0.2)"
                }}
              >
                {isBooking === h.id ? "⏳ Booking..." : t[language].book}
              </button>
            )}
          </div>
      ))}
    </div>
  );
}
