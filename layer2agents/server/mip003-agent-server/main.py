"""
MIP-003 Compliant Agent Server Template
======================================
A production-ready template for deploying AI agents to Railway/Cloud platforms.
Uses Swarms framework for the agent backend and FastAPI for the MIP-003 API layer.

Endpoints:
- GET  /availability    - Check if agent is available
- GET  /input_schema    - Get the input schema for the agent
- POST /start_job       - Start a new job
- GET  /status          - Get job status by job_id
- GET  /demo            - Demo endpoint for testing
- POST /provide_input   - Provide additional input to a running job

Based on: https://github.com/masumi-network/masumi-improvement-proposals/blob/main/mips/mip-003.md
"""

import os
import uuid
import time
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =============================================================================
# AGENT CONFIGURATION - Customize this section for your agent
# =============================================================================

AGENT_NAME = os.getenv("AGENT_NAME", "My Swarms Agent")
AGENT_VERSION = os.getenv("AGENT_VERSION", "1.0.0")
AGENT_DESCRIPTION = os.getenv("AGENT_DESCRIPTION", "A professional AI agent powered by Swarms")
AGENT_TYPE = "masumi-agent"  # MIP-003 compliant type

# Swarms/LLM Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# =============================================================================
# MIP-003 Data Models
# =============================================================================

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING_FOR_INPUT = "waiting_for_input"


class AvailabilityResponse(BaseModel):
    status: str = "available"
    type: str = AGENT_TYPE
    name: str = AGENT_NAME
    version: str = AGENT_VERSION
    message: str = f"{AGENT_NAME} is ready to accept jobs"


class InputFieldType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OPTION = "option"


class InputField(BaseModel):
    name: str
    type: InputFieldType
    description: str
    required: bool = True
    data: Optional[Dict[str, Any]] = None  # For options: {"options": ["opt1", "opt2"]}


class InputSchemaResponse(BaseModel):
    input: List[InputField]


class StartJobRequest(BaseModel):
    input_data: Dict[str, Any]
    payment_id: Optional[str] = None


class StartJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    result: Optional[str] = None
    error: Optional[str] = None
    progress: Optional[float] = None
    created_at: str
    completed_at: Optional[str] = None


class ProvideInputRequest(BaseModel):
    job_id: str
    input_data: Dict[str, Any]


# =============================================================================
# In-Memory Job Store (Use Redis/PostgreSQL for production)
# =============================================================================

jobs_store: Dict[str, Dict[str, Any]] = {}


# =============================================================================
# SWARMS AGENT IMPLEMENTATION - Customize your agent logic here
# =============================================================================

def create_swarms_agent():
    """
    Create and configure your Swarms agent.
    Customize this function for your specific use case.
    """
    try:
        from swarms import Agent
        
        agent = Agent(
            agent_name=AGENT_NAME,
            agent_description=AGENT_DESCRIPTION,
            system_prompt="""You are a professional AI assistant. 
            You provide helpful, accurate, and well-structured responses.
            Always be thorough and professional in your work.""",
            model_name=MODEL_NAME,
            max_loops=1,
            dynamic_temperature_enabled=True,
            verbose=False,
        )
        return agent
    except ImportError:
        print("Warning: Swarms not installed. Using mock agent.")
        return None
    except Exception as e:
        print(f"Warning: Could not initialize Swarms agent: {e}")
        return None


def get_agent_input_schema() -> List[InputField]:
    """
    Define the input schema for your agent.
    Customize this for your specific agent's needs.
    
    This schema tells the MIP-003 client what inputs your agent accepts.
    """
    return [
        InputField(
            name="task",
            type=InputFieldType.STRING,
            description="The main task or request for the agent to process",
            required=True,
        ),
        InputField(
            name="context",
            type=InputFieldType.STRING,
            description="Additional context or background information",
            required=False,
        ),
        InputField(
            name="output_format",
            type=InputFieldType.OPTION,
            description="Preferred output format",
            required=False,
            data={"options": ["detailed", "summary", "bullet_points"]},
        ),
        InputField(
            name="max_tokens",
            type=InputFieldType.NUMBER,
            description="Maximum tokens in response (100-4000)",
            required=False,
            data={"min": 100, "max": 4000, "default": 1000},
        ),
    ]


async def execute_agent_task(job_id: str, input_data: Dict[str, Any]):
    """
    Execute the agent task. This runs in the background.
    Customize this function with your agent's logic.
    """
    try:
        # Update job status to running
        jobs_store[job_id]["status"] = JobStatus.RUNNING
        jobs_store[job_id]["progress"] = 0.1
        
        # Get the task from input
        task = input_data.get("task", "")
        context = input_data.get("context", "")
        output_format = input_data.get("output_format", "detailed")
        
        # Build the full prompt
        full_prompt = task
        if context:
            full_prompt = f"Context: {context}\n\nTask: {task}"
        if output_format:
            full_prompt += f"\n\nPlease provide the response in {output_format} format."
        
        jobs_store[job_id]["progress"] = 0.3
        
        # Execute with Swarms agent
        agent = create_swarms_agent()
        
        if agent:
            # Run the Swarms agent
            result = agent.run(full_prompt)
            jobs_store[job_id]["progress"] = 0.9
        else:
            # Fallback mock response for testing
            await asyncio.sleep(2)  # Simulate processing time
            result = f"[Mock Response] Processed task: {task}"
        
        # Mark as completed
        jobs_store[job_id]["status"] = JobStatus.COMPLETED
        jobs_store[job_id]["result"] = str(result)
        jobs_store[job_id]["progress"] = 1.0
        jobs_store[job_id]["completed_at"] = datetime.utcnow().isoformat()
        
    except Exception as e:
        jobs_store[job_id]["status"] = JobStatus.FAILED
        jobs_store[job_id]["error"] = str(e)
        jobs_store[job_id]["completed_at"] = datetime.utcnow().isoformat()


# =============================================================================
# FastAPI Application
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print(f"🚀 Starting {AGENT_NAME} v{AGENT_VERSION}")
    print(f"   Model: {MODEL_NAME}")
    yield
    print(f"👋 Shutting down {AGENT_NAME}")


app = FastAPI(
    title=AGENT_NAME,
    description=f"MIP-003 Compliant Agent Server - {AGENT_DESCRIPTION}",
    version=AGENT_VERSION,
    lifespan=lifespan,
)

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# MIP-003 Endpoints
# =============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - redirect to docs."""
    return {
        "message": f"Welcome to {AGENT_NAME}",
        "docs": "/docs",
        "availability": "/availability",
    }


@app.get("/availability", response_model=AvailabilityResponse, tags=["MIP-003"])
async def check_availability():
    """
    MIP-003: Check agent availability.
    Returns the agent's status, type, name, and version.
    """
    return AvailabilityResponse()


@app.get("/input_schema", response_model=InputSchemaResponse, tags=["MIP-003"])
async def get_input_schema():
    """
    MIP-003: Get the input schema for this agent.
    Describes what inputs the agent accepts.
    """
    return InputSchemaResponse(input=get_agent_input_schema())


@app.post("/start_job", response_model=StartJobResponse, tags=["MIP-003"])
async def start_job(request: StartJobRequest, background_tasks: BackgroundTasks):
    """
    MIP-003: Start a new job with the provided input data.
    Returns a job_id that can be used to check status.
    """
    # Validate required fields
    schema = get_agent_input_schema()
    required_fields = [f.name for f in schema if f.required]
    
    for field in required_fields:
        if field not in request.input_data:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required field: {field}"
            )
    
    # Create job
    job_id = str(uuid.uuid4())
    jobs_store[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "input_data": request.input_data,
        "payment_id": request.payment_id,
        "result": None,
        "error": None,
        "progress": 0.0,
        "created_at": datetime.utcnow().isoformat(),
        "completed_at": None,
    }
    
    # Start background task
    background_tasks.add_task(execute_agent_task, job_id, request.input_data)
    
    return StartJobResponse(
        job_id=job_id,
        status=JobStatus.QUEUED,
        message="Job started successfully"
    )


@app.get("/status", response_model=JobStatusResponse, tags=["MIP-003"])
async def get_status(job_id: str):
    """
    MIP-003: Get the status of a job by job_id.
    """
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_store[job_id]
    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        result=job.get("result"),
        error=job.get("error"),
        progress=job.get("progress"),
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
    )


@app.get("/demo", tags=["MIP-003"])
async def demo():
    """
    MIP-003: Demo endpoint - returns example output.
    Used for testing and showcasing the agent's capabilities.
    """
    return {
        "demo": True,
        "agent_name": AGENT_NAME,
        "example_output": f"This is a demo response from {AGENT_NAME}. "
                          "In production, this agent can process complex tasks "
                          "using the Swarms framework.",
        "capabilities": [
            "Natural language processing",
            "Task execution",
            "Multi-step reasoning",
        ],
    }


@app.post("/provide_input", tags=["MIP-003"])
async def provide_input(request: ProvideInputRequest):
    """
    MIP-003: Provide additional input to a running job.
    Used when the agent needs more information from the user.
    """
    if request.job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_store[request.job_id]
    
    if job["status"] != JobStatus.WAITING_FOR_INPUT:
        raise HTTPException(
            status_code=400,
            detail="Job is not waiting for input"
        )
    
    # Store the additional input and continue processing
    job["additional_input"] = request.input_data
    job["status"] = JobStatus.RUNNING
    
    return {"message": "Input received", "job_id": request.job_id}


# =============================================================================
# Additional Utility Endpoints
# =============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check for monitoring."""
    return {
        "status": "healthy",
        "agent_name": AGENT_NAME,
        "version": AGENT_VERSION,
        "model": MODEL_NAME,
        "active_jobs": len([j for j in jobs_store.values() if j["status"] == JobStatus.RUNNING]),
        "total_jobs": len(jobs_store),
    }


@app.get("/jobs", tags=["Admin"])
async def list_jobs(limit: int = 10, status: Optional[JobStatus] = None):
    """List recent jobs (for debugging/admin)."""
    jobs = list(jobs_store.values())
    
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    
    # Sort by created_at descending
    jobs.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {"jobs": jobs[:limit], "total": len(jobs)}


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"Starting {AGENT_NAME} on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
