import React, { useState } from "react";

const API_URL = "http://localhost:8080";

const Roulette: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = async () => {
    const res = await fetch(`${API_URL}/create-session`, { method: "POST" });
    const data = await res.json();
    setSessionId(data.sessionId);
    setServerSeedHash(data.serverSeedHash);
    setResult(null);
  };

  const spin = async () => {
    if (!sessionId) return alert("Najpierw utwórz sesję!");
    setLoading(true);
    const clientSeed = Math.random().toString(36).substring(2, 10);

    const res = await fetch(`${API_URL}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, clientSeed }),
    });

    const data = await res.json();
    setLoading(false);
    setResult(data.result);

    console.log("=== Spin details ===");
    console.log("serverSeed:", data.serverSeed);
    console.log("serverSeedHash:", data.serverSeedHash);
    console.log("clientSeed:", data.clientSeed);
    console.log("nonce:", data.nonce);
    console.log("proof:", data.proof);

    // Tu możesz dodać lokalną weryfikację proofa (sha256)
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>🎰 Provably Fair Roulette</h2>

      {!sessionId ? (
        <button onClick={createSession}>Utwórz sesję</button>
      ) : (
        <>
          <p>Session ID: {sessionId}</p>
          <p>ServerSeedHash: {serverSeedHash}</p>
          <button onClick={spin} disabled={loading}>
            {loading ? "Losuję..." : "Puść piłeczkę"}
          </button>
        </>
      )}

      {result !== null && <h3>🎯 Wypadło: {result}</h3>}
    </div>
  );
};

export default Roulette;
