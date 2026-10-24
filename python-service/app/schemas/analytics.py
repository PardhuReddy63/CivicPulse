from typing import List, Optional
from pydantic import BaseModel, Field

class ComplaintItem(BaseModel):
    complaint_id: Optional[int] = None
    category: str
    status: str
    priority: Optional[str] = "MEDIUM"
    created_at: Optional[str] = None
    deadline: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_cycle: Optional[int] = 1

class AnalyzeRequest(BaseModel):
    complaints: List[ComplaintItem]
    window_days: Optional[int] = 30

class TrendAnalysisResult(BaseModel):
    analysis_version: str = "v1.0"
    window_days: int
    total_complaints_analyzed: int
    reopening_rate_percentage: float
    category_distribution: dict
    status_distribution: dict
    priority_distribution: dict
    insights: List[str]

class WorkloadAnalysisResult(BaseModel):
    analysis_version: str = "v1.0"
    total_assigned_complaints: int
    overdue_complaints: int
    average_resolution_cycles: float
    department_bottlenecks: List[dict]
    workload_summary: str
