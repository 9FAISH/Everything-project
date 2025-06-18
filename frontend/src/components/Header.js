import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Header = ({ systemStatus }) => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/stats`);
        setDashboardStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const statsInterval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(statsInterval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Quick stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            {dashboardStats && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {dashboardStats.active_devices} Active Devices
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    dashboardStats.critical_vulnerabilities > 0 ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {dashboardStats.critical_vulnerabilities} Critical Issues
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    dashboardStats.unresolved_alerts > 0 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {dashboardStats.unresolved_alerts} Active Alerts
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side - Time and user info */}
        <div className="flex items-center space-x-6">
          {/* Current time */}
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* User avatar */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">Admin</div>
              <div className="text-gray-500 dark:text-gray-400">Security Analyst</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;