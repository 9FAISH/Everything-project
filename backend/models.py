from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Enums for scan types and statuses
class ScanType(str, Enum):
    NETWORK_DISCOVERY = "network_discovery"
    VULNERABILITY_SCAN = "vulnerability_scan"
    PORT_SCAN = "port_scan"
    SMB_SCAN = "smb_scan"
    AD_SCAN = "ad_scan"

class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ThreatLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class DeviceType(str, Enum):
    ROUTER = "router"
    SWITCH = "switch"
    SERVER = "server"
    WORKSTATION = "workstation"
    MOBILE = "mobile"
    IOT = "iot"
    PRINTER = "printer"
    UNKNOWN = "unknown"

# Database Models
class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    device_type: DeviceType = DeviceType.UNKNOWN
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    vendor: Optional[str] = None
    open_ports: List[int] = []
    services: Dict[str, Any] = {}
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    first_discovered: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Vulnerability(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    cve_id: Optional[str] = None
    title: str
    description: str
    severity: ThreatLevel
    cvss_score: Optional[float] = None
    affected_service: Optional[str] = None
    port: Optional[int] = None
    solution: Optional[str] = None
    references: List[str] = []
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    is_resolved: bool = False
    ai_analysis: Optional[str] = None

class ScanResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scan_type: ScanType
    target: str  # IP, range, or hostname
    status: ScanStatus = ScanStatus.PENDING
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    devices_discovered: int = 0
    vulnerabilities_found: int = 0
    ports_scanned: int = 0
    results: Dict[str, Any] = {}
    error_message: Optional[str] = None
    ai_summary: Optional[str] = None
    created_by: Optional[str] = None

class ThreatAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    threat_level: ThreatLevel
    device_id: Optional[str] = None
    vulnerability_id: Optional[str] = None
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    attack_type: Optional[str] = None
    is_acknowledged: bool = False
    is_resolved: bool = False
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    ai_recommendation: Optional[str] = None

class NetworkSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    cidr: str
    description: Optional[str] = None
    device_count: int = 0
    last_scanned: Optional[datetime] = None
    scan_frequency: Optional[int] = None  # hours
    is_monitored: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models
class ScanRequest(BaseModel):
    scan_type: ScanType
    target: str
    options: Optional[Dict[str, Any]] = {}

class DeviceCreate(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    device_type: DeviceType = DeviceType.UNKNOWN

class VulnerabilityCreate(BaseModel):
    device_id: str
    cve_id: Optional[str] = None
    title: str
    description: str
    severity: ThreatLevel
    cvss_score: Optional[float] = None
    affected_service: Optional[str] = None
    port: Optional[int] = None
    solution: Optional[str] = None
    references: List[str] = []

class ThreatAlertCreate(BaseModel):
    title: str
    description: str
    threat_level: ThreatLevel
    device_id: Optional[str] = None
    vulnerability_id: Optional[str] = None
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    attack_type: Optional[str] = None

# Statistics Models
class DashboardStats(BaseModel):
    total_devices: int = 0
    active_devices: int = 0
    total_vulnerabilities: int = 0
    critical_vulnerabilities: int = 0
    total_alerts: int = 0
    unresolved_alerts: int = 0
    scans_today: int = 0
    network_segments: int = 0
    last_scan: Optional[datetime] = None
    threat_level_distribution: Dict[str, int] = {}
    device_type_distribution: Dict[str, int] = {}