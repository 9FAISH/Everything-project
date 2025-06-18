import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AlertCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    title: '',
    description: '',
    threat_level: 'medium',
    source_ip: '',
    target_ip: '',
    attack_type: ''
  });

  useEffect(() => {
    fetchAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.patch(`${API}/alerts/${alertId}/resolve`);
      
      // Update alert in state
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_resolved: true, resolved_at: new Date().toISOString() }
            : alert
        )
      );
      
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert({ 
          ...selectedAlert, 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        });
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert. Please try again.');
    }
  };

  const createAlert = async () => {
    try {
      await axios.post(`${API}/alerts`, newAlert);
      setNewAlert({
        title: '',
        description: '',
        threat_level: 'medium',
        source_ip: '',
        target_ip: '',
        attack_type: ''
      });
      setShowCreateModal(false);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert. Please check the input data.');
    }
  };

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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTimeSince = (dateString) => {
    const now = new Date();
    const alertTime = new Date(dateString);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredAlerts = alerts.filter(alert => {
    const levelMatch = filterLevel === 'all' || alert.threat_level === filterLevel;
    const resolvedMatch = showResolved || !alert.is_resolved;
    return levelMatch && resolvedMatch;
  });

  const alertCounts = alerts.reduce((acc, alert) => {
    if (!alert.is_resolved) {
      acc[alert.threat_level] = (acc[alert.threat_level] || 0) + 1;
    }
    return acc;
  }, {});

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Threat Alert Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor and respond to security threats
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center space-x-2"
        >
          <span>🚨</span>
          <span>Create Alert</span>
        </button>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Alerts
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {alerts.filter(a => !a.is_resolved).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🚨</span>
            </div>
          </div>
        </div>

        {['critical', 'high', 'medium', 'low'].map(level => (
          <div key={level} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                  {level}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {alertCounts[level] || 0}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                level === 'critical' ? 'bg-red-100 dark:bg-red-900/20' :
                level === 'high' ? 'bg-orange-100 dark:bg-orange-900/20' :
                level === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                'bg-blue-100 dark:bg-blue-900/20'
              }`}>
                <span className="text-2xl">
                  {level === 'critical' ? '🔴' : 
                   level === 'high' ? '🟠' :
                   level === 'medium' ? '🟡' : '🔵'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alert Filters
          </h3>
          
          <div className="flex items-center space-x-4">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Threat Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span>Show Resolved</span>
            </label>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Threat Alerts ({filteredAlerts.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <ThreatLevelBadge level={alert.threat_level} />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {getTimeSince(alert.detected_at)}
                      </span>
                      {alert.is_resolved && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded-full">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {alert.title}
                    </h4>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                      {alert.source_ip && (
                        <span>Source: <span className="font-mono">{alert.source_ip}</span></span>
                      )}
                      {alert.target_ip && (
                        <span>Target: <span className="font-mono">{alert.target_ip}</span></span>
                      )}
                      {alert.attack_type && (
                        <span>Type: <span className="capitalize">{alert.attack_type.replace('_', ' ')}</span></span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(alert.detected_at)}
                    </span>
                    
                    {!alert.is_resolved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveAlert(alert.id);
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors duration-200"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No alerts found matching the current filters.
            </div>
          )}
        </div>
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create Threat Alert
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                    placeholder="Suspicious Activity Detected"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                    placeholder="Detailed description of the threat..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Threat Level
                  </label>
                  <select
                    value={newAlert.threat_level}
                    onChange={(e) => setNewAlert({...newAlert, threat_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Source IP
                    </label>
                    <input
                      type="text"
                      value={newAlert.source_ip}
                      onChange={(e) => setNewAlert({...newAlert, source_ip: e.target.value})}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target IP
                    </label>
                    <input
                      type="text"
                      value={newAlert.target_ip}
                      onChange={(e) => setNewAlert({...newAlert, target_ip: e.target.value})}
                      placeholder="10.0.0.50"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Attack Type
                  </label>
                  <input
                    type="text"
                    value={newAlert.attack_type}
                    onChange={(e) => setNewAlert({...newAlert, attack_type: e.target.value})}
                    placeholder="brute_force, malware, phishing, etc."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createAlert}
                  disabled={!newAlert.title || !newAlert.description}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
                >
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <ThreatLevelBadge level={selectedAlert.threat_level} />
                    {selectedAlert.is_resolved && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded-full">
                        RESOLVED
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getTimeSince(selectedAlert.detected_at)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedAlert.title}
                  </h3>
                </div>
                
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {selectedAlert.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {selectedAlert.source_ip && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Source IP
                        </h4>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">
                          {selectedAlert.source_ip}
                        </p>
                      </div>
                    )}
                    
                    {selectedAlert.target_ip && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Target IP
                        </h4>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">
                          {selectedAlert.target_ip}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {selectedAlert.attack_type && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Attack Type
                        </h4>
                        <p className="text-sm text-gray-900 dark:text-white capitalize">
                          {selectedAlert.attack_type.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Detected At
                      </h4>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDateTime(selectedAlert.detected_at)}
                      </p>
                    </div>
                    
                    {selectedAlert.resolved_at && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Resolved At
                        </h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDateTime(selectedAlert.resolved_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedAlert.ai_recommendation && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🤖 AI Recommendations
                    </h4>
                    <div className="text-sm text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 p-4 rounded whitespace-pre-wrap">
                      {selectedAlert.ai_recommendation}
                    </div>
                  </div>
                )}
                
                {!selectedAlert.is_resolved && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        resolveAlert(selectedAlert.id);
                        setSelectedAlert(null);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200"
                    >
                      Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertCenter;