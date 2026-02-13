import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../styles/login.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:8000/auth/login", {
        email,
        password,
      });

      const { access_token, role } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("role", role);

      if (role === "staff") navigate("/staff");
      else if (role === "student") navigate("/student");
      else setErrorMsg("Unknown user role");
    } catch (error) {
      if (error.response) setErrorMsg(error.response.data.msg || "Login failed.");
      else if (error.request) setErrorMsg("No response from server.");
      else setErrorMsg("An unexpected error occurred.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-image">
          <img src="/login.jpg" alt="Login Visual" />
        </div>
        <div className="login-form">
          <h2>Welcome Staff & Student</h2>
          {errorMsg && <p className="login-error">{errorMsg}</p>}
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
