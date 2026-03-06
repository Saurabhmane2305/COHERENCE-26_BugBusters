"""
realloc_engine.py
Identifies surplus departments (high lapse risk) and demand departments
(high utilization, likely underfunded) and simulates optimal fund transfers.

Surplus pool   → departments with lapse_risk > 60%
Demand pool    → departments with utilization > 80% AND low lapse_risk
Matching logic → within same state, maximize utilization improvement
"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd

from .lapse_projector import project_lapse_risk, CURRENT_MONTH

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

SURPLUS_LAPSE_THRESHOLD = 60.0
DEMAND_UTIL_THRESHOLD   = 80.0
MAX_TRANSFER_PCT        = 20.0
DEFAULT_YEAR            = 2024


# ── Pool builders ─────────────────────────────────────────────────────────────

def _build_pools(year: int, as_of_month: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = project_lapse_risk(year=year, as_of_month=as_of_month)

    surplus = df[df["lapse_risk_pct"] >= SURPLUS_LAPSE_THRESHOLD].copy()
    demand  = df[
        (df["utilization_pct"] >= DEMAND_UTIL_THRESHOLD) &
        (df["lapse_risk_pct"]  <  30.0)
    ].copy()

    return surplus, demand


# ── Recommendation engine ─────────────────────────────────────────────────────

def get_reallocation_recommendations(
    year:        int = DEFAULT_YEAR,
    as_of_month: int = CURRENT_MONTH,
    state:       str | None = None,
) -> dict[str, Any]:
    surplus, demand = _build_pools(year, as_of_month)

    if state:
        surplus = surplus[surplus["state"] == state]
        demand  = demand[demand["state"] == state]

    recommendations = []

    for _, s_row in surplus.iterrows():
        state_demand = demand[demand["state"] == s_row["state"]]
        if state_demand.empty:
            continue

        best_match = state_demand.sort_values("utilization_pct", ascending=False).iloc[0]

        transferable = float(s_row["projected_unspent"]) * (MAX_TRANSFER_PCT / 100)
        new_surplus_util = min(
            (float(s_row["total_spent"]) + transferable) / float(s_row["budget_allocated"]) * 100, 100
        )
        new_demand_util = min(
            (float(best_match["total_spent"]) + transferable) / float(best_match["budget_allocated"]) * 100, 100
        )

        recommendations.append({
            "from_state":           s_row["state"],
            "from_district":        s_row["district"],
            "from_department":      s_row["department"],
            "from_lapse_risk":      round(float(s_row["lapse_risk_pct"]), 2),
            "from_utilization":     round(float(s_row["utilization_pct"]), 2),
            "to_state":             best_match["state"],
            "to_district":          best_match["district"],
            "to_department":        best_match["department"],
            "to_utilization":       round(float(best_match["utilization_pct"]), 2),
            "transfer_amount":      round(transferable, 2),
            "transfer_amount_lakh": round(transferable / 1e5, 2),
            "projected_improvement_from": round(new_surplus_util - float(s_row["utilization_pct"]), 2),
            "projected_improvement_to":   round(new_demand_util - float(best_match["utilization_pct"]), 2),
        })

    return {
        "surplus_pool":    _pool_to_list(surplus),
        "demand_pool":     _pool_to_list(demand),
        "recommendations": sorted(
            recommendations,
            key=lambda x: x["from_lapse_risk"],
            reverse=True,
        )[:20],
        "summary": {
            "surplus_count":        len(surplus),
            "demand_count":         len(demand),
            "recommendation_count": len(recommendations),
            "total_transferable_cr": round(float(surplus["projected_unspent"].sum()) / 1e7, 2),
        },
    }


# ── Simulation ────────────────────────────────────────────────────────────────

def simulate_transfer(
    from_state:      str,
    from_district:   str,
    from_department: str,
    to_state:        str,          # ← FIXED: now accepts to_state separately
    to_district:     str,
    to_department:   str,
    transfer_pct:    float,
    year:            int = DEFAULT_YEAR,
    as_of_month:     int = CURRENT_MONTH,
) -> dict[str, Any]:
    transfer_pct = max(0.1, min(transfer_pct, MAX_TRANSFER_PCT))
    df = project_lapse_risk(year=year, as_of_month=as_of_month)

    # ── FIX: use from_state for source, to_state for destination ─────────────
    from_row = df[
        (df["state"]      == from_state) &
        (df["district"]   == from_district) &
        (df["department"] == from_department)
    ]
    to_row = df[
        (df["state"]      == to_state) &        # ← FIXED was: from_state
        (df["district"]   == to_district) &
        (df["department"] == to_department)
    ]

    # ── Debug logging so you can see exactly what failed ─────────────────────
    if from_row.empty:
        logger.error(
            f"simulate_transfer: FROM not found — "
            f"state='{from_state}' district='{from_district}' dept='{from_department}'. "
            f"Available districts in state: {df[df['state']==from_state]['district'].unique().tolist()}"
        )
        return {"error": f"Source not found: {from_department} / {from_district} / {from_state}"}

    if to_row.empty:
        logger.error(
            f"simulate_transfer: TO not found — "
            f"state='{to_state}' district='{to_district}' dept='{to_department}'. "
            f"Available districts in state: {df[df['state']==to_state]['district'].unique().tolist()}"
        )
        return {"error": f"Destination not found: {to_department} / {to_district} / {to_state}"}

    from_row = from_row.iloc[0]
    to_row   = to_row.iloc[0]

    transfer_amount = float(from_row["projected_unspent"]) * (transfer_pct / 100)

    new_from_spent = float(from_row["total_spent"]) + transfer_amount
    new_to_spent   = float(to_row["total_spent"])   + transfer_amount
    new_from_util  = min(new_from_spent / float(from_row["budget_allocated"]) * 100, 100)
    new_to_util    = min(new_to_spent   / float(to_row["budget_allocated"])   * 100, 100)

    from_monthly   = new_from_util / 100 / as_of_month
    to_monthly     = new_to_util   / 100 / as_of_month
    new_from_lapse = max(0.0, (1 - from_monthly * 12) * 100)
    new_to_lapse   = max(0.0, (1 - to_monthly   * 12) * 100)

    return {
        "transfer_amount":      round(transfer_amount, 2),
        "transfer_amount_lakh": round(transfer_amount / 1e5, 2),
        "transfer_pct":         transfer_pct,
        "from": {
            "department":       from_department,
            "district":         from_district,
            "state":            from_state,
            "before_util_pct":  round(float(from_row["utilization_pct"]), 2),
            "after_util_pct":   round(new_from_util, 2),
            "before_lapse_pct": round(float(from_row["lapse_risk_pct"]), 2),
            "after_lapse_pct":  round(new_from_lapse, 2),
        },
        "to": {
            "department":       to_department,
            "district":         to_district,
            "state":            to_state,
            "before_util_pct":  round(float(to_row["utilization_pct"]), 2),
            "after_util_pct":   round(new_to_util, 2),
            "before_lapse_pct": round(float(to_row["lapse_risk_pct"]), 2),
            "after_lapse_pct":  round(new_to_lapse, 2),
        },
        "net_utilization_gain": round(
            (new_from_util + new_to_util) / 2
            - (float(from_row["utilization_pct"]) + float(to_row["utilization_pct"])) / 2,
            2
        ),
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pool_to_list(df: pd.DataFrame) -> list[dict]:
    return [
        {
            "state":             row["state"],
            "district":          row["district"],
            "department":        row["department"],
            "budget_allocated":  round(float(row["budget_allocated"]), 2),
            "total_spent":       round(float(row["total_spent"]), 2),
            "utilization_pct":   round(float(row["utilization_pct"]), 2),
            "lapse_risk_pct":    round(float(row["lapse_risk_pct"]), 2),
            "projected_unspent": round(float(row["projected_unspent"]), 2),
            "risk_tier":         row["risk_tier"],
        }
        for _, row in df.iterrows()
    ]