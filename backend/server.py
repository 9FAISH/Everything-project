import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta

# Import our models and services
from models import (
    Device, Vulnerability, ScanResult, ThreatAlert, NetworkSegment,
    ScanRequest, DeviceCreate, VulnerabilityCreate, ThreatAlertCreate,
    DashboardStats, ScanType, ScanStatus, ThreatLevel
)
from services.network_scanner import NetworkScanner
from services.vulnerability_scanner import VulnerabilityScanner
from services.ai_service import AISecurityAnalyst

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
network_scanner = NetworkScanner()
vulnerability_scanner = VulnerabilityScanner()
ai_analyst = AISecurityAnalyst()

# Create the main app without a prefix
app = FastAPI(title="SentinelSecure API", description="Cybersecurity Platform API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Background task storage
active_scans = {}

# Basic health check endpoint
@api_router.get("/")
async def root():
    return {"message": "SentinelSecure API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Dashboard endpoints
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Get counts from database
        total_devices = await db.devices.count_documents({})
        active_devices = await db.devices.count_documents({"is_active": True})
        total_vulnerabilities = await db.vulnerabilities.count_documents({})
        critical_vulnerabilities = await db.vulnerabilities.count_documents({"severity": "critical"})
        total_alerts = await db.alerts.count_documents({})
        unresolved_alerts = await db.alerts.count_documents({"is_resolved": False})
        
        # Get scans from today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        scans_today = await db.scan_results.count_documents({"started_at": {"$gte": today}})
        
        # Get network segments count
        network_segments = await db.network_segments.count_documents({})
        
        # Get last scan
        last_scan_doc = await db.scan_results.find_one(sort=[("started_at", -1)])
        last_scan = last_scan_doc["started_at"] if last_scan_doc else None
        
        # Get threat level distribution
        threat_pipeline = [
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        threat_distribution = {}
        async for doc in db.vulnerabilities.aggregate(threat_pipeline):
            threat_distribution[doc["_id"]] = doc["count"]
        
        # Get device type distribution
        device_pipeline = [
            {"$group": {"_id": "$device_type", "count": {"$sum": 1}}}
        ]
        device_distribution = {}
        async for doc in db.devices.aggregate(device_pipeline):
            device_distribution[doc["_id"]] = doc["count"]
        
        return DashboardStats(
            total_devices=total_devices,
            active_devices=active_devices,
            total_vulnerabilities=total_vulnerabilities,
            critical_vulnerabilities=critical_vulnerabilities,
            total_alerts=total_alerts,
            unresolved_alerts=unresolved_alerts,
            scans_today=scans_today,
            network_segments=network_segments,
            last_scan=last_scan,
            threat_level_distribution=threat_distribution,
            device_type_distribution=device_distribution
        )
        
    except Exception as e:
        logging.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard statistics")

# Device endpoints
@api_router.get("/devices", response_model=List[Device])
async def get_devices(skip: int = 0, limit: int = 100):
    """Get list of discovered devices"""
    try:
        devices = await db.devices.find().skip(skip).limit(limit).to_list(length=None)
        return [Device(**device) for device in devices]
    except Exception as e:
        logging.error(f"Error getting devices: {e}")
        raise HTTPException(status_code=500, detail="Failed to get devices")

@api_router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    """Get device by ID"""
    try:
        device = await db.devices.find_one({"id": device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        return Device(**device)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get device")

@api_router.post("/devices", response_model=Device)
async def add_device(device_data: DeviceCreate):
    """Manually add a device"""
    try:
        device = Device(**device_data.dict())
        await db.devices.insert_one(device.dict())
        return device
    except Exception as e:
        logging.error(f"Error adding device: {e}")
        raise HTTPException(status_code=500, detail="Failed to add device")

# Vulnerability endpoints
@api_router.get("/vulnerabilities", response_model=List[Vulnerability])
async def get_vulnerabilities(skip: int = 0, limit: int = 100, severity: Optional[str] = None):
    """Get list of vulnerabilities"""
    try:
        query = {}
        if severity:
            query["severity"] = severity
            
        vulnerabilities = await db.vulnerabilities.find(query).skip(skip).limit(limit).to_list(length=None)
        return [Vulnerability(**vuln) for vuln in vulnerabilities]
    except Exception as e:
        logging.error(f"Error getting vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail="Failed to get vulnerabilities")

@api_router.get("/vulnerabilities/{vuln_id}", response_model=Vulnerability)
async def get_vulnerability(vuln_id: str):
    """Get vulnerability by ID"""
    try:
        vulnerability = await db.vulnerabilities.find_one({"id": vuln_id})
        if not vulnerability:
            raise HTTPException(status_code=404, detail="Vulnerability not found")
        return Vulnerability(**vulnerability)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting vulnerability {vuln_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get vulnerability")

@api_router.post("/vulnerabilities/{vuln_id}/analyze")
async def analyze_vulnerability(vuln_id: str):
    """Get AI analysis for a vulnerability"""
    try:
        # Get vulnerability and device
        vulnerability = await db.vulnerabilities.find_one({"id": vuln_id})
        if not vulnerability:
            raise HTTPException(status_code=404, detail="Vulnerability not found")
        
        device = await db.devices.find_one({"id": vulnerability["device_id"]})
        if not device:
            raise HTTPException(status_code=404, detail="Associated device not found")
        
        # Get AI analysis
        vuln_obj = Vulnerability(**vulnerability)
        device_obj = Device(**device)
        
        analysis = await ai_analyst.analyze_vulnerability(vuln_obj, device_obj)
        
        # Update vulnerability with AI analysis
        await db.vulnerabilities.update_one(
            {"id": vuln_id},
            {"$set": {"ai_analysis": analysis, "updated_at": datetime.utcnow()}}
        )
        
        return {"analysis": analysis}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error analyzing vulnerability {vuln_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze vulnerability")

# Scan endpoints
@api_router.post("/scans", response_model=ScanResult)
async def create_scan(scan_request: ScanRequest, background_tasks: BackgroundTasks):
    """Create and start a new scan"""
    try:
        # Create scan record
        scan_result = ScanResult(
            scan_type=scan_request.scan_type,
            target=scan_request.target,
            status=ScanStatus.PENDING
        )
        
        # Save to database
        await db.scan_results.insert_one(scan_result.dict())
        
        # Start background scan
        background_tasks.add_task(
            run_scan,
            scan_result.id,
            scan_request.scan_type,
            scan_request.target,
            scan_request.options or {}
        )
        
        return scan_result
        
    except Exception as e:
        logging.error(f"Error creating scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to create scan")

@api_router.get("/scans", response_model=List[ScanResult])
async def get_scans(skip: int = 0, limit: int = 50):
    """Get list of scans"""
    try:
        scans = await db.scan_results.find().sort("started_at", -1).skip(skip).limit(limit).to_list(length=None)
        return [ScanResult(**scan) for scan in scans]
    except Exception as e:
        logging.error(f"Error getting scans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scans")

@api_router.get("/scans/{scan_id}", response_model=ScanResult)
async def get_scan(scan_id: str):
    """Get scan by ID"""
    try:
        scan = await db.scan_results.find_one({"id": scan_id})
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        return ScanResult(**scan)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scan")

# Alert endpoints
@api_router.get("/alerts", response_model=List[ThreatAlert])
async def get_alerts(skip: int = 0, limit: int = 100, unresolved_only: bool = False):
    """Get list of threat alerts"""
    try:
        query = {}
        if unresolved_only:
            query["is_resolved"] = False
            
        alerts = await db.alerts.find(query).sort("detected_at", -1).skip(skip).limit(limit).to_list(length=None)
        return [ThreatAlert(**alert) for alert in alerts]
    except Exception as e:
        logging.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alerts")

@api_router.post("/alerts", response_model=ThreatAlert)
async def create_alert(alert_data: ThreatAlertCreate):
    """Create a new threat alert"""
    try:
        alert = ThreatAlert(**alert_data.dict())
        await db.alerts.insert_one(alert.dict())
        return alert
    except Exception as e:
        logging.error(f"Error creating alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to create alert")

@api_router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Mark alert as resolved"""
    try:
        result = await db.alerts.update_one(
            {"id": alert_id},
            {"$set": {"is_resolved": True, "resolved_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert resolved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error resolving alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve alert")

# AI Analysis endpoints
@api_router.post("/ai/analyze-network")
async def analyze_network():
    """Get AI analysis of the entire network"""
    try:
        # Get recent devices and vulnerabilities
        devices = await db.devices.find({"is_active": True}).to_list(length=None)
        vulnerabilities = await db.vulnerabilities.find({"is_resolved": False}).to_list(length=None)
        
        device_objects = [Device(**device) for device in devices]
        vulnerability_objects = [Vulnerability(**vuln) for vuln in vulnerabilities]
        
        # Get AI recommendations
        recommendations = await ai_analyst.get_security_recommendations(device_objects, vulnerability_objects)
        
        return {"recommendations": recommendations}
        
    except Exception as e:
        logging.error(f"Error getting AI network analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to get AI network analysis")

# Background task functions
async def run_scan(scan_id: str, scan_type: ScanType, target: str, options: Dict[str, Any]):
    """Background task to run scans"""
    try:
        # Update scan status to running
        await db.scan_results.update_one(
            {"id": scan_id},
            {"$set": {"status": ScanStatus.RUNNING.value, "started_at": datetime.utcnow()}}
        )
        
        devices = []
        vulnerabilities = []
        scan_metadata = {}
        
        if scan_type == ScanType.NETWORK_DISCOVERY:
            devices, scan_metadata = await network_scanner.discover_network_devices(target, options)
            
            # Save discovered devices
            for device in devices:
                # Check if device already exists
                existing = await db.devices.find_one({"ip_address": device.ip_address})
                if existing:
                    # Update existing device
                    await db.devices.update_one(
                        {"ip_address": device.ip_address},
                        {"$set": {**device.dict(), "updated_at": datetime.utcnow()}}
                    )
                else:
                    # Insert new device
                    await db.devices.insert_one(device.dict())
            
        elif scan_type == ScanType.VULNERABILITY_SCAN:
            # Get devices for target
            if target == "all":
                device_docs = await db.devices.find({"is_active": True}).to_list(length=None)
            else:
                device_docs = await db.devices.find({"ip_address": target}).to_list(length=None)
            
            target_devices = [Device(**device) for device in device_docs]
            
            for device in target_devices:
                device_vulns, device_metadata = await vulnerability_scanner.scan_device_vulnerabilities(device, options)
                vulnerabilities.extend(device_vulns)
                
                # Save vulnerabilities
                for vuln in device_vulns:
                    # Check if vulnerability already exists
                    existing = await db.vulnerabilities.find_one({
                        "device_id": vuln.device_id,
                        "title": vuln.title,
                        "port": vuln.port
                    })
                    
                    if not existing:
                        await db.vulnerabilities.insert_one(vuln.dict())
        
        # Get AI analysis of scan results
        if devices:
            ai_summary = await ai_analyst.analyze_scan_results(scan_metadata, devices)
        else:
            ai_summary = "Scan completed successfully"
        
        # Update scan result
        await db.scan_results.update_one(
            {"id": scan_id},
            {"$set": {
                "status": ScanStatus.COMPLETED.value,
                "completed_at": datetime.utcnow(),
                "devices_discovered": len(devices),
                "vulnerabilities_found": len(vulnerabilities),
                "results": scan_metadata,
                "ai_summary": ai_summary,
                "duration_seconds": scan_metadata.get('duration', 0)
            }}
        )
        
        logging.info(f"Scan {scan_id} completed successfully")
        
    except Exception as e:
        logging.error(f"Scan {scan_id} failed: {e}")
        await db.scan_results.update_one(
            {"id": scan_id},
            {"$set": {
                "status": ScanStatus.FAILED.value,
                "completed_at": datetime.utcnow(),
                "error_message": str(e)
            }}
        )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
