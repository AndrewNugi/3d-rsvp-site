// src/App.tsx
import Envelope from "./components/envelope";
import HostPage from "./components/host-page";

function App() {
  const isHost = window.location.pathname.replace(/\/$/, "") === "/host";
    return isHost ? <HostPage /> : <Envelope />;
}

export default App;