import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ currentPage, setCurrentPage, systemStatus }) => {
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '🛡️',
      description: 'Security Overview'
    },
    {
      id: 'scanner',
      name: 'Network Scanner',
      icon: '🔍',
      description: 'Device Discovery'
    },
    {
      id: 'devices',
      name: 'Devices',
      icon: '💻',
      description: 'Asset Management'
    },
    {
      id: 'vulnerabilities',
      name: 'Vulnerabilities',
      icon: '⚠️',
      description: 'Security Issues'
    },
    {
      id: 'alerts',
      name: 'Threat Alerts',
      icon: '🚨',
      description: 'Active Threats'
    }
  ];

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'online': return 'System Online';
      case 'degraded': return 'System Degraded';
      case 'offline': return 'System Offline';
      default: return 'Checking...';
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              SentinelSecure
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cybersecurity Platform
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
              currentPage === item.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <span className="text-2xl">{isDark ? '☀️' : '🌙'}</span>
          <div>
            <div className="font-medium">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Switch theme
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};