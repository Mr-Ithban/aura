import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect, useState } from "react";

export default function Leaderboard() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    async function fetchScores() {
      const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(10));
      const snapshot = await getDocs(q);
      setScores(snapshot.docs.map(doc => doc.data()));
    }
    fetchScores();
  }, []);

  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-3">Leaderboard</h2>
      <ul>
        {scores.map((entry, i) => (
          <li key={i}>
            {i + 1}. <strong>{entry.username}</strong> — {entry.score} ({entry.reason})
          </li>
        ))}
      </ul>
    </div>
  );
}
