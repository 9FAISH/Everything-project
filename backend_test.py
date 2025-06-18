import requests
import json
import unittest
import time
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://a262d590-1f46-4c79-884f-03df4073accc.preview.emergentagent.com/api"

class SentinelSecureAPITest(unittest.TestCase):
    """Test suite for SentinelSecure cybersecurity backend API"""

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = requests.get(f"{BACKEND_URL}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("timestamp", data)

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        response = requests.get(f"{BACKEND_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("version", data)

    def test_dashboard_stats(self):
        """Test the dashboard statistics endpoint"""
        response = requests.get(f"{BACKEND_URL}/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify all required fields are present
        required_fields = [
            "total_devices", "active_devices", "total_vulnerabilities", 
            "critical_vulnerabilities", "total_alerts", "unresolved_alerts",
            "scans_today", "network_segments", "threat_level_distribution",
            "device_type_distribution"
        ]
        
        for field in required_fields:
            self.assertIn(field, data)

    def test_get_devices(self):
        """Test the get devices endpoint"""
        response = requests.get(f"{BACKEND_URL}/devices")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # If we have devices, check their structure
        if data:
            device = data[0]
            required_fields = ["id", "ip_address", "is_active", "created_at", "updated_at"]
            for field in required_fields:
                self.assertIn(field, device)

    def test_get_vulnerabilities(self):
        """Test the get vulnerabilities endpoint"""
        response = requests.get(f"{BACKEND_URL}/vulnerabilities")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # If we have vulnerabilities, check their structure
        if data:
            vuln = data[0]
            required_fields = ["id", "device_id", "title", "description", "severity", "discovered_at"]
            for field in required_fields:
                self.assertIn(field, vuln)

    def test_get_alerts(self):
        """Test the get alerts endpoint"""
        response = requests.get(f"{BACKEND_URL}/alerts")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # If we have alerts, check their structure
        if data:
            alert = data[0]
            required_fields = ["id", "title", "description", "threat_level", "detected_at"]
            for field in required_fields:
                self.assertIn(field, alert)

    def test_get_scans(self):
        """Test the get scans endpoint"""
        response = requests.get(f"{BACKEND_URL}/scans")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # If we have scans, check their structure
        if data:
            scan = data[0]
            required_fields = ["id", "scan_type", "target", "status", "started_at"]
            for field in required_fields:
                self.assertIn(field, scan)

    def test_create_scan(self):
        """Test creating a new network discovery scan"""
        scan_data = {
            "scan_type": "network_discovery",
            "target": "192.168.1.0/24",
            "options": {}
        }
        
        response = requests.post(f"{BACKEND_URL}/scans", json=scan_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify scan was created with correct data
        self.assertEqual(data["scan_type"], "network_discovery")
        self.assertEqual(data["target"], "192.168.1.0/24")
        self.assertEqual(data["status"], "pending")
        self.assertIn("id", data)
        
        # Store the scan ID for potential future tests
        scan_id = data["id"]
        print(f"Created scan with ID: {scan_id}")
        
        # Wait a moment and check if scan status changed
        time.sleep(2)
        response = requests.get(f"{BACKEND_URL}/scans/{scan_id}")
        if response.status_code == 200:
            updated_data = response.json()
            print(f"Scan status after 2 seconds: {updated_data['status']}")

    def test_add_device(self):
        """Test manually adding a device"""
        device_data = {
            "ip_address": "10.0.0.100",
            "mac_address": "00:11:22:33:44:55",
            "hostname": "test-device",
            "device_type": "server"
        }
        
        response = requests.post(f"{BACKEND_URL}/devices", json=device_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify device was created with correct data
        self.assertEqual(data["ip_address"], "10.0.0.100")
        self.assertEqual(data["mac_address"], "00:11:22:33:44:55")
        self.assertEqual(data["hostname"], "test-device")
        self.assertEqual(data["device_type"], "server")
        self.assertIn("id", data)

    def test_create_alert(self):
        """Test creating a new threat alert"""
        alert_data = {
            "title": "Suspicious Login Attempt",
            "description": "Multiple failed login attempts detected from external IP",
            "threat_level": "high",
            "source_ip": "203.0.113.100",
            "target_ip": "10.0.0.5",
            "attack_type": "brute_force"
        }
        
        response = requests.post(f"{BACKEND_URL}/alerts", json=alert_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify alert was created with correct data
        self.assertEqual(data["title"], "Suspicious Login Attempt")
        self.assertEqual(data["threat_level"], "high")
        self.assertEqual(data["source_ip"], "203.0.113.100")
        self.assertEqual(data["is_resolved"], False)
        self.assertIn("id", data)
        
        # Test resolving the alert
        alert_id = data["id"]
        resolve_response = requests.patch(f"{BACKEND_URL}/alerts/{alert_id}/resolve")
        self.assertEqual(resolve_response.status_code, 200)
        resolve_data = resolve_response.json()
        self.assertIn("message", resolve_data)

if __name__ == "__main__":
    unittest.main(argv=['first-arg-is-ignored'], exit=False)