import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

// Import components
import Dashboard from "./components/Dashboard";
import DeviceManager from "./components/DeviceManager";
import VulnerabilityScanner from "./components/VulnerabilityScanner";
import AlertCenter from "./components/AlertCenter";
import NetworkScanner from "./components/NetworkScanner";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { ThemeProvider } from "./context/ThemeContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState('checking');

  // Check system health on startup
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const response = await axios.get(`${API}/health`);
        if (response.data.status === 'healthy') {
          setSystemStatus('online');
        } else {
          setSystemStatus('degraded');
        }
      } catch (error) {
        console.error('System health check failed:', error);
        setSystemStatus('offline');
      }
    };

    checkSystemHealth();
    
    // Check health every 30 seconds
    const healthInterval = setInterval(checkSystemHealth, 30000);
    
    return () => clearInterval(healthInterval);
  }, []);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'devices':
        return <DeviceManager />;
      case 'vulnerabilities':
        return <VulnerabilityScanner />;
      case 'alerts':
        return <AlertCenter />;
      case 'scanner':
        return <NetworkScanner />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <BrowserRouter>
          <div className="flex h-screen">
            {/* Sidebar */}
            <Sidebar 
              currentPage={currentPage} 
              setCurrentPage={setCurrentPage}
              systemStatus={systemStatus}
            />
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <Header systemStatus={systemStatus} />
              
              {/* Page Content */}
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
                {renderCurrentPage()}
              </main>
            </div>
          </div>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;