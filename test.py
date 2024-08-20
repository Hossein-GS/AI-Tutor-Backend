from langchain.chat_models import ChatOpenAI
from langchain.agents import load_tools, initialize_agent
from langchain.agents import AgentType
from langchain.tools import AIPluginTool

tool = AIPluginTool.from_plugin_url("https://video-ai.invideo.io/.well-known/ai-plugin.json")

llm = ChatOpenAI(temperature=0.15)
tools = load_tools(["requests_all"])
tools += [tool]

agent_chain = initialize_agent(
    tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True
)

import json

# Define your video brief
video_brief = {
    "brief": "Create a video exploring the evolution of smartphones, from the first devices with basic functionalities to the latest models featuring cutting-edge technology. Highlight the impact of smartphones on society.",
    "settings": "Professional tone, background music that is futuristic.",
    "title": "The Evolution of Smartphones",
    "description": "A journey through the history of smartphones, showcasing how they've transformed from simple communication devices to essential tools for our daily lives.",
    "platforms": ["YouTube", "LinkedIn"],
    "audiences": ["tech enthusiasts"],
    "length_in_minutes": 2
}

video_brief_json = json.dumps(video_brief)


print("video brief JSON:", video_brief_json)

agent_chain(video_brief_json)