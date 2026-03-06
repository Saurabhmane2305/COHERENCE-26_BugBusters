"""
engines/__init__.py
Re-exports all public functions so routers can do:
    from engines import get_sankey_data, get_leakage_edges, ...
"""

from .graph_engine    import build_graph, get_leakage_edges, get_sankey_data, get_flow_summary
from .zscore_engine   import get_anomalies, get_anomaly_summary, get_department_zscore_trend
from .lapse_projector import (
    get_lapse_risks,
    get_lapse_summary,
    get_trajectory_chart,
    project_lapse_risk,
)
from .realloc_engine  import get_reallocation_recommendations, simulate_transfer

__all__ = [
    "build_graph", "get_leakage_edges", "get_sankey_data", "get_flow_summary",
    "get_anomalies", "get_anomaly_summary", "get_department_zscore_trend",
    "get_lapse_risks", "get_lapse_summary", "get_trajectory_chart", "project_lapse_risk",
    "get_reallocation_recommendations", "simulate_transfer",
]