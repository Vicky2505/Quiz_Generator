import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/Dashboard.css";

function StaffDashboard() {
  const [pdf, setPdf] = useState(null);
  const [courseId, setCourseId] = useState(""); // default
  const [title, setTitle] = useState(""); // new Title input
  const [message, setMessage] = useState("");
  const [recentQuizzes, setRecentQuizzes] = useState([]);

  const token = localStorage.getItem("access_token");
  const fileInputRef = useRef(null);

  // ---------------- Handlers ----------------
  const handleFileChange = (e) => setPdf(e.target.files[0]);
  const handleCourseIdChange = (e) => setCourseId(e.target.value);
  const handleTitleChange = (e) => setTitle(e.target.value);

  const fetchRecentQuizzes = async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:8000/staff/quizzes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecentQuizzes();
  }, []);

  // ---------------- Upload PDF ----------------
  const handleUpload = async () => {
    if (!pdf || !courseId || !title) {
      alert(!pdf ? "Please select a PDF" : !courseId ? "Please select a course" : "Please enter a title");
      return;
    }
    if (!token) {
      alert("You are not logged in!");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdf);
    formData.append("course_id", courseId);
    formData.append("title", title); // send title to backend

    try {
      const res = await axios.post(
        "http://localhost:8000/staff/quiz/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } }
      );

      setMessage(res.data.message || "Quiz uploaded successfully!");
      fetchRecentQuizzes();

      // Clear input fields
      setPdf(null);
      setCourseId(""); // reset dropdown
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error(err);
      setMessage("Upload failed. Try again.");
    }
  };

  // ---------------- Click to view quiz in new popup ----------------
  const handleCardClick = async (quiz_id) => {
    if (!token) return;
    try {
      const res = await axios.get(`http://localhost:8000/staff/quiz/${quiz_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const quiz = res.data;

      const popup = window.open(
        "",
        "_blank",
        "width=800,height=600,scrollbars=yes,resizable=yes"
      );

      popup.document.write(`
        <html>
        <head>
          <title>${quiz.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; background: #f0f2f5; }
            .question { border: 1px solid #ccc; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; background: #fff; }
            h2 { color: #2563eb; }
            ul { padding-left: 1.5rem; }
            li { margin-bottom: 0.4rem; }
          </style>
        </head>
        <body>
          <h2>${quiz.title}</h2>
          ${quiz.questions.map((q, idx) => `
            <div class="question">
              <h4>Q${idx + 1}: ${q.question}</h4>
              <ul>
                ${q.options.map(opt => `<li>${opt}</li>`).join("")}
              </ul>
              <p><strong>Answer:</strong> ${q.answer}</p>
            </div>
          `).join("")}
        </body>
        </html>
      `);
      popup.document.close();

    } catch (err) {
      console.error(err);
      alert("Failed to load quiz details");
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="container">
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.2rem", color: "#4f46e5" }}>Staff Dashboard</h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
          All your quizzes can be uploaded here. Select the PDF, choose the course, enter the title, and click "Upload" to submit.
        </p>
      </header>

      {/* ---------------- Upload Section ---------------- */}
      <div className="upload-section">
        <div className="upload-box" onClick={() => fileInputRef.current.click()}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M5 20h14v-2H5v2zm7-14l5 5h-3v4h-4v-4H7l5-5z"/>
          </svg>
          <p>{pdf ? pdf.name : "Click or Drag PDF Here"}</p>
          <input
            id="fileInput"
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {/* ---------------- Course Dropdown ---------------- */}
        <select value={courseId} onChange={handleCourseIdChange}>
          <option value="" disabled>Select the Course</option>
          <option value="AD22701">AD22701</option>
          <option value="AD22702">AD22702</option>
          <option value="AD22703">AD22703</option>
          <option value="AD22704">AD22704</option>
          <option value="AD22705">AD22705</option>
        </select>

        {/* ---------------- Title Input ---------------- */}
        <input
          type="text"
          placeholder="Enter Quiz Title"
          value={title}
          onChange={handleTitleChange}
        />

        <button onClick={handleUpload}>Upload PDF</button>
        {message && <div className="message">{message}</div>}
      </div>

      {/* ---------------- Recent Uploads ---------------- */}
      <div className="recent-uploads">
        {recentQuizzes.map((quiz) => (
          <div
            className="recent-card"
            key={quiz.quiz_id}
            onClick={() => handleCardClick(quiz.quiz_id)}
            style={{ cursor: "pointer" }}
          >
            <h4>{quiz.title}</h4>
            <p><strong>Course ID:</strong> {quiz.course_id}</p>
            <p><strong>Questions:</strong> {quiz.questions_count}</p>
            <p><strong>Uploaded:</strong> {new Date(quiz.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

export default StaffDashboard;
