from typing import List
from collections import Counter
from app.schemas.analytics import ComplaintItem, TrendAnalysisResult, WorkloadAnalysisResult

class AnalyticsService:
    @staticmethod
    def compute_trends(complaints: List[ComplaintItem], window_days: int) -> TrendAnalysisResult:
        total = len(complaints)
        if total == 0:
            return TrendAnalysisResult(
                window_days=window_days,
                total_complaints_analyzed=0,
                reopening_rate_percentage=0.0,
                category_distribution={},
                status_distribution={},
                priority_distribution={},
                insights=["No complaint records submitted for this period."]
            )

        cat_counter = Counter(c.category for c in complaints)
        status_counter = Counter(c.status for c in complaints)
        priority_counter = Counter(c.priority for c in complaints if c.priority)

        # Reopening calculations (complaints with cycle > 1)
        reopened_count = sum(1 for c in complaints if (c.resolution_cycle or 1) > 1)
        reopening_rate = round((reopened_count / total) * 100, 2)

        insights = []
        if cat_counter:
            top_cat, top_count = cat_counter.most_common(1)[0]
            insights.append(f"Highest volume sector: '{top_cat}' accounts for {round(top_count / total * 100, 1)}% of all grievances.")

        if reopening_rate > 15:
            insights.append(f"Elevated reopening rate detected ({reopening_rate}%). Indicates repeat dissatisfaction requiring quality review.")
        else:
            insights.append(f"Healthy citizen acceptance rate with only {reopening_rate}% complaints reopened.")

        high_priority_pct = round((priority_counter.get('HIGH', 0) / total) * 100, 1)
        insights.append(f"Critical urgency tickets: {high_priority_pct}% are marked as HIGH priority.")

        return TrendAnalysisResult(
            window_days=window_days,
            total_complaints_analyzed=total,
            reopening_rate_percentage=reopening_rate,
            category_distribution=dict(cat_counter),
            status_distribution=dict(status_counter),
            priority_distribution=dict(priority_counter),
            insights=insights,
        )

    @staticmethod
    def compute_workload(complaints: List[ComplaintItem]) -> WorkloadAnalysisResult:
        active_statuses = {
            'ASSIGNED',
            'IN_PROGRESS',
            'RESOLUTION_REJECTED',
            'RESOLUTION_PENDING_REVIEW',
            'AWAITING_CITIZEN',
        }
        assigned = [c for c in complaints if c.status in active_statuses]
        actionable = [
            c for c in assigned
            if c.status in {'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_REJECTED'}
        ]
        total_assigned = len(assigned)

        overdue_count = 0
        from datetime import datetime, date
        today = date.today().isoformat()
        for c in actionable:
            if c.deadline and c.deadline < today:
                overdue_count += 1

        cycles = [c.resolution_cycle or 1 for c in complaints]
        avg_cycles = round(sum(cycles) / len(cycles), 2) if cycles else 1.0

        cat_counts = Counter(c.category for c in assigned)
        bottlenecks = [
            {"category": cat, "pending_count": count}
            for cat, count in cat_counts.most_common(5)
        ]

        summary = f"{total_assigned} open assigned cases, with {overdue_count} actionable cases exceeding targeted SLA deadlines."

        return WorkloadAnalysisResult(
            total_assigned_complaints=total_assigned,
            overdue_complaints=overdue_count,
            average_resolution_cycles=avg_cycles,
            department_bottlenecks=bottlenecks,
            workload_summary=summary,
        )
