import { useState } from "react"
import Hospitals from "./pages/Hospitals"
import Bookings from "./pages/Bookings"

function App() {
  const [page, setPage] = useState("hospitals")

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setPage("hospitals")}>
          User View
        </button>

        <button onClick={() => setPage("bookings")}>
          Staff View
        </button>
      </div>

      {page === "hospitals" && <Hospitals />}
      {page === "bookings" && <Bookings />}
    </div>
  )
}

export default App