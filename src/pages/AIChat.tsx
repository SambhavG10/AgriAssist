import React, { useState, useEffect } from "react";
import { useLogger } from "@/context/LoggerContext";

const AiChat: React.FC = () => {
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "ml-IN" | "hi-IN">("en");
  const { logAction } = useLogger();

  useEffect(() => {
    logAction("Visited AI Chat Page");
  }, []);

  // ---------------------------------------
  // MAIN CHATBOT FUNCTION
  // ---------------------------------------
  const sendQuery = async () => {
    if (!query.trim()) {
      console.warn("⚠️ No query entered");
      return;
    }

    logAction("Sent Query to AI Chat");
    console.log("🚀 Sending Query to Backend:", query);
    console.log("🌐 Language:", language);

    setLoading(true);
    setReply("");

    try {
      console.log("📡 Making request to /api/chatbots...");
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          language,
        }),
      });

      console.log("📥 Received Response Status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Backend returned non-200 response:", text);
        setReply("Server error. Please try again.");
        setLoading(false);
        return;
      }

      let data = null;

      try {
        data = await res.json();
        console.log("✅ Parsed JSON Successfully:", data);
      } catch (jsonError) {
        console.error("❌ Error parsing JSON from backend:", jsonError);
        setReply("Invalid response format.");
        setLoading(false);
        return;
      }

      if (!data?.reply) {
        console.error("❌ Missing 'reply' field in backend output:", data);
        setReply("Unexpected server response.");
      } else {
        console.log("🤖 AI Reply:", data.reply);
        setReply(data.reply);
      }
    } catch (err) {
      console.error("💥 NETWORK / FETCH ERROR:", err);
      setReply("Network error. Please try again.");
    }

    setLoading(false);
  };

  // ---------------------------------------
  // RENDER UI
  // ---------------------------------------
  return (
    <div style={styles.container}>
      <h2>AgriAssist Chatbot</h2>

      <textarea
        style={styles.input}
        placeholder="Ask your farming question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div style={styles.row}>
        <label>Select Language: </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "ml-IN" | "hi-IN")}
          style={styles.select}
        >
          <option value="en">English</option>
          <option value="ml-IN">Malayalam</option>
          <option value="hi-IN">Hindi</option>
        </select>
      </div>

      <button style={styles.button} onClick={sendQuery} disabled={loading}>
        {loading ? "Processing..." : "Ask AgriAssist"}
      </button>

      <div style={styles.replyBox}>
        <h3>Response:</h3>
        {loading ? (
          <p>⏳ Getting response...</p>
        ) : (
          <p>{reply ? reply.replace(/\*/g, '') : "No response yet."}</p>
        )}
      </div>
    </div>
  );
};

export default AiChat;

// ---------------------------------------
// SIMPLE INLINE STYLES (Optional)
// ---------------------------------------
const styles = {
  container: {
    width: "95%",
    maxWidth: "600px",
    margin: "20px auto",
    padding: "20px",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    fontFamily: "Inter, system-ui, sans-serif",
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  input: {
    width: "100%",
    height: "120px",
    padding: "12px",
    fontSize: "16px",
    marginBottom: "16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    outline: "none",
  },
  select: {
    padding: "8px",
    marginLeft: "10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "10px",
    cursor: "pointer",
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    transition: "background-color 0.2s",
  },
  replyBox: {
    marginTop: "24px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
  },
  row: {
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
} as const;
