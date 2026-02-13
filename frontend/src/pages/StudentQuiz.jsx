import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const StudentQuiz = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) {
      setError("You must be logged in to access the quiz.");
      return;
    }
    if (!quizId) {
      setError("Quiz ID is missing from the URL.");
      return;
    }

    setLoading(true);
    axios
      .get(`http://localhost:8000/student/quiz/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setQuiz(response.data.questions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching quiz:", err);
        setError("Failed to load quiz.");
        setLoading(false);
      });
  }, [token, quizId]);

  const escapeForInline = (s = "") =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");

  const openQuizInPopup = () => {
    if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
      alert("Quiz data not loaded yet.");
      return;
    }

    const width = window.screen.width;
    const height = window.screen.height;
    const popupFeatures = `width=${width},height=${height},left=0,top=0,toolbar=no,menubar=no,location=no,status=no,resizable=no,scrollbars=no`;
    const quizWindow = window.open("", "_blank", popupFeatures);

    if (!quizWindow) {
      alert("Popup blocked! Please allow popups for this site.");
      return;
    }

    const safeToken = escapeForInline(token || "");
    const safeQuizId = escapeForInline(quizId || "");
    const serializedQuiz = JSON.stringify(quiz)
      .replace(/<\/script/gi, "<\\/script")
      .replace(/<!--/g, "<\\!--");

    const popupHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Student Quiz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          html, body { margin:0; padding:0; height:100%; font-family: Arial, sans-serif; background:#f9fafb; overflow:hidden; }
          .app { display:flex; height:100vh; flex-direction: row-reverse; }
          .sidebar {
            width: 220px;
            background:#111827;
            color:#fff;
            display:grid;
            grid-template-columns: repeat(3, 1fr);
            grid-auto-rows: 50px;
            gap: 8px;
            padding: 12px;
            position: relative;
          }
          .question-circle {
            width:36px;
            height:36px;
            border-radius:50%;
            display:flex;
            justify-content:center;
            align-items:center;
            cursor:pointer;
            color:#fff;
            font-weight:bold;
            margin-top:10rem;
          }
          .answered { background:#10b981;}
          .unanswered { background:#ef4444;}
          .legend {
            display:flex;
            flex-direction: column;
            gap:6px;
            margin-top:10rem;
            font-size:0.85rem;
            grid-column: span 3;
          }
          .legend-item { display:flex; align-items:center; gap:6px; }
          .legend-circle { width: 16px; height: 16px; border-radius:50%; display:inline-block; }
          .main { flex:1; padding:20px; overflow:auto; }
          .question { background:#fff; border-radius:8px; padding:16px; margin-bottom:16px; box-shadow:0 2px 6px rgba(0,0,0,0.06); }
          label { display:block; margin:8px 0; cursor:pointer; }
          button { padding:8px 16px; margin-right:8px; border-radius:6px; border:none; background:#2563eb; color:white; cursor:pointer; }
        </style>
      </head>
      <body>
        <div class="app">
          <div class="sidebar" id="sidebar"></div>

          <!-- Exam UI -->
          <div class="main" id="exam-ui" style="display:none;">
            <h1>Student Quiz</h1>
            <div id="question-container"></div>
            <div class="nav">
              <button id="prevBtn">Previous</button>
              <button id="nextBtn">Next</button>
              <button id="submitBtn">Submit Quiz</button>
            </div>
            <div id="status" style="margin-top:1rem;color:#b91c1c;"></div>
          </div>

          <!-- Fullscreen Start Screen -->
          <div id="fullscreen-screen" style="height:100%;width:100%;display:flex;justify-content:center;align-items:center;">
            <button id="startFullscreenBtn" style="padding:1rem 2rem; font-size:1.2rem; cursor:pointer;">
              Enter Fullscreen to Start Exam
            </button>
          </div>
        </div>

        <script>
        (function() {
          const QUIZ_ID = "${safeQuizId}";
          const TOKEN = "${safeToken}";
          const API_SUBMIT = "http://localhost:8000/student/quiz/${escapeForInline(quizId)}/submit";
          const API_HEARTBEAT = "http://localhost:8000/api/exam/heartbeat";
          const QUIZ = ${serializedQuiz};
          const HEARTBEAT_INTERVAL_MS = 5000;
          const DEVTOOLS_DETECT_INTERVAL_MS = 1200;

          const answers = {};
          let currentIndex = 0;
          let heartbeatInterval = null;
          let devtoolsInterval = null;
          let tampered = false;
          let submitted = false;

          const examUI = document.getElementById('exam-ui');
          const fullscreenScreen = document.getElementById('fullscreen-screen');
          const startBtn = document.getElementById('startFullscreenBtn');
          const questionContainer = document.getElementById('question-container');
          const sidebar = document.getElementById('sidebar');
          const statusEl = document.getElementById('status');

          function escapeHtml(s) {
            if (s === null || s === undefined) return "";
            return String(s).replace(/[&<>"'\/]/g, function (ch) {
              return "&#" + ch.charCodeAt(0) + ";";
            });
          }

          function markTamperedAndSubmit(reason) {
            if (tampered) return;
            tampered = true;
            statusEl.innerText = "Suspicious behavior detected: " + reason + ". Auto-submitting...";
            setTimeout(() => submitQuiz({ tampered: true, reason }), 800);
          }

          function renderSidebar() {
            sidebar.innerHTML = "";
            QUIZ.forEach((q, i) => {
              const circle = document.createElement("div");
              circle.className = "question-circle " + (answers[i] ? "answered" : "unanswered");
              circle.innerText = i + 1;
              circle.onclick = () => { currentIndex = i; renderQuestion(); };
              sidebar.appendChild(circle);
            });

            const legend = document.createElement("div");
            legend.className = "legend";
            legend.innerHTML = \`
              <div class="legend-item"><span class="legend-circle" style="background:#10b981;"></span> Answered</div>
              <div class="legend-item"><span class="legend-circle" style="background:#ef4444;"></span> Not Answered</div>
            \`;
            sidebar.appendChild(legend);
          }

          function renderQuestion() {
            const q = QUIZ[currentIndex];
            questionContainer.innerHTML = \`
              <div class="question">
                <h3>Q\${currentIndex + 1}: \${escapeHtml(q.question)}</h3>
                \${q.options.map(opt => \`<label><input type="radio" name="q\${currentIndex}" value="\${escapeHtml(opt)}" \${answers[currentIndex] === escapeHtml(opt) ? "checked" : ""} /> \${escapeHtml(opt)}</label>\`).join("")}
              </div>
            \`;
            renderSidebar();
          }

          document.getElementById('nextBtn').onclick = () => { if(currentIndex < QUIZ.length - 1) { currentIndex++; renderQuestion(); } };
          document.getElementById('prevBtn').onclick = () => { if(currentIndex > 0) { currentIndex--; renderQuestion(); } };

          questionContainer.addEventListener('change', (e) => {
            if(e.target.name && e.target.name.startsWith('q')) {
              const idx = parseInt(e.target.name.substring(1), 10);
              answers[idx] = e.target.value;
              renderSidebar();
            }
          });

          document.getElementById('submitBtn').addEventListener('click', () => submitQuiz({ tampered: false, reason: "user-submitted" }));

          function submitQuiz(meta = {}) {
            if (submitted) return;
            submitted = true;
            const payload = { answers, tampered: !!meta.tampered, tamperReason: meta.reason || null, timestamp: Date.now() };
            fetch(API_SUBMIT, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
              body: JSON.stringify(payload)
            })
            .then(() => {
              document.body.innerHTML = "<div style='padding:2rem; font-family: Arial, sans-serif;'><h2>Exam submitted successfully.</h2><p>Redirecting to dashboard...</p></div>";
              setTimeout(() => {
                try { window.close(); } catch(e) {}
                if (window.opener && !window.opener.closed) window.opener.location.href = "/student";
              }, 2500);
            })
            .catch(err => {
              console.error("Submit failed:", err);
              document.body.innerHTML = "<div style='padding:2rem; font-family: Arial, sans-serif;'><h2>Submission failed</h2><p>Network error.</p></div>";
            })
            .finally(() => clearIntervals());
          }

          function startHeartbeat() {
            heartbeatInterval = setInterval(() => {
              try {
                navigator.sendBeacon(API_HEARTBEAT, JSON.stringify({ quizId: QUIZ_ID, timestamp: Date.now() }));
              } catch(e) {
                fetch(API_HEARTBEAT, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
                  body: JSON.stringify({ quizId: QUIZ_ID, timestamp: Date.now() })
                }).catch(()=>{});
              }
            }, HEARTBEAT_INTERVAL_MS);
          }

          function onFullscreenChange() { if (!document.fullscreenElement) markTamperedAndSubmit("Exited fullscreen"); }

          document.addEventListener("fullscreenchange", onFullscreenChange);
          document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") markTamperedAndSubmit("Visibility hidden"); });
          window.addEventListener("blur", () => markTamperedAndSubmit("Window lost focus"));
          document.addEventListener("contextmenu", e => e.preventDefault());
          document.addEventListener("copy", e => e.preventDefault());
          document.addEventListener("cut", e => e.preventDefault());
          document.addEventListener("paste", e => e.preventDefault());

          document.addEventListener("keydown", (e) => {
            const blocked = [
              e.key === "F12",
              (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "J"),
              (e.ctrlKey || e.metaKey) && e.key === "U",
              (e.ctrlKey || e.metaKey) && e.key === "S",
              (e.ctrlKey || e.metaKey) && e.key === "P",
              (e.ctrlKey || e.metaKey) && e.key === "R"
            ];
            if (blocked.some(Boolean)) { e.preventDefault(); e.stopPropagation(); markTamperedAndSubmit("Blocked shortcut"); }
          }, true);

          function startDevtoolsDetection() {
            devtoolsInterval = setInterval(() => {
              try {
                const ow = window.outerWidth, oh = window.outerHeight, iw = window.innerWidth, ih = window.innerHeight;
                if (Math.abs((ow-iw)>160) || Math.abs((oh-ih)>160)) markTamperedAndSubmit("DevTools likely open");
                const t0 = performance.now();
                for (let i=0;i<100000;i++){}
                const t1 = performance.now();
                if (t1-t0>80) markTamperedAndSubmit("Long execution delay");
              } catch(e){}
            }, DEVTOOLS_DETECT_INTERVAL_MS);
          }

          function clearIntervals() { if (heartbeatInterval) clearInterval(heartbeatInterval); if (devtoolsInterval) clearInterval(devtoolsInterval); }

          window.addEventListener("beforeunload", e => { e.preventDefault(); e.returnValue=""; markTamperedAndSubmit("Navigating away"); });

          startBtn.onclick = () => {
            const el = document.documentElement;
            if (el.requestFullscreen) {
              el.requestFullscreen().then(() => {
                fullscreenScreen.style.display = "none";
                examUI.style.display = "block";
                renderQuestion();
                startHeartbeat();
                startDevtoolsDetection();
              }).catch(() => alert("Allow fullscreen to start exam."));
            } else alert("Fullscreen not supported");
          };
        })();
        </script>
      </body>
      </html>
    `;

    quizWindow.document.open();
    quizWindow.document.write(popupHtml);
    quizWindow.document.close();
    try { quizWindow.focus(); } catch(e){}
  };

return (
    <div style={{ maxWidth: "820px", margin: "24px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Student Quiz</h1>
      {loading && <p>Loading quiz...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <>
          <p>Press <strong>Start Quiz</strong> to open the exam in a secure window. Make sure your popups are allowed and you are using a supported browser.</p>
          <button
            onClick={openQuizInPopup}
            style={{ padding: "0.6rem 1.2rem", cursor: "pointer", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6 }}
          >
            Start Quiz
          </button>
          <div style={{ marginTop: 12, color: "#374151" }}>
            <strong>Notes:</strong>
            <ul>
              <li>For best results, use latest Chrome or Edge.</li>
              <li>This increases tamper detection but is not foolproof; for full lockdown use SEB / kiosk mode / Electron + OS controls.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentQuiz;
