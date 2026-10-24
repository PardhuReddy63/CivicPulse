import pytest
from app.schemas.analytics import ComplaintItem
from app.services.analytics_service import AnalyticsService
from app.core.config import settings, validate_settings

def test_compute_trends_empty():
    res = AnalyticsService.compute_trends([], 30)
    assert res.total_complaints_analyzed == 0
    assert res.reopening_rate_percentage == 0.0

def test_compute_trends_with_reopening():
    complaints = [
        ComplaintItem(category="Roads", status="ASSIGNED", priority="HIGH", resolution_cycle=1),
        ComplaintItem(category="Water", status="RESOLVED", priority="MEDIUM", resolution_cycle=1),
        ComplaintItem(category="Roads", status="PENDING", priority="HIGH", resolution_cycle=2),
    ]
    res = AnalyticsService.compute_trends(complaints, 30)
    assert res.total_complaints_analyzed == 3
    assert res.category_distribution["Roads"] == 2
    assert res.category_distribution["Water"] == 1
    # 1 out of 3 has resolution_cycle > 1 => 33.33%
    assert res.reopening_rate_percentage == 33.33
    assert len(res.insights) >= 2

def test_compute_workload():
    complaints = [
        ComplaintItem(category="Sanitation", status="ASSIGNED", deadline="2020-01-01"),
        ComplaintItem(category="Sanitation", status="ASSIGNED", deadline="2099-01-01"),
        ComplaintItem(category="Roads", status="RESOLVED", deadline="2020-01-01"),
    ]
    res = AnalyticsService.compute_workload(complaints)
    assert res.total_assigned_complaints == 2
    assert res.overdue_complaints == 1

def test_analytics_rejects_missing_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "PYTHON_SERVICE_TOKEN", "")
    with pytest.raises(RuntimeError, match="Set PYTHON_SERVICE_TOKEN"):
        validate_settings()

def test_analytics_accepts_configured_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "PYTHON_SERVICE_TOKEN", "a" * 40)
    validate_settings()
