"""
routers/reallocation.py — Reallocation recommendations + simulation
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from engines.realloc_engine import get_reallocation_recommendations, simulate_transfer

router = APIRouter(prefix="/api/reallocation", tags=["Reallocation"])


@router.get("/recommendations")
def recommendations(
    year:        int           = Query(2024),
    as_of_month: int           = Query(8),
    state:       Optional[str] = Query(None),
):
    result = get_reallocation_recommendations(
        year=year, as_of_month=as_of_month, state=state
    )
    recs = []
    for r in result.get("recommendations", []):
        recs.append({
            "from_state":          r["from_state"],
            "from_district":       r["from_district"],
            "from_department":     r["from_department"],
            "to_state":            r.get("to_state", r["from_state"]),  # ← now included
            "to_district":         r["to_district"],
            "to_department":       r["to_department"],
            "transfer_amount":     r["transfer_amount"],
            "from_lapse_risk_pct": r["from_lapse_risk"],
            "priority_score":      round(
                r["from_lapse_risk"] * r["projected_improvement_to"] / 100, 2
            ),
            "rationale": (
                f"Transfer ₹{r['transfer_amount_lakh']:.1f}L from "
                f"{r['from_department']}, {r['from_district']} "
                f"(lapse risk {r['from_lapse_risk']:.1f}%) to "
                f"{r['to_department']}, {r['to_district']} "
                f"(utilization {r['to_utilization']:.1f}%). "
                f"Expected improvement: +{r['projected_improvement_to']:.1f}pp."
            ),
        })
    return recs


class SimulateRequest(BaseModel):
    from_state:      str
    from_district:   str
    from_department: str
    to_state:        Optional[str] = None   # ← ADDED: defaults to from_state if not sent
    to_district:     str
    to_department:   str
    transfer_pct:    float
    year:            int = 2024
    as_of_month:     int = 8


@router.post("/simulate")
def simulate(body: SimulateRequest):
    # ── If frontend doesn't send to_state, assume same state as from ─────────
    resolved_to_state = body.to_state or body.from_state

    result = simulate_transfer(
        from_state      = body.from_state,
        from_district   = body.from_district,
        from_department = body.from_department,
        to_state        = resolved_to_state,   # ← FIXED
        to_district     = body.to_district,
        to_department   = body.to_department,
        transfer_pct    = body.transfer_pct,
        year            = body.year,
        as_of_month     = body.as_of_month,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    f = result["from"]
    t = result["to"]

    return {
        "transfer_amount":          result["transfer_amount"],
        "transfer_amount_lakh":     result["transfer_amount_lakh"],
        "from_department":          f["department"],
        "from_district":            f["district"],
        "to_department":            t["department"],
        "to_district":              t["district"],
        "from_new_lapse_risk_pct":  f["after_lapse_pct"],
        "to_new_projected_final":   t["after_util_pct"] / 100,
        "net_utilization_gain":     result["net_utilization_gain"],
        "impact_summary": (
            f"Transferring ₹{result['transfer_amount_lakh']:.1f}L reduces "
            f"{f['department']}, {f['district']} lapse risk: "
            f"{f['before_lapse_pct']:.1f}% → {f['after_lapse_pct']:.1f}%. "
            f"{t['department']}, {t['district']} utilization: "
            f"{t['before_util_pct']:.1f}% → {t['after_util_pct']:.1f}%."
        ),
    }