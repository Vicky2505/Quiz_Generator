// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav>
      <ul>
        <li><Link to="/staff-dashboard">Staff Dashboard</Link></li>
        <li><Link to="/student-dashboard">Student Dashboard</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
