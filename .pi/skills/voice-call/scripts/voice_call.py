#!/usr/bin/env python3
"""
Voice calling skill for PopeBot using Twilio, Telnyx, Plivo, or mock provider.

Usage:
    python voice_call.py --to "+15555550123" --message "Hello from PopeBot"
    python voice_call.py --status --call-id "CA1234567890"
    python voice_call.py --hangup --call-id "CA1234567890"
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path


class VoiceCallProvider:
    """Base class for voice call providers."""
    
    def __init__(self):
        self.from_number = os.environ.get('VOICE_FROM_NUMBER', '+15555550000')
    
    def initiate_call(self, to_number: str, message: str = None, ssml: str = None, webhook_url: str = None):
        raise NotImplementedError
    
    def get_status(self, call_id: str):
        raise NotImplementedError
    
    def hangup(self, call_id: str):
        raise NotImplementedError


class MockProvider(VoiceCallProvider):
    """Mock provider for testing without making real calls."""
    
    def __init__(self):
        super().__init__()
        self.calls = {}
    
    def initiate_call(self, to_number: str, message: str = None, ssml: str = None, webhook_url: str = None):
        call_id = f"MOCK_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        call_data = {
            'id': call_id,
            'to': to_number,
            'from': self.from_number,
            'message': message or ssml,
            'type': 'ssml' if ssml else 'text',
            'status': 'queued',
            'created_at': datetime.now().isoformat(),
            'webhook_url': webhook_url
        }
        self.calls[call_id] = call_data
        
        print(f"📞 [MOCK] Call initiated: {call_id}")
        print(f"   To: {to_number}")
        print(f"   From: {self.from_number}")
        print(f"   Message: {message or ssml[:100]}...")
        print(f"   Status: queued")
        
        return {'success': True, 'call_id': call_id, 'status': 'queued'}
    
    def get_status(self, call_id: str):
        if call_id not in self.calls:
            return {'error': f'Call {call_id} not found'}
        
        call = self.calls[call_id]
        # Simulate call progression
        if call['status'] == 'queued':
            call['status'] = 'in-progress'
        elif call['status'] == 'in-progress':
            call['status'] = 'completed'
            call['duration'] = 30
        
        print(f"📊 [MOCK] Call status: {call_id}")
        print(f"   Status: {call['status']}")
        print(f"   To: {call['to']}")
        if 'duration' in call:
            print(f"   Duration: {call['duration']}s")
        
        return call
    
    def hangup(self, call_id: str):
        if call_id not in self.calls:
            return {'error': f'Call {call_id} not found'}
        
        self.calls[call_id]['status'] = 'completed'
        print(f"⏹️  [MOCK] Call ended: {call_id}")
        return {'success': True, 'call_id': call_id, 'status': 'completed'}


class TwilioProvider(VoiceCallProvider):
    """Twilio voice call provider."""
    
    def __init__(self):
        super().__init__()
        self.account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        self.auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        
        if not self.account_sid or not self.auth_token:
            raise ValueError("Twilio credentials not configured")
        
        try:
            from twilio.rest import Client
            self.client = Client(self.account_sid, self.auth_token)
        except ImportError:
            print("Error: twilio package not installed. Run: pip install twilio", file=sys.stderr)
            sys.exit(1)
    
    def initiate_call(self, to_number: str, message: str = None, ssml: str = None, webhook_url: str = None):
        twiml_content = f'<Response><Say>{message}</Say></Response>' if message else f'<Response>{ssml}</Response>'
        
        call = self.client.calls.create(
            to=to_number,
            from_=self.from_number,
            twiml=twiml_content,
            status_callback=webhook_url
        )
        
        print(f"📞 Call initiated via Twilio")
        print(f"   Call ID: {call.sid}")
        print(f"   To: {to_number}")
        print(f"   Status: {call.status}")
        
        return {'success': True, 'call_id': call.sid, 'status': call.status}
    
    def get_status(self, call_id: str):
        call = self.client.calls(call_id).fetch()
        print(f"📊 Call status: {call_id}")
        print(f"   Status: {call.status}")
        print(f"   Duration: {call.duration}s" if call.duration else "")
        return {'success': True, 'call_id': call.sid, 'status': call.status, 'duration': call.duration}
    
    def hangup(self, call_id: str):
        call = self.client.calls(call_id).update(status='completed')
        print(f"⏹️  Call ended: {call_id}")
        return {'success': True, 'call_id': call_id, 'status': 'completed'}


class TelnyxProvider(VoiceCallProvider):
    """Telnyx voice call provider."""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.environ.get('TELNYX_API_KEY')
        self.connection_id = os.environ.get('TELNYX_CONNECTION_ID')
        
        if not self.api_key or not self.connection_id:
            raise ValueError("Telnyx credentials not configured")
        
        # Simple HTTP client (no external dependency)
        self.base_url = "https://api.telnyx.com/v2/calls"
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def initiate_call(self, to_number: str, message: str = None, ssml: str = None, webhook_url: str = None):
        import urllib.request
        import urllib.error
        
        call_control_payload = {
            "from": self.from_number,
            "to": to_number,
            "connection_id": self.connection_id,
            "media_type": "audio",
        }
        
        if message:
            call_control_payload["tts"] = {"text": message, "voice": "female"}
        elif ssml:
            call_control_payload["tts"] = {"ssml": ssml}
        
        data = json.dumps(call_control_payload).encode('utf-8')
        req = urllib.request.Request(self.base_url, data=data, headers=self.headers, method='POST')
        
        try:
            response = urllib.request.urlopen(req)
            result = json.loads(response.read().decode('utf-8'))
            call_id = result['data']['id']
            
            print(f"📞 Call initiated via Telnyx")
            print(f"   Call ID: {call_id}")
            print(f"   To: {to_number}")
            
            return {'success': True, 'call_id': call_id, 'status': 'active'}
        except urllib.error.HTTPError as e:
            error_msg = json.loads(e.read().decode('utf-8'))
            print(f"Error: {error_msg}", file=sys.stderr)
            return {'success': False, 'error': str(error_msg)}
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            return {'success': False, 'error': str(e)}
    
    def get_status(self, call_id: str):
        import urllib.request
        import urllib.error
        
        url = f"{self.base_url}/{call_id}"
        req = urllib.request.Request(url, headers=self.headers, method='GET')
        
        try:
            response = urllib.request.urlopen(req)
            result = json.loads(response.read().decode('utf-8'))
            call_data = result['data']
            
            print(f"📊 Call status: {call_id}")
            print(f"   Status: {call_data['status']}")
            
            return {'success': True, 'call_id': call_id, 'status': call_data['status']}
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            return {'success': False, 'error': str(e)}
    
    def hangup(self, call_id: str):
        import urllib.request
        import urllib.error
        
        url = f"{self.base_url}/{call_id}/actions/hangup"
        data = json.dumps({}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=self.headers, method='POST')
        
        try:
            response = urllib.request.urlopen(req)
            print(f"⏹️  Call ended: {call_id}")
            return {'success': True, 'call_id': call_id, 'status': 'completed'}
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            return {'success': False, 'error': str(e)}


def get_provider():
    """Get the configured voice provider."""
    provider_name = os.environ.get('VOICE_PROVIDER', 'mock').lower()
    
    if provider_name == 'mock':
        return MockProvider()
    elif provider_name == 'twilio':
        return TwilioProvider()
    elif provider_name == 'telnyx':
        return TelnyxProvider()
    elif provider_name == 'plivo':
        # Plivo implementation would go here (similar pattern)
        print("Plivo provider not yet implemented. Using mock.", file=sys.stderr)
        return MockProvider()
    else:
        print(f"Unknown provider: {provider_name}. Using mock.", file=sys.stderr)
        return MockProvider()


def main():
    parser = argparse.ArgumentParser(description="Voice calling for PopeBot")
    parser.add_argument("--to", "-t", help="Destination phone number (e.g., +15555550123)")
    parser.add_argument("--message", "-m", help="Text message for TTS")
    parser.add_argument("--ssml", "-s", help="SSML for custom voice synthesis")
    parser.add_argument("--webhook-url", "-w", help="Webhook URL for call events")
    parser.add_argument("--call-id", "-c", help="Call ID for status/hangup")
    parser.add_argument("--status", action="store_true", help="Get call status")
    parser.add_argument("--hangup", action="store_true", help="End an active call")
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.status or args.hangup:
        if not args.call_id:
            print("Error: --call-id required for status/hangup", file=sys.stderr)
            sys.exit(1)
    elif args.to:
        if not args.message and not args.ssml:
            print("Error: --message or --ssml required", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(0)
    
    provider = get_provider()
    
    if args.status:
        result = provider.get_status(args.call_id)
    elif args.hangup:
        result = provider.hangup(args.call_id)
    else:
        result = provider.initiate_call(
            args.to,
            message=args.message,
            ssml=args.ssml,
            webhook_url=args.webhook_url
        )
    
    sys.exit(0 if result.get('success') else 1)


if __name__ == "__main__":
    main()
