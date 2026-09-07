import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Dashboard from './Pages/Dashboard';
import Admin from './Pages/Admin';
import PostcardPage from './Pages/PostcardPage';
import PostcardWallPage from './Pages/PostcardWallPage';
import MapPage from './Pages/MapPage';
import { startPresence } from './lib/presence';

function App() {
  useEffect(() => {
    startPresence();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/postcard" element={<PostcardPage />} />
        <Route path="/postcard-wall" element={<PostcardWallPage />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </Router>
  );
}

export default App;