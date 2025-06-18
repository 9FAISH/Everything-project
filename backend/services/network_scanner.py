import nmap
import socket
import subprocess
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from netaddr import IPNetwork, IPAddress
import psutil
from datetime import datetime
import json
import re

from models import Device, DeviceType, ScanResult, ScanType, ScanStatus

logger = logging.getLogger(__name__)

class NetworkScanner:
    """Ethical network scanner for device discovery and port scanning"""
    
    def __init__(self):
        self.nm = nmap.PortScanner()
        self.scan_timeout = 300  # 5 minutes max per scan
        
    async def discover_network_devices(self, target: str, scan_options: Dict[str, Any] = None) -> Tuple[List[Device], Dict[str, Any]]:
        """
        Discover devices on the network using ethical scanning techniques
        
        Args:
            target: IP address, range (CIDR), or hostname
            scan_options: Additional scan configuration
        
        Returns:
            Tuple of (discovered devices, scan metadata)
        """
        devices = []
        scan_metadata = {
            'target': target,
            'scan_type': 'network_discovery',
            'started_at': datetime.utcnow(),
            'techniques_used': []
        }
        
        try:
            logger.info(f"Starting network discovery scan for target: {target}")
            
            # Validate and normalize target
            ip_ranges = self._parse_target(target)
            if not ip_ranges:
                raise ValueError(f"Invalid target format: {target}")
            
            for ip_range in ip_ranges:
                # Use ping sweep for initial device discovery
                ping_results = await self._ping_sweep(ip_range)
                scan_metadata['techniques_used'].append('ping_sweep')
                
                # Perform ARP scan for local network
                if self._is_local_network(ip_range):
                    arp_results = await self._arp_scan(ip_range)
                    scan_metadata['techniques_used'].append('arp_scan')
                    ping_results.update(arp_results)
                
                # For each responsive host, perform detailed scanning
                for ip in ping_results.keys():
                    try:
                        device = await self._scan_device_details(ip, scan_options or {})
                        if device:
                            devices.append(device)
                    except Exception as e:
                        logger.warning(f"Failed to scan device {ip}: {e}")
                        continue
            
            scan_metadata['completed_at'] = datetime.utcnow()
            scan_metadata['devices_found'] = len(devices)
            scan_metadata['duration'] = (scan_metadata['completed_at'] - scan_metadata['started_at']).total_seconds()
            
            logger.info(f"Network discovery completed. Found {len(devices)} devices.")
            return devices, scan_metadata
            
        except Exception as e:
            logger.error(f"Network discovery failed: {e}")
            scan_metadata['error'] = str(e)
            scan_metadata['completed_at'] = datetime.utcnow()
            return devices, scan_metadata

    async def port_scan_device(self, ip: str, ports: str = "1-1000", scan_type: str = "syn") -> Dict[str, Any]:
        """
        Perform ethical port scan on a specific device
        
        Args:
            ip: Target IP address
            ports: Port range to scan (e.g., "1-1000", "22,80,443")
            scan_type: Type of scan (syn, tcp, udp)
        
        Returns:
            Port scan results
        """
        try:
            logger.info(f"Starting port scan for {ip}, ports: {ports}")
            
            # Use nmap for port scanning with appropriate timing
            scan_args = f"-T4 -n"  # Timing template 4, no DNS resolution
            
            if scan_type == "syn":
                scan_args += " -sS"  # SYN scan
            elif scan_type == "tcp":
                scan_args += " -sT"  # TCP connect scan
            elif scan_type == "udp":
                scan_args += " -sU"  # UDP scan
                
            # Perform the scan
            result = self.nm.scan(ip, ports, arguments=scan_args)
            
            # Parse results
            scan_results = {
                'ip': ip,
                'scan_type': scan_type,
                'ports_scanned': ports,
                'open_ports': [],
                'filtered_ports': [],
                'closed_ports': [],
                'services': {},
                'scan_time': datetime.utcnow().isoformat()
            }
            
            if ip in self.nm.all_hosts():
                host_info = self.nm[ip]
                
                for protocol in host_info.all_protocols():
                    ports_data = host_info[protocol]
                    
                    for port in ports_data.keys():
                        port_info = ports_data[port]
                        state = port_info['state']
                        
                        if state == 'open':
                            scan_results['open_ports'].append(port)
                            
                            # Get service information
                            service_info = {
                                'port': port,
                                'protocol': protocol,
                                'state': state,
                                'name': port_info.get('name', ''),
                                'product': port_info.get('product', ''),
                                'version': port_info.get('version', ''),
                                'extrainfo': port_info.get('extrainfo', '')
                            }
                            scan_results['services'][str(port)] = service_info
                            
                        elif state == 'filtered':
                            scan_results['filtered_ports'].append(port)
                        elif state == 'closed':
                            scan_results['closed_ports'].append(port)
            
            logger.info(f"Port scan completed for {ip}. Open ports: {scan_results['open_ports']}")
            return scan_results
            
        except Exception as e:
            logger.error(f"Port scan failed for {ip}: {e}")
            return {
                'ip': ip,
                'error': str(e),
                'scan_time': datetime.utcnow().isoformat()
            }

    async def _scan_device_details(self, ip: str, options: Dict[str, Any]) -> Optional[Device]:
        """Scan detailed information about a specific device"""
        try:
            # Start with basic device info
            device = Device(
                ip_address=ip,
                first_discovered=datetime.utcnow(),
                last_seen=datetime.utcnow()
            )
            
            # Get hostname
            try:
                hostname = socket.gethostbyaddr(ip)[0]
                device.hostname = hostname
            except (socket.herror, socket.gaierror):
                pass
            
            # Perform quick port scan to identify services
            port_results = await self.port_scan_device(ip, "1-1000", "syn")
            
            if 'open_ports' in port_results:
                device.open_ports = port_results['open_ports']
                device.services = port_results.get('services', {})
            
            # OS detection (if enabled in options)
            if options.get('os_detection', False):
                os_info = await self._detect_os(ip)
                if os_info:
                    device.os_name = os_info.get('name')
                    device.os_version = os_info.get('version')
                    device.vendor = os_info.get('vendor')
            
            # Device type classification
            device.device_type = self._classify_device_type(device)
            
            # MAC address detection (for local network)
            mac_address = await self._get_mac_address(ip)
            if mac_address:
                device.mac_address = mac_address
            
            return device
            
        except Exception as e:
            logger.error(f"Failed to scan device details for {ip}: {e}")
            return None

    def _parse_target(self, target: str) -> List[str]:
        """Parse and validate scan target"""
        targets = []
        
        try:
            # Handle CIDR notation
            if '/' in target:
                network = IPNetwork(target)
                targets.append(str(network))
            # Handle IP range (e.g., 192.168.1.1-50)
            elif '-' in target and '.' in target:
                # Parse range format like 192.168.1.1-50
                base_ip, range_part = target.rsplit('.', 1)
                if '-' in range_part:
                    start, end = range_part.split('-')
                    for i in range(int(start), int(end) + 1):
                        targets.append(f"{base_ip}.{i}/32")
            # Single IP
            else:
                # Validate IP
                IPAddress(target)
                targets.append(f"{target}/32")
                
        except Exception as e:
            logger.error(f"Invalid target format {target}: {e}")
            return []
        
        return targets

    async def _ping_sweep(self, target: str) -> Dict[str, bool]:
        """Perform ping sweep to identify responsive hosts"""
        responsive_hosts = {}
        
        try:
            # Use nmap for ping sweep
            result = self.nm.scan(hosts=target, arguments='-sn -T4')
            
            for host in self.nm.all_hosts():
                if host in self.nm.all_hosts() and self.nm[host].state() == 'up':
                    responsive_hosts[host] = True
                    
        except Exception as e:
            logger.error(f"Ping sweep failed for {target}: {e}")
        
        return responsive_hosts

    async def _arp_scan(self, target: str) -> Dict[str, bool]:
        """Perform ARP scan for local network discovery"""
        arp_results = {}
        
        try:
            # Use system ARP table
            arp_output = subprocess.check_output(['arp', '-a'], universal_newlines=True)
            
            # Parse ARP table output
            for line in arp_output.split('\n'):
                if '(' in line and ')' in line:
                    # Extract IP from format: hostname (ip) at mac [ether] on interface
                    ip_match = re.search(r'\(([0-9.]+)\)', line)
                    if ip_match:
                        ip = ip_match.group(1)
                        # Check if IP is in our target range
                        try:
                            if IPAddress(ip) in IPNetwork(target):
                                arp_results[ip] = True
                        except:
                            continue
                            
        except Exception as e:
            logger.warning(f"ARP scan failed: {e}")
        
        return arp_results

    def _is_local_network(self, target: str) -> bool:
        """Check if target is in local network range"""
        try:
            network = IPNetwork(target)
            # Check for private IP ranges
            private_ranges = [
                IPNetwork('10.0.0.0/8'),
                IPNetwork('172.16.0.0/12'),
                IPNetwork('192.168.0.0/16')
            ]
            
            for private_range in private_ranges:
                if network in private_range or network.supernet_of(private_range):
                    return True
                    
        except:
            pass
        
        return False

    async def _detect_os(self, ip: str) -> Optional[Dict[str, str]]:
        """Attempt OS detection using various techniques"""
        try:
            # Use nmap OS detection
            result = self.nm.scan(ip, arguments='-O -T4')
            
            if ip in self.nm.all_hosts():
                host_info = self.nm[ip]
                
                if 'osmatch' in host_info:
                    os_matches = host_info['osmatch']
                    if os_matches:
                        best_match = os_matches[0]
                        return {
                            'name': best_match.get('name', ''),
                            'accuracy': best_match.get('accuracy', ''),
                            'vendor': best_match.get('vendor', '')
                        }
                        
        except Exception as e:
            logger.warning(f"OS detection failed for {ip}: {e}")
        
        return None

    async def _get_mac_address(self, ip: str) -> Optional[str]:
        """Get MAC address for local network devices"""
        try:
            # Check ARP table
            arp_output = subprocess.check_output(['arp', '-n', ip], universal_newlines=True)
            
            # Parse MAC address from ARP output
            mac_match = re.search(r'([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}', arp_output)
            if mac_match:
                return mac_match.group(0)
                
        except Exception:
            pass
        
        return None

    def _classify_device_type(self, device: Device) -> DeviceType:
        """Classify device type based on open ports and services"""
        open_ports = set(device.open_ports)
        
        # Router indicators
        if any(port in open_ports for port in [23, 80, 443, 161, 22]) and device.hostname and 'router' in device.hostname.lower():
            return DeviceType.ROUTER
        
        # Server indicators
        if any(port in open_ports for port in [80, 443, 22, 21, 25, 53, 110, 143, 993, 995]):
            return DeviceType.SERVER
        
        # Printer indicators  
        if any(port in open_ports for port in [515, 631, 9100]):
            return DeviceType.PRINTER
        
        # Switch indicators
        if 161 in open_ports and not (80 in open_ports or 443 in open_ports):
            return DeviceType.SWITCH
        
        # Workstation indicators
        if any(port in open_ports for port in [135, 139, 445, 3389]):
            return DeviceType.WORKSTATION
        
        return DeviceType.UNKNOWN

    async def get_network_statistics(self, devices: List[Device]) -> Dict[str, Any]:
        """Generate network statistics from discovered devices"""
        stats = {
            'total_devices': len(devices),
            'active_devices': len([d for d in devices if d.is_active]),
            'device_types': {},
            'common_ports': {},
            'os_distribution': {},
            'security_summary': {
                'devices_with_ssh': 0,
                'devices_with_rdp': 0,
                'devices_with_web': 0,
                'devices_with_smb': 0
            }
        }
        
        for device in devices:
            # Device type distribution
            device_type = device.device_type.value
            stats['device_types'][device_type] = stats['device_types'].get(device_type, 0) + 1
            
            # Common ports
            for port in device.open_ports:
                stats['common_ports'][str(port)] = stats['common_ports'].get(str(port), 0) + 1
            
            # OS distribution
            if device.os_name:
                stats['os_distribution'][device.os_name] = stats['os_distribution'].get(device.os_name, 0) + 1
            
            # Security-relevant services
            if 22 in device.open_ports:
                stats['security_summary']['devices_with_ssh'] += 1
            if 3389 in device.open_ports:
                stats['security_summary']['devices_with_rdp'] += 1
            if any(port in device.open_ports for port in [80, 443, 8080, 8443]):
                stats['security_summary']['devices_with_web'] += 1
            if 445 in device.open_ports:
                stats['security_summary']['devices_with_smb'] += 1
        
        return stats