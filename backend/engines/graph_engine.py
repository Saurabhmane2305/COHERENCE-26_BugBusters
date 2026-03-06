"""
graph_engine.py
Builds a directed weighted graph from fund_releases.csv.
Computes absorption ratios per edge and flags leakage where
amount_received is abnormally lower than amount_released.

Output schema per edge:
    {
        release_id, from_entity, to_entity, from_level, to_level,
        amount_released, amount_received, gap_amount,
        absorption_ratio, leakage_score, is_leakage,
        state, district, department, month, year, scheme
    }
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import networkx as nx
import numpy as np
import pandas as pd

# ── Config ───────────────────────────────────────────────────────────────────

DATA_DIR             = os.path.join(os.path.dirname(__file__), "..", "data")
RELEASES_CSV         = os.path.join(DATA_DIR, "fund_releases.csv")
LEAKAGE_THRESHOLD    = 0.85   # absorption_ratio below this = leakage flag
SEVERE_THRESHOLD     = 0.70   # absorption_ratio below this = severe leakage


# ── Data loader ───────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_releases() -> pd.DataFrame:
    df = pd.read_csv(RELEASES_CSV)

    # Normalize column names — strip whitespace, lowercase
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Ensure required columns exist before computing
    required = {"amount_released", "amount_received"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(
            f"fund_releases.csv is missing columns: {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    # Recompute always — ensures consistency even if CSV already has these cols
    df["amount_released"]  = pd.to_numeric(df["amount_released"],  errors="coerce").fillna(0)
    df["amount_received"]  = pd.to_numeric(df["amount_received"],  errors="coerce").fillna(0)
    df["absorption_ratio"] = (df["amount_received"] / df["amount_released"].replace(0, 1)).round(4)
    df["gap_amount"]       = (df["amount_released"] - df["amount_received"]).round(2)
    return df


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph(year: int | None = None, state: str | None = None) -> nx.DiGraph:
    """
    Build directed graph for a given year/state filter.
    Nodes  = administrative entities
    Edges  = fund transfers with weight = amount_released
    """
    df = _load_releases()

    if year:
        df = df[df["year"] == year]
    if state:
        df = df[df["state"] == state]

    G = nx.DiGraph()

    for _, row in df.iterrows():
        src = row["from_entity"]
        dst = row["to_entity"]

        if not G.has_node(src):
            G.add_node(src, level=row["from_level"])
        if not G.has_node(dst):
            G.add_node(dst, level=row["to_level"])

        # Aggregate multi-month edges
        if G.has_edge(src, dst):
            G[src][dst]["amount_released"] += row["amount_released"]
            G[src][dst]["amount_received"] += row["amount_received"]
            G[src][dst]["gap_amount"]       += row["gap_amount"]
            G[src][dst]["count"]            += 1
        else:
            G.add_edge(
                src, dst,
                amount_released = row["amount_released"],
                amount_received = row["amount_received"],
                gap_amount      = row["gap_amount"],
                state           = row["state"],
                district        = row["district"],
                department      = row["department"],
                from_level      = row["from_level"],
                to_level        = row["to_level"],
                count           = 1,
            )

    # Recompute absorption ratio on aggregated values
    for u, v, data in G.edges(data=True):
        if data["amount_released"] > 0:
            data["absorption_ratio"] = round(data["amount_received"] / data["amount_released"], 4)
        else:
            data["absorption_ratio"] = 1.0
        data["leakage_score"] = round((1 - data["absorption_ratio"]) * 100, 2)
        data["is_leakage"]    = data["absorption_ratio"] < LEAKAGE_THRESHOLD
        data["severity"]      = _severity(data["absorption_ratio"])

    return G


def _severity(ratio: float) -> str:
    if ratio < SEVERE_THRESHOLD:
        return "CRITICAL"
    elif ratio < LEAKAGE_THRESHOLD:
        return "HIGH"
    elif ratio < 0.92:
        return "MEDIUM"
    return "NORMAL"


# ── Leakage edge extractor ────────────────────────────────────────────────────

def get_leakage_edges(
    year:     int | None = None,
    state:    str | None = None,
    min_score: float     = 1.0,
) -> list[dict[str, Any]]:
    """
    Returns all edges where leakage is detected, sorted by leakage_score desc.
    """
    G   = build_graph(year=year, state=state)
    out = []

    for u, v, data in G.edges(data=True):
        if data["leakage_score"] >= min_score:
            out.append({
                "from_entity":      u,
                "to_entity":        v,
                "from_level":       data.get("from_level"),
                "to_level":         data.get("to_level"),
                "state":            data.get("state"),
                "district":         data.get("district"),
                "department":       data.get("department"),
                "amount_released":  round(data["amount_released"], 2),
                "amount_received":  round(data["amount_received"], 2),
                "gap_amount":       round(data["gap_amount"], 2),
                "absorption_ratio": data["absorption_ratio"],
                "leakage_score":    data["leakage_score"],
                "is_leakage":       data["is_leakage"],
                "severity":         data["severity"],
            })

    return sorted(out, key=lambda x: x["leakage_score"], reverse=True)


# ── Sankey data formatter ─────────────────────────────────────────────────────

def get_sankey_data(year: int | None = None, state: str | None = None) -> dict[str, Any]:
    """
    Returns nodes + links in Recharts Sankey format.
    Link color encodes leakage severity.
    """
    G = build_graph(year=year, state=state)

    node_index: dict[str, int] = {}
    nodes = []
    links = []

    for node, attrs in G.nodes(data=True):
        node_index[node] = len(nodes)
        nodes.append({"name": node, "level": attrs.get("level", "Unknown")})

    for u, v, data in G.edges(data=True):
        links.append({
            "source":           node_index[u],
            "target":           node_index[v],
            "value":            round(data["amount_released"] / 1_00_000, 2),  # in Lakhs
            "leakage_score":    data["leakage_score"],
            "absorption_ratio": data["absorption_ratio"],
            "severity":         data["severity"],
            "fill":             _edge_color(data["severity"]),
        })

    return {"nodes": nodes, "links": links}


def _edge_color(severity: str) -> str:
    return {
        "CRITICAL": "#ef4444",
        "HIGH":     "#f97316",
        "MEDIUM":   "#facc15",
        "NORMAL":   "#22c55e",
    }.get(severity, "#94a3b8")


# ── Network-level summary ─────────────────────────────────────────────────────

def get_flow_summary(year: int | None = None) -> dict[str, Any]:
    df = _load_releases()
    if year:
        df = df[df["year"] == year]

    total_released   = df["amount_released"].sum()
    total_received   = df["amount_received"].sum()
    total_gap        = df["gap_amount"].sum()
    leakage_edges    = df[df["absorption_ratio"] < LEAKAGE_THRESHOLD]
    critical_edges   = df[df["absorption_ratio"] < SEVERE_THRESHOLD]

    return {
        "total_released_cr":       round(total_released / 1e7, 2),
        "total_received_cr":       round(total_received / 1e7, 2),
        "total_gap_cr":            round(total_gap / 1e7, 2),
        "overall_absorption_pct":  round((total_received / total_released) * 100, 2),
        "leakage_edge_count":      int(len(leakage_edges)),
        "critical_edge_count":     int(len(critical_edges)),
        "leakage_loss_pct":        round((total_gap / total_released) * 100, 2),
    }