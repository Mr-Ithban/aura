import { useState, useEffect, useRef } from "react";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

function computeScore(input) {
  if (!input) return 0;
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return (sum % 20001) - 10000; // Range: -10000 to 10000 (no clamp afterward)
}

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
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const scanAudioRef = useRef(null);
  const revealAudioRef = useRef(null);

  useEffect(() => {
    scanAudioRef.current = new Audio("/sounds/scan.mp3");
    revealAudioRef.current = new Audio("/sounds/reveal.mp3");
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
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayScore(Math.round(start + diff * eased));
      if (frame >= frames) clearInterval(id);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [result]);

  const saveToLeaderboard = async (score, reason) => {
    if (!username.trim()) {
      alert("Please enter a username first!");
      return;
    }

    try {
      const userRef = doc(db, "leaderboard", username.trim().toLowerCase());
      const existing = await getDoc(userRef);

      const numericScore = Number(score) || 0;

      if (existing.exists()) {
        const prevScore = Number(existing.data().score) || 0;
        const newScore = prevScore + numericScore; // No clamp, can go ±∞
        await setDoc(userRef, {
          username: username.trim(),
          score: newScore,
          reason,
          timestamp: serverTimestamp()
        });
      } else {
        await setDoc(userRef, {
          username: username.trim(),
          score: numericScore,
          reason,
          timestamp: serverTimestamp()
        });
      }
      fetchLeaderboard();
    } catch (err) {
      console.error("Error saving to leaderboard:", err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("score", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLeaderboard(data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const startScan = () => {
    if (!username.trim()) {
      alert("Please enter your name before scanning.");
      return;
    }

    const input = mode === "text" ? textInput.trim() : imageFile;
    if (!input) {
      alert("Please enter text or upload an image to scan.");
      return;
    }

    try {
      scanAudioRef.current?.play();
    } catch {}
    setResult(null);
    setScanning(true);
    setProgress(0);

    const animationPromise = new Promise((resolve) => {
      const total = 2200 + Math.random() * 1600;
      const start = Date.now();
      const tick = setInterval(() => {
        const elapsed = Date.now() - start;
        const p = Math.min(100, Math.floor((elapsed / total) * 100));
        setProgress(p);
        if (p >= 100) {
          clearInterval(tick);
          resolve();
        }
      }, 60);
    });

    const apiPromise = new Promise((resolve) => {
      const formData = new FormData();
      if (mode === "text") {
        formData.append("text", textInput.trim());
      } else if (imageFile) {
        formData.append("image", imageFile);
      }

      const backendBase =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

      fetch(`${backendBase}/analyze`, {
        method: "POST",
        body: formData
      })
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
              `Server responded with ${res.status}: ${errorText}`
            );
          }
          return res.json();
        })
        .then((data) => {
          if (
            typeof data?.score !== "number" ||
            typeof data?.reason !== "string"
          ) {
            throw new Error("Unexpected response format");
          }
          resolve({ score: Number(data.score), reason: data.reason });
        })
        .catch(() => {
          const source = mode === "text" ? textInput : imageFile?.name || "image";
          const score = computeScore(source);
          const reasons =
            score >= 0 ? positiveReasons : negativeReasons;
          const reason =
            reasons[Math.abs(score) % reasons.length];
          resolve({ score: Number(score), reason });
        });
    });

    Promise.all([animationPromise, apiPromise]).then(([_, apiResult]) => {
      setScanning(false);
      try {
        revealAudioRef.current?.play();
      } catch {}
      setResult(apiResult);
      saveToLeaderboard(apiResult.score, apiResult.reason);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black flex flex-col items-center p-6 text-white">
      <h1 className="text-4xl font-bold mb-6">Aura Meter 🔮</h1>

      {/* Username Input */}
      <input
        type="text"
        placeholder="Enter your name..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-72 p-3 rounded-lg text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
      />

      {/* Mode Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode("text")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            mode === "text"
              ? "bg-purple-600"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Text Mode
        </button>
        <button
          onClick={() => setMode("image")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            mode === "image"
              ? "bg-purple-600"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Image Mode
        </button>
      </div>

      {/* Input */}
      {mode === "text" ? (
        <input
          type="text"
          placeholder="Enter text..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="w-72 p-3 rounded-lg text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
        />
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="mb-4"
        />
      )}

      {/* Scan Button */}
      <button
        onClick={startScan}
        disabled={scanning}
        className={`px-6 py-3 rounded-lg font-bold text-lg transition ${
          scanning
            ? "bg-gray-500"
            : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {scanning ? "Scanning..." : "Scan Aura"}
      </button>

      {/* Progress */}
      {scanning && (
        <div className="mt-4 w-72 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="bg-purple-500 h-3 transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 p-6 bg-gray-900 rounded-xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold">Score: {displayScore}</h2>
          <p className="mt-2 text-gray-300">{result.reason}</p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-10 w-full max-w-lg bg-gray-900 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4">🏆 Leaderboard</h3>
        {leaderboard.length > 0 ? (
          <ol className="space-y-2">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.id}
                className="flex justify-between items-center bg-gray-800 px-4 py-2 rounded-lg"
              >
                <span className="font-semibold">
                  {i + 1}. {entry.username}
                </span>
                <span className="text-green-400">{entry.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-400">No scores yet!</p>
        )}
      </div>
    </div>
  );
}
