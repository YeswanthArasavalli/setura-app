import { useEffect, useState } from "react";
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
      title: "SETURA Booking", regTitle: "Patient Details", name: "Name *", phone: "Phone *", age: "Age", 
      village: "Village", blood: "Blood Group", diabetes: "Diabetes", bp: "BP", book: "Book Token", 
      serving: "Now Serving", success: "Token booked!", error: "Name & Phone required", 
      yourToken: "Your Token", wa: "Send via WhatsApp ✅", waPreview: "Message Preview:"
    },
    te: {
      title: "సేతుర బుకింగ్", regTitle: "పేషెంట్ వివరాలు", name: "పేరు *", phone: "ఫోన్ *", age: "వయస్సు", 
      village: "ఊరు", blood: "బ్లడ్ గ్రూప్", diabetes: "షుగర్", bp: "బీపీ", book: "టోకెన్ బుక్ చేయండి", 
      serving: "ప్రస్తుతం", success: "టోకెన్ బుక్ అయింది!", error: "పేరు & ఫోన్ అవసరం", 
      yourToken: "మీ టోకెన్", wa: "వాట్సాప్ పంపండి ✅", waPreview: "మెసేజ్ ప్రివ్యూ:"
    },
    hi: {
      title: "सेतुरा बुकिंग", regTitle: "मरीज का विवरण", name: "नाम *", phone: "फोन *", age: "उम्र", 
      village: "गांव", blood: "ब्लड ग्रुप", diabetes: "शुगर", bp: "बीपी", book: "टोकन बुक करें", 
      serving: "अभी चल रहा", success: "टोकन बुक हो गया!", error: "नाम और फोन जरूरी", 
      yourToken: "आपका टोकन", wa: "व्हाट्सएप भेजें ✅", waPreview: "संदेश पूर्वावलोकन:"
    }
  };

  useEffect(() => {
    fetchHospitals();
    const subscription = supabase
      .channel("live-tokens")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hospitals" }, () => fetchHospitals())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  async function fetchHospitals() {
    const { data, error } = await supabase.from("hospitals").select("*").order("name");
    if (error) console.error("Fetch Error:", error);
    setHospitals(data || []);
    setLoading(false);
  }

  async function bookToken(h) {
    // Validation
    if (!userName.trim() || !phone.trim()) {
      setMessage(`❌ ${t[language].error}`);
      return;
    }

    setIsBooking(h.id);
    setMessage("");

    try {
      // 1. Get next token number
      const { data: lastBooking, error: fetchError } = await supabase
        .from("bookings")
        .select("token_number")
        .eq("hospital_id", h.id)
        .order("token_number", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextToken = lastBooking?.length ? lastBooking[0].token_number + 1 : 1;

      // 2. Insert new booking
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

      // Success
      setMyToken(nextToken);
      setSelectedHospital(h);
      setMessage(`✅ ${t[language].success} #${nextToken}`);
      fetchHospitals();

    } catch (err) {
      console.error("Booking detailed error:", err);
      setMessage(`❌ Error: ${err.message || "Could not book token"}`);
    } finally {
      setIsBooking(null);
    }
  }

  const getWAMessage = () => {
    if (!selectedHospital) return "";
    const header = language === "te" ? "🎯 సేతుర టోకెన్" : "🎯 SETURA TOKEN";
    const msg = `${header}\n------------------\nHospital: ${selectedHospital.name}\nToken: #${myToken}\nPatient: ${userName}\n------------------`;
    return encodeURIComponent(msg);
  };

  const inputStyle = {
    width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db",
    fontSize: "16px", boxSizing: "border-box", marginBottom: "12px", outline: "none", color: "#000"
  };

  return (
    <div style={{ maxWidth: 500, margin: "20px auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
      
      {/* Language Bar */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginBottom: "15px" }}>
        {["en", "te", "hi"].map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)} style={{ padding: "5px 12px", borderRadius: "20px", border: "1px solid #2563eb", backgroundColor: language === lang ? "#2563eb" : "#fff", color: language === lang ? "#fff" : "#2563eb", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <h2 style={{ textAlign: "center", color: "#1e293b", fontSize: "24px", marginBottom: "20px" }}>{t[language].title}</h2>

      {message && <div style={{ padding: "12px", borderRadius: "8px", marginBottom: "20px", backgroundColor: message.includes("✅") ? "#dcfce7" : "#fee2e2", color: message.includes("✅") ? "#166534" : "#991b1b", textAlign: "center", fontWeight: "bold" }}>{message}</div>}

      {!myToken && (
        <div style={{ backgroundColor: "#f8fafc", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
          <h4 style={{ marginTop: 0, color: "#475569" }}>{t[language].regTitle}</h4>
          <input placeholder={t[language].name} value={userName} onChange={e => setUserName(e.target.value)} style={inputStyle} />
          <input placeholder={t[language].phone} type="tel" maxLength="10" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "10px" }}>
            <input placeholder={t[language].age} type="number" value={age} onChange={e => setAge(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input placeholder={t[language].blood} value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <input placeholder={t[language].village} value={village} onChange={e => setVillage(e.target.value)} style={inputStyle} />
          
          <div style={{ display: "flex", gap: "15px", padding: "5px" }}>
            <label style={{ cursor: "pointer", fontSize: "14px", color: "#000" }}><input type="checkbox" checked={hasDiabetes} onChange={e => setHasDiabetes(e.target.checked)} /> {t[language].diabetes}</label>
            <label style={{ cursor: "pointer", fontSize: "14px", color: "#000" }}><input type="checkbox" checked={hasBP} onChange={e => setHasBP(e.target.checked)} /> {t[language].bp}</label>
          </div>
        </div>
      )}

      <h3 style={{ color: "#1e293b", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>{t[language].select}</h3>

      {loading ? <p>Loading...</p> : hospitals.map(h => (
        <div key={h.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "15px", marginBottom: "15px", backgroundColor: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, color: "#1e293b" }}>{h.name}</h4>
            <div style={{ backgroundColor: "#fef3c7", padding: "5px 10px", borderRadius: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#92400e", fontWeight: "bold", display: "block" }}>{t[language].serving}</span>
              <span style={{ fontSize: "18px", fontWeight: "900", color: "#92400e" }}>#{h.current_token || 0}</span>
            </div>
          </div>

          {myToken && selectedHospital?.id === h.id ? (
            <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#eff6ff", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ color: "#1e40af", fontWeight: "bold" }}>{t[language].yourToken}</span>
              <h1 style={{ margin: "5px 0", color: "#1e40af", fontSize: "42px" }}>#{myToken}</h1>
              <a href={`https://wa.me/91${phone}?text=${getWAMessage()}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%", marginTop: "12px", padding: "12px", backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>{t[language].wa}</button>
              </a>
            </div>
          ) : (
            <button 
              onClick={() => bookToken(h)} 
              disabled={isBooking !== null || myToken !== null}
              style={{ width: "100%", marginTop: "12px", padding: "12px", backgroundColor: (isBooking || myToken) ? "#cbd5e1" : "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
            >
              {isBooking === h.id ? "Booking..." : t[language].book}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
