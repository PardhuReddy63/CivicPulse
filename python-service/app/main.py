from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as analytics_router
from app.core.config import settings
from app.core.config import validate_settings

app = FastAPI(
    title="CivicPulse Hub Analytics Service",
    version=settings.APP_VERSION,
    description="Microservice providing bounded trend analysis and workload forecasting for CivicPulse Hub administrators.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router)

@app.on_event("startup")
def validate_analytics_configuration():
    validate_settings()

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "CivicPulse Analytics Service",
        "version": settings.APP_VERSION,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
