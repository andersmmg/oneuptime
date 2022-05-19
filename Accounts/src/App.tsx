import React from 'react';
import './App.scss';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './Pages/Login';

function App() {
    return (
        <div className="App">
            <div className="brand">
                <img
                    alt="OneUpTime"
                    src="/assets/img/logos/OneUptimeSVG/3.svg"
                />
            </div>
            <Router>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<LoginPage />} />
                    <Route path="/register" element={<LoginPage />} />
                    <Route path="/login/sso" element={<LoginPage />} />
                    <Route path="/verify-email" element={<LoginPage />} />
                </Routes>
            </Router>
        </div>
    );
}

export default App;
