import os
import logging
from typing import Optional, Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
from models import Vulnerability, Device, ThreatAlert, ThreatLevel
import json

logger = logging.getLogger(__name__)

class AISecurityAnalyst:
    """AI-powered security analyst using Gemini for threat analysis and recommendations"""
    
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        self.system_message = """You are SentinelSecure AI, an expert cybersecurity analyst specializing in:
- Vulnerability assessment and risk analysis
- Network security threat detection
- Penetration testing result interpretation
- Security recommendations and remediation strategies

Provide concise, actionable insights focused on practical security improvements.
Always prioritize critical security issues and provide clear remediation steps."""

    def create_chat_session(self, session_id: str) -> LlmChat:
        """Create a new AI chat session"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=self.system_message
        )
        return chat.with_model("gemini", "gemini-2.0-flash")

    async def analyze_vulnerability(self, vulnerability: Vulnerability, device: Device) -> str:
        """Analyze a vulnerability and provide AI recommendations"""
        try:
            session_id = f"vuln_analysis_{vulnerability.id}"
            chat = self.create_chat_session(session_id)
            
            prompt = f"""
Analyze this vulnerability:

**Vulnerability Details:**
- CVE ID: {vulnerability.cve_id or 'Not specified'}
- Title: {vulnerability.title}
- Description: {vulnerability.description}
- Severity: {vulnerability.severity}
- CVSS Score: {vulnerability.cvss_score or 'Not specified'}
- Affected Service: {vulnerability.affected_service or 'Not specified'}
- Port: {vulnerability.port or 'Not specified'}

**Affected Device:**
- IP: {device.ip_address}
- Hostname: {device.hostname or 'Unknown'}
- OS: {device.os_name or 'Unknown'} {device.os_version or ''}
- Device Type: {device.device_type}
- Open Ports: {', '.join(map(str, device.open_ports)) if device.open_ports else 'None detected'}

Provide:
1. Risk assessment (2-3 sentences)
2. Potential attack scenarios (2-3 bullet points)
3. Immediate remediation steps (3-5 bullet points)
4. Long-term security recommendations (2-3 bullet points)

Keep response under 500 words and focus on actionable insights.
"""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            logger.info(f"AI analysis completed for vulnerability {vulnerability.id}")
            return response
            
        except Exception as e:
            logger.error(f"Error in AI vulnerability analysis: {e}")
            return f"AI analysis unavailable. Manual review recommended for {vulnerability.severity} severity vulnerability."

    async def analyze_scan_results(self, scan_results: Dict[str, Any], devices: List[Device]) -> str:
        """Analyze network scan results and provide security insights"""
        try:
            session_id = f"scan_analysis_{len(devices)}_{hash(str(scan_results))}"
            chat = self.create_chat_session(session_id)
            
            # Prepare scan summary
            total_devices = len(devices)
            device_types = {}
            open_ports = set()
            services = set()
            
            for device in devices:
                device_types[device.device_type.value] = device_types.get(device.device_type.value, 0) + 1
                open_ports.update(device.open_ports)
                services.update(device.services.keys())
            
            prompt = f"""
Analyze this network scan results:

**Network Overview:**
- Total devices discovered: {total_devices}
- Device types: {dict(device_types)}
- Unique open ports found: {sorted(list(open_ports))}
- Services detected: {', '.join(sorted(list(services))) if services else 'None identified'}

**Scan Results Summary:**
{json.dumps(scan_results, indent=2)[:1000]}...

Provide a security assessment covering:
1. Network security posture (2-3 sentences)
2. Potential security risks identified (3-5 bullet points)
3. Immediate actions recommended (3-5 bullet points)
4. Network hardening suggestions (2-3 bullet points)

Focus on practical security improvements and prioritize by risk level.
Keep response under 600 words.
"""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            logger.info(f"AI scan analysis completed for {total_devices} devices")
            return response
            
        except Exception as e:
            logger.error(f"Error in AI scan analysis: {e}")
            return "AI analysis unavailable. Manual review of scan results recommended."

    async def generate_threat_alert(self, anomaly_data: Dict[str, Any]) -> Optional[ThreatAlert]:
        """Generate threat alert based on anomalous network behavior"""
        try:
            session_id = f"threat_detection_{hash(str(anomaly_data))}"
            chat = self.create_chat_session(session_id)
            
            prompt = f"""
Analyze this potential security anomaly:

**Anomaly Data:**
{json.dumps(anomaly_data, indent=2)}

Determine if this represents a genuine security threat. If yes, provide:
1. Threat classification
2. Risk level (CRITICAL/HIGH/MEDIUM/LOW)
3. Brief description (1-2 sentences)
4. Recommended immediate actions (2-3 bullet points)

Respond in JSON format:
{{
    "is_threat": true/false,
    "threat_level": "CRITICAL/HIGH/MEDIUM/LOW",
    "title": "Brief threat title",
    "description": "Detailed description",
    "attack_type": "Type of attack if applicable",
    "recommendations": ["action1", "action2", "action3"]
}}

Only generate alerts for genuine security concerns, not routine network activity.
"""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse AI response
            try:
                analysis = json.loads(response)
                if analysis.get('is_threat', False):
                    alert = ThreatAlert(
                        title=analysis.get('title', 'AI-Detected Security Threat'),
                        description=analysis.get('description', 'Anomalous activity detected'),
                        threat_level=ThreatLevel(analysis.get('threat_level', 'MEDIUM').lower()),
                        attack_type=analysis.get('attack_type'),
                        ai_recommendation='\n'.join(analysis.get('recommendations', []))
                    )
                    
                    # Add source data to alert
                    if 'source_ip' in anomaly_data:
                        alert.source_ip = anomaly_data['source_ip']
                    if 'target_ip' in anomaly_data:
                        alert.target_ip = anomaly_data['target_ip']
                    
                    return alert
                    
            except json.JSONDecodeError:
                logger.error("Failed to parse AI threat analysis response")
            
            return None
            
        except Exception as e:
            logger.error(f"Error in AI threat detection: {e}")
            return None

    async def get_security_recommendations(self, devices: List[Device], vulnerabilities: List[Vulnerability]) -> str:
        """Get overall security recommendations for the network"""
        try:
            session_id = f"security_recommendations_{len(devices)}"
            chat = self.create_chat_session(session_id)
            
            # Prepare security summary
            vuln_by_severity = {}
            for vuln in vulnerabilities:
                vuln_by_severity[vuln.severity.value] = vuln_by_severity.get(vuln.severity.value, 0) + 1
            
            device_summary = {}
            for device in devices:
                device_summary[device.device_type.value] = device_summary.get(device.device_type.value, 0) + 1
            
            prompt = f"""
Provide comprehensive security recommendations for this network:

**Network Summary:**
- Total devices: {len(devices)}
- Device breakdown: {dict(device_summary)}
- Total vulnerabilities: {len(vulnerabilities)}
- Vulnerability breakdown: {dict(vuln_by_severity)}

**Top Vulnerabilities (by severity):**
{chr(10).join([f"- {v.severity.value.upper()}: {v.title}" for v in sorted(vulnerabilities, key=lambda x: ['critical', 'high', 'medium', 'low'].index(x.severity.value))[:5]])}

Provide strategic security recommendations:
1. **Immediate Actions** (Critical items needing attention now)
2. **Short-term Improvements** (Implement within 1-4 weeks)
3. **Long-term Strategy** (Ongoing security posture improvements)
4. **Compliance Considerations** (GDPR/HIPAA/Industry standards)

Focus on practical, implementable recommendations prioritized by impact and effort.
Limit response to 800 words.
"""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            logger.info("AI security recommendations generated")
            return response
            
        except Exception as e:
            logger.error(f"Error generating security recommendations: {e}")
            return "Unable to generate AI recommendations. Consider manual security review."