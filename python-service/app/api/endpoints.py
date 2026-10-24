from fastapi import APIRouter, Depends
from app.schemas.analytics import AnalyzeRequest, TrendAnalysisResult, WorkloadAnalysisResult
from app.services.analytics_service import AnalyticsService
from app.core.security import verify_internal_token

router = APIRouter(prefix="/api/v1/analyze", tags=["Analytics"])

@router.post("/trends", response_model=TrendAnalysisResult)
def analyze_trends(
    payload: AnalyzeRequest,
    _token: str = Depends(verify_internal_token),
):
    return AnalyticsService.compute_trends(payload.complaints, payload.window_days or 30)

@router.post("/workload", response_model=WorkloadAnalysisResult)
def analyze_workload(
    payload: AnalyzeRequest,
    _token: str = Depends(verify_internal_token),
):
    return AnalyticsService.compute_workload(payload.complaints)
