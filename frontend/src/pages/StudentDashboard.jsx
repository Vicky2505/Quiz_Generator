import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) {
      setError("Authentication required. Please login.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchQuizzes() {
      try {
        const { data, status } = await axios.get(
          "http://localhost:8000/student/quizzes",
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            timeout: 10000,
          }
        );

        if (status === 200 && Array.isArray(data.quizzes)) {
          setQuizzes(data.quizzes);
        } else {
          setError("Unexpected response from server.");
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError(err.response?.data?.message || err.message);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
    return () => controller.abort();
  }, [token]);

  if (loading) return <p style={{ textAlign: "center" }}>Loading quizzes...</p>;
  if (error) return <p style={{ color: "#e53e3e", textAlign: "center" }}>{error}</p>;
  if (quizzes.length === 0) return <p style={{ textAlign: "center" }}>No quizzes available.</p>;

  return (
    <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.2rem", color: "#4f46e5" }}>Student Dashboard</h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
          All your assigned quizzes are listed below. Click "Start Quiz" to begin.
        </p>
      </header>

      <div className="quiz-list">
        {quizzes.map(({ quiz_id, title, course_id, questions_count, description, submitted }) => (
          <div key={quiz_id} className="quiz-card">
            <div className="quiz-left">
              <img src="/quiz.jpg" alt="quiz" />
            </div>
            <div className="quiz-right">
              <p className="course-id">{course_id}</p>
              <h3 className="quiz-title">{title || "Untitled Quiz"}</h3>
              <p className="quiz-questions"><strong>Questions:</strong> {questions_count}</p>
              <button
                className="start-btn"
                onClick={() => !submitted && window.location.assign(`/quiz/${quiz_id}`)}
                disabled={submitted}
                title={submitted ? "You have already submitted this quiz" : "Start Quiz"}
              >
                {submitted ? "Submitted" : "Start Quiz"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .quiz-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .quiz-card {
          display: flex;
          background: #f9fafb;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .quiz-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }
        .quiz-left {
          flex: 0 0 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffffff;
        }
        .quiz-left img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }
        .quiz-right {
          flex: 1;
          padding: 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #c7c7c73e;
        }
        .course-id {
          font-size: 0.85rem;
          color: #4338ca;
          font-weight: 500;
        }
        .quiz-title {
          margin: 0.2rem 0 0.5rem;
          color: #4f46e5;
          font-size: 1.2rem;
        }
        .quiz-questions {
          color: #4b5563;
          font-size: 0.95rem;
          margin-bottom: 0.8rem;
        }
        .start-btn {
          align-self: flex-start;
          padding: 0.5rem 1rem;
          background-color: #6366f1;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background 0.2s ease;
        }
        .start-btn:hover:enabled {
          background-color: #4f46e5;
        }
        .start-btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        @media (max-width: 600px) {
          .quiz-card {
            flex-direction: column;
            align-items: center;
          }
          .quiz-left {
            width: 100%;
            padding: 1rem 0;
          }
          .quiz-right {
            width: 100%;
            padding: 0 1rem 1rem 1rem;
            text-align: center;
          }
          .start-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
