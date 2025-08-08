import { useState, useEffect, useRef } from "react";

/** (Keep your old computeScore only for a local fallback if needed) */
function computeScore(input) {
  if (!input) return 0;
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return (sum % 20001) - 10000;
}

/* --- same reasons — you can keep these if you want a local fallback --- */
const positiveReasons = [
  "Cosmic vibes aligned — your aura's on a coffee break with destiny.",
  "Radiant charm: you accidentally made someone’s day better.",
  "Your aura is powered by memes and good intentions."
];
const negativeReasons = [
  "Temporal miscalibration — blame the socks you wore today.",
  "Your aura hit snooze this morning. Try smiling.",
  "Lingering phantom grump from yesterday's snack shortage."
];

export default function App() {
  const [mode, setMode] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { score, reason }
  const [displayScore, setDisplayScore] = useState(0);
  const scanAudioRef = useRef(null);
  const revealAudioRef = useRef(null);

  useEffect(() => {
    scanAudioRef.current = new Audio("/sounds/scan.mp3");
    revealAudioRef.current = new Audio("/sounds/reveal.mp3");
    // Preload audio so play() later is more likely to succeed without user gesture
    scanAudioRef.current.load?.();
    revealAudioRef.current.load?.();
  }, []);

  useEffect(() => {
    if (!result) return;
    const target = result.score;
    const duration = 800;
    const fps = 60;
    const frames = Math.round((duration / 1000) * fps);
    let frame = 0;
    const start = 0;
    const diff = target - start;
    const id = setInterval(() => {
      frame++;
      const t = frame / frames;
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      setDisplayScore(Math.round(start + diff * eased));
      if (frame >= frames) clearInterval(id);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [result]);

  const startScan = () => {
    const input = mode === "text" ? textInput.trim() : imageFile;
    if (!input) {
      alert("Please enter text or upload an image to scan.");
      return;
    }

    try { scanAudioRef.current?.play(); } catch (e) { /* ignore autoplay errors */ }

    setResult(null);
    setScanning(true);
    setProgress(0);

    // Fake scanning progress (same feel as before)
    const total = 2200 + Math.random() * 1600;
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.floor((elapsed / total) * 100));
      setProgress(p);

      if (p >= 100) {
        clearInterval(tick);
        setScanning(false);

        // Build FormData and call backend
        const formData = new FormData();
        if (mode === "text") {
          formData.append("text", textInput.trim());
        } else if (imageFile) {
          formData.append("image", imageFile);
        }

        // Use a configurable backend base URL if you want (env var at build time),
        // fall back to localhost for local dev.
        const backendBase = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

        fetch(`${backendBase}/analyze`, {
          method: "POST",
          body: formData,
        })
          .then(async (res) => {
            if (!res.ok) {
              // Try to extract json error
              const txt = await res.text();
              throw new Error(`Server error: ${res.status} — ${txt}`);
            }
            return res.json();
          })
          .then((data) => {
            // Expect { score: number, reason: string }
            if (typeof data?.score !== "number" || typeof data?.reason !== "string") {
              // if server returns unexpected format => fallback to deterministic local
              console.warn("Unexpected server response:", data);
              // Call backend
              fetch("http://localhost:5000/analyze", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                  input: mode === "text" ? textInput : imageFile?.name || "image"
                     })
              })
          .then(res => res.json())
          .then(data => {
             try { revealAudioRef.current?.play(); } catch (e) {}
             setResult(data);
             })
           .catch(err => {
               console.error(err);
               alert("Error analyzing aura");
               });

              return;
            }

            setTimeout(() => {
              try { revealAudioRef.current?.play(); } catch (e) {}
              setResult({ score: data.score, reason: data.reason });
            }, 350);
          })
          .catch((err) => {
            console.error("Error fetching aura score:", err);
            alert("Something went wrong communicating with the server. The UI will show a local fallback.");
            // Local deterministic fallback so demo still works
            const source = mode === "text" ? textInput : imageFile?.name || "image";
            const score = computeScore(source);
            const reasons = score >= 0 ? positiveReasons : negativeReasons;
            const reason = reasons[Math.abs(score) % reasons.length];
            setTimeout(() => {
              try { revealAudioRef.current?.play(); } catch (e) {}
              setResult({ score, reason });
            }, 350);
          });
      }
    }, 60);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">Aura Meter</h1>
          <p className="text-gray-300 mt-2">Upload an image or type a moment — we'll pretend to read the cosmos.</p>
        </header>

        <main className="bg-gray-850 p-6 rounded-2xl shadow-2xl">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode("text")}
              className={`flex-1 p-2 rounded ${mode === "text" ? "bg-blue-500" : "bg-gray-700"}`}
            >
              Text
            </button>
            <button
              onClick={() => setMode("image")}
              className={`flex-1 p-2 rounded ${mode === "image" ? "bg-blue-500" : "bg-gray-700"}`}
            >
              Image
            </button>
          </div>

          {mode === "text" ? (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 resize-none h-36 focus:outline-none"
              placeholder="Describe the moment... (funny, weird, or serious — the aura doesn't judge)"
            />
          ) : (
            <div className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 flex flex-col items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-sm w-full"
              />
              {imageFile && <div className="text-sm text-gray-300">Selected: {imageFile.name}</div>}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={startScan}
              disabled={scanning}
              className={`flex-1 p-3 rounded-lg font-semibold ${scanning ? "bg-gray-600" : "bg-gradient-to-r from-purple-500 to-indigo-500"}`}
            >
              {scanning ? "Scanning..." : "Scan Aura"}
            </button>

            <button
              onClick={() => { setTextInput(""); setImageFile(null); setResult(null); setDisplayScore(0); }}
              className="p-3 rounded-lg bg-gray-700"
            >
              Reset
            </button>
          </div>

          <div className="mt-6">
            <div className="relative bg-gray-900 rounded-xl p-6 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`scanner-overlay ${scanning ? "active" : ""}`} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <div className="text-lg font-semibold">{scanning ? "Analyzing cosmic wavelengths..." : result ? "Ready" : "Idle"}</div>
                </div>

                <div className="w-48 text-right">
                  <div className="text-sm text-gray-400">Progress</div>
                  <div className="font-mono text-2xl">{progress}%</div>
                </div>
              </div>

              <div className="mt-4 bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-yellow-400" style={{ width: `${progress}%`, transition: "width 120ms linear" }} />
              </div>

              {result && (
                <div className="mt-6 bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-xl border border-gray-700 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400">Aura Score</div>
                      <div className="text-5xl font-bold tracking-tight">{displayScore}</div>
                    </div>
                    <div className="text-right max-w-xs">
                      <div className="text-sm text-gray-400">Why</div>
                      <div className="mt-2">{result.reason}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-4 text-xs text-gray-400">
            (This frontend expects a backend `/analyze` endpoint — a deterministic local fallback will be used if the server fails.)
          </footer>
        </main>
      </div>

      <style jsx>{`
        .scanner-overlay {
          width: 70%;
          height: 40%;
          border-radius: 12px;
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%);
          transform: translateY(-120%);
          opacity: 0;
          transition: transform 1.1s ease, opacity 0.6s ease;
          box-shadow: 0 0 40px rgba(125, 70, 255, 0.06), 0 0 120px rgba(255, 100, 180, 0.02);
        }
        .scanner-overlay.active {
          transform: translateY(0%);
          opacity: 1;
          animation: sweep 1.2s linear infinite;
        }
        @keyframes sweep {
          0% { transform: translateY(-120%); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(0%); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
