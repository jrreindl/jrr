"""Data model for projects, prospects, type curves and economic assumptions.

All classes are plain dataclasses with primitive/str/list/dict leaf fields
only (dates are stored as ISO date strings), so they round-trip cleanly
through `dataclasses.asdict` / JSON with the helpers in `storage.py`.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class DeclineSegmentSpec:
    """Serializable twin of decline_curve.DeclineSegment (per-day rate units)."""

    qi: float = 0.0
    di_nominal_annual: float = 0.70
    b: float = 1.0
    dmin_annual: float = 0.06
    econ_limit: float = 5.0


@dataclass
class TypeCurve:
    name: str = "Type Curve"
    start_date: str = ""  # ISO "YYYY-MM-DD", first producing month
    oil: Optional[DeclineSegmentSpec] = None
    gas: Optional[DeclineSegmentSpec] = None
    water: Optional[DeclineSegmentSpec] = None


@dataclass
class FiscalTerms:
    working_interest: float = 0.80  # WI: your share of costs
    net_revenue_interest: float = 0.75  # NRI: your share of revenue (after royalty)
    severance_tax_oil_pct: float = 4.6  # percent of oil revenue
    severance_tax_gas_pct: float = 7.6  # percent of gas revenue
    ad_valorem_tax_pct: float = 2.0  # percent of total revenue


@dataclass
class PriceDeck:
    oil_price: float = 70.0  # $/bbl flat base price
    gas_price: float = 3.00  # $/Mcf flat base price
    ngl_price: float = 25.0  # $/bbl, only used if NGL yield > 0
    ngl_yield_bbl_per_mmcf: float = 0.0  # bbl NGL per MMcf gas produced
    oil_differential: float = 0.0  # $/bbl, added to oil_price (can be negative)
    gas_differential: float = 0.0  # $/Mcf, added to gas_price
    oil_price_escalation_pct_per_year: float = 0.0
    gas_price_escalation_pct_per_year: float = 0.0


@dataclass
class OpexAssumptions:
    fixed_monthly_cost: float = 3000.0  # $/month, flat LOE (applied at WI)
    variable_oil_cost: float = 3.0  # $/bbl (applied to WI oil volume)
    variable_gas_cost: float = 0.30  # $/Mcf (applied to WI gas volume)
    variable_water_cost: float = 1.00  # $/bbl water disposal (applied to WI water volume)
    gathering_processing_pct_of_gas_rev: float = 0.0  # % deducted from gas revenue
    transportation_oil: float = 0.0  # $/bbl, applied to WI oil volume
    opex_escalation_pct_per_year: float = 0.0


@dataclass
class CapexItem:
    name: str = "Drilling & Completion"
    amount: float = 0.0  # $, sign should be positive (outflow)
    month_offset: int = 0  # months relative to first production (0 = month 1, negative = pre-production)
    is_gross: bool = True  # True: amount is 100% AFE, WI% applied; False: amount already net to WI


@dataclass
class EconomicAssumptions:
    fiscal: FiscalTerms = field(default_factory=FiscalTerms)
    price_deck: PriceDeck = field(default_factory=PriceDeck)
    opex: OpexAssumptions = field(default_factory=OpexAssumptions)
    capex: List[CapexItem] = field(default_factory=list)
    forecast_months: int = 360  # 30-year default forecast horizon
    discount_rates_pct: List[float] = field(default_factory=lambda: [8.0, 10.0, 12.0, 15.0, 20.0])


@dataclass
class Prospect:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str = "New Prospect"
    basin: str = ""
    county_state: str = ""
    notes: str = ""
    type_curve: Optional[TypeCurve] = None
    economics: EconomicAssumptions = field(default_factory=EconomicAssumptions)
    last_results_summary: Optional[Dict[str, Any]] = None


@dataclass
class Project:
    name: str = "New Project"
    prospects: List[Prospect] = field(default_factory=list)

    def get_prospect(self, prospect_id: str) -> Optional[Prospect]:
        return next((p for p in self.prospects if p.id == prospect_id), None)
