import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DeviceManager = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    ip_address: '',
    mac_address: '',
    hostname: '',
    device_type: 'unknown'
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/devices`);
      setDevices(response.data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async () => {
    try {
      await axios.post(`${API}/devices`, newDevice);
      setNewDevice({
        ip_address: '',
        mac_address: '',
        hostname: '',
        device_type: 'unknown'
      });
      setShowAddModal(false);
      fetchDevices();
    } catch (error) {
      console.error('Failed to add device:', error);
      alert('Failed to add device. Please check the input data.');
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Device Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and monitor network devices
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add Device</span>
        </button>
      </div>

      {/* Device Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Devices
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {devices.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💻</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Devices
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {devices.filter(d => d.is_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Servers
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {devices.filter(d => d.device_type === 'server').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🖥️</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Workstations
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {devices.filter(d => d.device_type === 'workstation').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💻</span>
            </div>
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Network Devices ({devices.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  Device
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  IP Address
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  MAC Address
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  OS/Version
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  Open Ports
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-900 dark:text-white">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <tr
                    key={device.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setSelectedDevice(device)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <DeviceTypeIcon type={device.device_type} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {device.hostname || 'Unknown Device'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {device.device_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-mono text-gray-900 dark:text-white">
                      {device.ip_address}
                    </td>
                    <td className="py-4 px-6 text-sm font-mono text-gray-500 dark:text-gray-400">
                      {device.mac_address || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900 dark:text-white">
                      {device.os_name ? (
                        <div>
                          <p>{device.os_name}</p>
                          {device.os_version && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {device.os_version}
                            </p>
                          )}
                        </div>
                      ) : (
                        'Unknown'
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {device.open_ports && device.open_ports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {device.open_ports.slice(0, 3).map((port) => (
                            <span
                              key={port}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded"
                            >
                              {port}
                            </span>
                          ))}
                          {device.open_ports.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              +{device.open_ports.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          device.is_active ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {device.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(device.last_seen)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No devices found. Start a network scan to discover devices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add New Device
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    value={newDevice.ip_address}
                    onChange={(e) => setNewDevice({...newDevice, ip_address: e.target.value})}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={newDevice.mac_address}
                    onChange={(e) => setNewDevice({...newDevice, mac_address: e.target.value})}
                    placeholder="00:11:22:33:44:55"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hostname
                  </label>
                  <input
                    type="text"
                    value={newDevice.hostname}
                    onChange={(e) => setNewDevice({...newDevice, hostname: e.target.value})}
                    placeholder="server-01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Device Type
                  </label>
                  <select
                    value={newDevice.device_type}
                    onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="server">Server</option>
                    <option value="workstation">Workstation</option>
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="printer">Printer</option>
                    <option value="mobile">Mobile Device</option>
                    <option value="iot">IoT Device</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addDevice}
                  disabled={!newDevice.ip_address}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
                >
                  Add Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Device Details
                </h3>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Device Type
                    </label>
                    <div className="flex items-center space-x-2">
                      <DeviceTypeIcon type={selectedDevice.device_type} />
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {selectedDevice.device_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hostname
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedDevice.hostname || 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      IP Address
                    </label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      {selectedDevice.ip_address}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      MAC Address
                    </label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      {selectedDevice.mac_address || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Operating System
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedDevice.os_name || 'Unknown'}
                      {selectedDevice.os_version && ` ${selectedDevice.os_version}`}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vendor
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedDevice.vendor || 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedDevice.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {selectedDevice.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Seen
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDateTime(selectedDevice.last_seen)}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedDevice.open_ports && selectedDevice.open_ports.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Open Ports ({selectedDevice.open_ports.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDevice.open_ports.map((port) => (
                      <span
                        key={port}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-md"
                      >
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedDevice.services && Object.keys(selectedDevice.services).length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Detected Services
                  </label>
                  <div className="space-y-2">
                    {Object.entries(selectedDevice.services).map(([port, service]) => (
                      <div key={port} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                          Port {port}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {service.name} {service.product && `(${service.product})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;