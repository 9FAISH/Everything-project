import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, scansResponse, alertsResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/scans?limit=5`),
        axios.get(`${API}/alerts?limit=5&unresolved_only=true`)
      ]);

      setDashboardStats(statsResponse.data);
      setRecentScans(scansResponse.data);
      setRecentAlerts(alertsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, description, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            vs last week
          </span>
        </div>
      )}
    </div>
  );

  const ThreatLevelBadge = ({ level }) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      info: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level] || colors.info}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  const ScanStatusBadge = ({ status }) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Security Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor your network security posture and threat landscape
        </p>
      </div>

      {/* Stats Grid */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Devices"
            value={dashboardStats.total_devices}
            icon="💻"
            color="bg-blue-100 dark:bg-blue-900/20 text-blue-600"
            description={`${dashboardStats.active_devices} active`}
            trend={5}
          />
          <StatCard
            title="Vulnerabilities"
            value={dashboardStats.total_vulnerabilities}
            icon="⚠️"
            color="bg-orange-100 dark:bg-orange-900/20 text-orange-600"
            description={`${dashboardStats.critical_vulnerabilities} critical`}
            trend={-12}
          />
          <StatCard
            title="Active Alerts"
            value={dashboardStats.unresolved_alerts}
            icon="🚨"
            color="bg-red-100 dark:bg-red-900/20 text-red-600"
            description="Requires attention"
            trend={-8}
          />
          <StatCard
            title="Scans Today"
            value={dashboardStats.scans_today}
            icon="🔍"
            color="bg-green-100 dark:bg-green-900/20 text-green-600"
            description="Automated & manual"
            trend={15}
          />
        </div>
      )}

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Level Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Threat Level Distribution
          </h3>
          {dashboardStats && (
            <div className="space-y-3">
              {Object.entries(dashboardStats.threat_level_distribution).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ThreatLevelBadge level={level} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {level} Threats
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Types */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Device Types
          </h3>
          {dashboardStats && (
            <div className="space-y-3">
              {Object.entries(dashboardStats.device_type_distribution).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scans */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Scans
          </h3>
          <div className="space-y-3">
            {recentScans.length > 0 ? (
              recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {scan.scan_type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {scan.target}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(scan.started_at)}
                    </p>
                  </div>
                  <ScanStatusBadge status={scan.status} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No recent scans
              </p>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Active Threat Alerts
          </h3>
          <div className="space-y-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {alert.description.substring(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDateTime(alert.detected_at)}
                    </p>
                  </div>
                  <ThreatLevelBadge level={alert.threat_level} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No active alerts
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
            <span className="text-2xl">🔍</span>
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Start Network Scan
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Discover devices
              </p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors duration-200">
            <span className="text-2xl">⚠️</span>
            <div className="text-left">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Vulnerability Scan
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Check for threats
              </p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200">
            <span className="text-2xl">📊</span>
            <div className="text-left">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Generate Report
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Security summary
              </p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200">
            <span className="text-2xl">🤖</span>
            <div className="text-left">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                AI Analysis
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Get recommendations
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;