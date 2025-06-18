import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NetworkScanner = () => {
  const [scanTarget, setScanTarget] = useState('192.168.1.0/24');
  const [scanType, setScanType] = useState('network_discovery');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [currentScan, setCurrentScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    fetchScanHistory();
    
    // Refresh scan history every 10 seconds
    const interval = setInterval(fetchScanHistory, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchScanHistory = async () => {
    try {
      const response = await axios.get(`${API}/scans?limit=10`);
      setScanHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch scan history:', error);
    }
  };

  const startScan = async () => {
    if (!scanTarget.trim()) {
      alert('Please enter a scan target');
      return;
    }

    setIsScanning(true);
    setCurrentScan(null);
    setScanResults([]);

    try {
      const response = await axios.post(`${API}/scans`, {
        scan_type: scanType,
        target: scanTarget,
        options: {}
      });

      setCurrentScan(response.data);
      
      // Poll for scan results
      pollScanStatus(response.data.id);
      
    } catch (error) {
      console.error('Failed to start scan:', error);
      alert('Failed to start scan. Please try again.');
      setIsScanning(false);
    }
  };

  const pollScanStatus = async (scanId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/scans/${scanId}`);
        const scan = response.data;
        
        setCurrentScan(scan);
        
        if (scan.status === 'completed' || scan.status === 'failed') {
          clearInterval(pollInterval);
          setIsScanning(false);
          
          if (scan.status === 'completed') {
            // Fetch discovered devices if network discovery
            if (scan.scan_type === 'network_discovery') {
              fetchDiscoveredDevices();
            }
          }
          
          // Refresh scan history
          fetchScanHistory();
        }
      } catch (error) {
        console.error('Failed to poll scan status:', error);
        clearInterval(pollInterval);
        setIsScanning(false);
      }
    }, 2000);
  };

  const fetchDiscoveredDevices = async () => {
    try {
      const response = await axios.get(`${API}/devices`);
      setScanResults(response.data);
    } catch (error) {
      console.error('Failed to fetch discovered devices:', error);
    }
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

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
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

  const DeviceTypeIcon = ({ type }) => {
    const icons = {
      server: '🖥️',
      workstation: '💻',
      router: '🌐',
      switch: '🔌',
      printer: '🖨️',
      mobile: '📱',
      iot: '📟',
      unknown: '❓'
    };
    
    return <span className="text-xl">{icons[type] || icons.unknown}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Network Scanner
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Discover devices and analyze network topology
        </p>
      </div>

      {/* Scan Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configure Scan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scan Type
            </label>
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isScanning}
            >
              <option value="network_discovery">Network Discovery</option>
              <option value="port_scan">Port Scan</option>
              <option value="vulnerability_scan">Vulnerability Scan</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target
            </label>
            <input
              type="text"
              value={scanTarget}
              onChange={(e) => setScanTarget(e.target.value)}
              placeholder="192.168.1.0/24 or 10.0.0.1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isScanning}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={startScan}
              disabled={isScanning}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Start Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Common scan targets */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Targets:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              '192.168.1.0/24',
              '192.168.0.0/24',
              '10.0.0.0/24',
              '172.16.0.0/24',
              'localhost'
            ].map((target) => (
              <button
                key={target}
                onClick={() => setScanTarget(target)}
                disabled={isScanning}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors duration-200"
              >
                {target}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Scan Status */}
      {currentScan && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Scan Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <div className="mt-1">
                <ScanStatusBadge status={currentScan.status} />
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Target</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {currentScan.target}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Devices Found</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {currentScan.devices_discovered}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {formatDuration(currentScan.duration_seconds)}
              </p>
            </div>
          </div>

          {currentScan.ai_summary && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                🤖 AI Analysis
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {currentScan.ai_summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Discovered Devices ({scanResults.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanResults.map((device) => (
              <div
                key={device.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <DeviceTypeIcon type={device.device_type} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {device.hostname || 'Unknown Device'}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${device.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">IP Address:</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {device.ip_address}
                    </span>
                  </div>
                  
                  {device.mac_address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">MAC:</span>
                      <span className="text-gray-900 dark:text-white font-mono">
                        {device.mac_address}
                      </span>
                    </div>
                  )}
                  
                  {device.os_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">OS:</span>
                      <span className="text-gray-900 dark:text-white">
                        {device.os_name}
                      </span>
                    </div>
                  )}
                  
                  {device.open_ports && device.open_ports.length > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Open Ports:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {device.open_ports.slice(0, 5).map((port) => (
                          <span
                            key={port}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded"
                          >
                            {port}
                          </span>
                        ))}
                        {device.open_ports.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                            +{device.open_ports.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last seen: {formatDateTime(device.last_seen)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Scan History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  Target
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  Devices
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  Started
                </th>
              </tr>
            </thead>
            <tbody>
              {scanHistory.length > 0 ? (
                scanHistory.map((scan) => (
                  <tr key={scan.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {scan.scan_type.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-mono">
                      {scan.target}
                    </td>
                    <td className="py-3 px-4">
                      <ScanStatusBadge status={scan.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {scan.devices_discovered}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {formatDuration(scan.duration_seconds)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(scan.started_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No scans yet. Start your first scan above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NetworkScanner;