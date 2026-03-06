"""
schemas/reallocation.py
Pydantic models for the reallocation router — request body and response shapes.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────────────────────

class SimulateTransferRequest(BaseModel):
    from_state:      str   = Field(..., example="Uttar Pradesh")
    from_district:   str   = Field(..., example="Varanasi")
    from_department: str   = Field(..., example="Health")
    to_district:     str   = Field(..., example="Pune")
    to_department:   str   = Field(..., example="Water Supply")
    transfer_pct:    float = Field(..., ge=0.1, le=20.0, example=20.0,
                                   description="Percentage of surplus to transfer (max 20%)")
    year:            int   = Field(2024, example=2024)
    as_of_month:     int   = Field(8, ge=1, le=12, example=8)


# ── Pool entry ─────────────────────────────────────────────────────────────────

class PoolEntry(BaseModel):
    state:             str
    district:          str
    department:        str
    budget_allocated:  float
    total_spent:       float
    utilization_pct:   float
    lapse_risk_pct:    float
    projected_unspent: float
    risk_tier:         str


# ── Recommendation ─────────────────────────────────────────────────────────────

class ReallocationRecommendation(BaseModel):
    from_state:                  str
    from_district:               str
    from_department:             str
    from_lapse_risk:             float
    from_utilization:            float
    to_district:                 str
    to_department:               str
    to_utilization:              float
    transfer_amount:             float
    transfer_amount_lakh:        float
    projected_improvement_from:  float
    projected_improvement_to:    float

    # Alias fields expected by the frontend
    @property
    def from_lapse_risk_pct(self) -> float:
        return self.from_lapse_risk

    @property
    def rationale(self) -> str:
        return (
            f"Transfer {self.transfer_amount_lakh:.1f}L from {self.from_department}, "
            f"{self.from_district} (lapse risk {self.from_lapse_risk:.1f}%) to "
            f"{self.to_department}, {self.to_district} "
            f"(utilization {self.to_utilization:.1f}%). "
            f"Projected utilization improvement: +{self.projected_improvement_to:.1f}pp."
        )

    @property
    def priority_score(self) -> float:
        return round(self.from_lapse_risk * self.projected_improvement_to / 100, 2)


# ── Recommendation list response ───────────────────────────────────────────────

class ReallocationSummary(BaseModel):
    surplus_count:          int
    demand_count:           int
    recommendation_count:   int
    total_transferable_cr:  float


class ReallocationResponse(BaseModel):
    surplus_pool:    list[PoolEntry]
    demand_pool:     list[PoolEntry]
    recommendations: list[ReallocationRecommendation]
    summary:         ReallocationSummary


# ── Simulate response ──────────────────────────────────────────────────────────

class DeptSimResult(BaseModel):
    department:       str
    district:         str
    before_util_pct:  float
    after_util_pct:   float
    before_lapse_pct: float
    after_lapse_pct:  float


class SimulateTransferResponse(BaseModel):
    transfer_amount:      float
    transfer_amount_lakh: float
    transfer_pct:         float
    from_department:      str
    from_district:        str
    to_department:        str
    to_district:          str
    from_new_lapse_risk_pct:    float
    to_new_projected_final:     float
    net_utilization_gain:       float
    impact_summary:             str

    # Full detail blocks
    from_detail: Optional[DeptSimResult] = None
    to_detail:   Optional[DeptSimResult] = None