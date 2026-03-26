import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Player from './pages/Player';
import Profile from './pages/Profile';
import './App.css';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/drama/:id" element={<Player />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
