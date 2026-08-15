"""Discounted cash flow engine.

Builds a monthly cash flow from a type curve + fiscal terms + price deck +
opex + capex, then rolls it up into standard reserve-economics KPIs:
NPV at each requested discount rate, IRR, payout, EUR, etc.

Conventions (standard upstream O&G practice):
- Revenue is taken at Net Revenue Interest (NRI): your share of the
  well's revenue after the royalty burden.
- Opex and capex are taken at Working Interest (WI): your share of the
  well's costs, since WI bears costs regardless of royalty.
- Severance / ad valorem taxes are computed on NRI revenue (the revenue
  you actually receive).
- Discounting uses actual calendar-day timing from the case's effective
  (as-of) date, mid-period convention (cash assumed to arrive at the
  midpoint of each month), which is the industry-standard convention for
  monthly reserve reports.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from .decline_curve import DeclineSegment, monthly_forecast
from .models import EconomicAssumptions, TypeCurve


def _to_decline_segment(spec) -> Optional[DeclineSegment]:
    if spec is None:
        return None
    return DeclineSegment(
        qi=spec.qi,
        di_nominal_annual=spec.di_nominal_annual,
        b=spec.b,
        dmin_annual=spec.dmin_annual,
        econ_limit=spec.econ_limit,
    )


@dataclass
class CashFlowResult:
    monthly: pd.DataFrame
    annual: pd.DataFrame
    npv_by_rate: Dict[float, float]
    irr_pct: Optional[float]
    payout_months: Optional[int]
    total_capex: float
    total_net_cash_flow: float
    eur_oil_bbl: float
    eur_gas_mcf: float
    eur_water_bbl: float
    roi: Optional[float]


def _npv(monthly_net_cf: np.ndarray, t_years: np.ndarray, annual_rate_pct: float) -> float:
    r = annual_rate_pct / 100.0
    discount_factors = 1.0 / (1.0 + r) ** t_years
    return float(np.sum(monthly_net_cf * discount_factors))


def _irr(monthly_net_cf: np.ndarray, t_years: np.ndarray) -> Optional[float]:
    """Annualized IRR (%): the discount rate at which NPV=0, found by bisection
    on the same mid-period-timed NPV function used elsewhere. Uses annual
    compounding over t_years (not raw monthly periods) so long forecasts
    (300+ months) don't overflow float64 during the search.
    """
    if monthly_net_cf.sum() <= 0:
        return None
    if (monthly_net_cf <= 0).all() or (monthly_net_cf >= 0).all():
        return None

    def npv_at(rate_pct: float) -> float:
        with np.errstate(over="ignore", invalid="ignore"):
            return _npv(monthly_net_cf, t_years, rate_pct)

    lo, hi = -99.0, 100_000.0
    f_lo, f_hi = npv_at(lo), npv_at(hi)
    if not (np.isfinite(f_lo) and np.isfinite(f_hi)) or f_lo * f_hi > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2.0
        f_mid = npv_at(mid)
        if not np.isfinite(f_mid):
            hi = mid
            continue
        if abs(f_mid) < 1e-3:
            return mid
        if f_lo * f_mid < 0:
            hi, f_hi = mid, f_mid
        else:
            lo, f_lo = mid, f_mid
    return (lo + hi) / 2.0


def run_economics(type_curve: TypeCurve, econ: EconomicAssumptions) -> CashFlowResult:
    if not type_curve or not type_curve.start_date:
        raise ValueError("Type curve must have a start date before running economics.")
    start = date.fromisoformat(type_curve.start_date)
    n = econ.forecast_months

    oil_fc = monthly_forecast(_to_decline_segment(type_curve.oil), start, n)
    gas_fc = monthly_forecast(_to_decline_segment(type_curve.gas), start, n)
    wat_fc = monthly_forecast(_to_decline_segment(type_curve.water), start, n)

    df = pd.DataFrame({"month": range(n), "date": oil_fc["date"]})
    df["gross_oil_bbl"] = oil_fc["volume"]
    df["gross_gas_mcf"] = gas_fc["volume"]
    df["gross_water_bbl"] = wat_fc["volume"]
    df["days"] = oil_fc["days"]

    years_elapsed = np.arange(n) / 12.0

    fiscal = econ.fiscal
    wi = fiscal.working_interest
    nri = fiscal.net_revenue_interest

    df["net_oil_bbl"] = df["gross_oil_bbl"] * nri
    df["net_gas_mcf"] = df["gross_gas_mcf"] * nri
    df["net_water_bbl"] = df["gross_water_bbl"] * nri
    df["wi_oil_bbl"] = df["gross_oil_bbl"] * wi
    df["wi_gas_mcf"] = df["gross_gas_mcf"] * wi
    df["wi_water_bbl"] = df["gross_water_bbl"] * wi

    pd_ = econ.price_deck
    oil_price = (pd_.oil_price + pd_.oil_differential) * (1 + pd_.oil_price_escalation_pct_per_year / 100.0) ** years_elapsed
    gas_price = (pd_.gas_price + pd_.gas_differential) * (1 + pd_.gas_price_escalation_pct_per_year / 100.0) ** years_elapsed
    df["oil_price"] = oil_price
    df["gas_price"] = gas_price

    df["oil_revenue"] = df["net_oil_bbl"] * df["oil_price"]
    df["gas_revenue"] = df["net_gas_mcf"] * df["gas_price"]
    ngl_bbl = df["gross_gas_mcf"] / 1000.0 * pd_.ngl_yield_bbl_per_mmcf * nri
    df["ngl_revenue"] = ngl_bbl * pd_.ngl_price
    df["total_revenue"] = df["oil_revenue"] + df["gas_revenue"] + df["ngl_revenue"]

    df["severance_tax"] = (
        df["oil_revenue"] * fiscal.severance_tax_oil_pct / 100.0
        + df["gas_revenue"] * fiscal.severance_tax_gas_pct / 100.0
    )
    df["ad_valorem_tax"] = df["total_revenue"] * fiscal.ad_valorem_tax_pct / 100.0
    df["total_taxes"] = df["severance_tax"] + df["ad_valorem_tax"]

    opex = econ.opex
    opex_escalation = (1 + opex.opex_escalation_pct_per_year / 100.0) ** years_elapsed
    df["fixed_opex"] = opex.fixed_monthly_cost * opex_escalation * np.where(df["gross_oil_bbl"] + df["gross_gas_mcf"] > 0, 1.0, 0.0)
    df["variable_opex"] = (
        df["wi_oil_bbl"] * opex.variable_oil_cost
        + df["wi_gas_mcf"] * opex.variable_gas_cost
        + df["wi_water_bbl"] * opex.variable_water_cost
        + df["wi_oil_bbl"] * opex.transportation_oil
    ) * opex_escalation
    # Gathering/processing is a cost deducted from the WI share of gas revenue.
    wi_gas_revenue = df["gas_revenue"] * (wi / nri if nri else 0.0)
    df["gathering_processing"] = wi_gas_revenue * (opex.gathering_processing_pct_of_gas_rev / 100.0)
    df["total_opex"] = df["fixed_opex"] + df["variable_opex"] + df["gathering_processing"]

    df["capex"] = 0.0
    for item in econ.capex:
        idx = item.month_offset
        amount = item.amount * (wi if item.is_gross else 1.0)
        if 0 <= idx < n:
            df.loc[idx, "capex"] += amount
        elif idx < 0:
            df.loc[0, "capex"] += amount  # pre-production capex pulled into month 0

    df["operating_cash_flow"] = df["total_revenue"] - df["total_taxes"] - df["total_opex"]
    df["net_cash_flow"] = df["operating_cash_flow"] - df["capex"]
    df["cumulative_cash_flow"] = df["net_cash_flow"].cumsum()

    t_mid = (years_elapsed) + (0.5 / 12.0)
    for rate in econ.discount_rates_pct:
        factors = 1.0 / (1.0 + rate / 100.0) ** t_mid
        df[f"disc_cf_{rate:g}"] = df["net_cash_flow"] * factors
        df[f"cum_disc_cf_{rate:g}"] = df[f"disc_cf_{rate:g}"].cumsum()

    npv_by_rate = {rate: float(df[f"disc_cf_{rate:g}"].sum()) for rate in econ.discount_rates_pct}

    net_cf = df["net_cash_flow"].to_numpy()
    irr_pct = _irr(net_cf, t_mid)

    cum = df["cumulative_cash_flow"].to_numpy()
    payout_months = None
    positive_idx = np.where(cum >= 0)[0]
    if len(positive_idx) > 0 and df["capex"].sum() > 0:
        payout_months = int(positive_idx[0]) + 1

    total_capex = float(df["capex"].sum())
    total_net_cash_flow = float(df["net_cash_flow"].sum())
    roi = (total_net_cash_flow + total_capex) / total_capex if total_capex > 0 else None

    df["year"] = df["date"].apply(lambda d: d.year)
    annual_cols = [
        "gross_oil_bbl", "gross_gas_mcf", "gross_water_bbl",
        "net_oil_bbl", "net_gas_mcf",
        "total_revenue", "total_taxes", "total_opex", "capex",
        "operating_cash_flow", "net_cash_flow",
    ]
    annual = df.groupby("year")[annual_cols].sum().reset_index()
    annual["cumulative_cash_flow"] = annual["net_cash_flow"].cumsum()

    return CashFlowResult(
        monthly=df,
        annual=annual,
        npv_by_rate=npv_by_rate,
        irr_pct=irr_pct,
        payout_months=payout_months,
        total_capex=total_capex,
        total_net_cash_flow=total_net_cash_flow,
        eur_oil_bbl=float(df["gross_oil_bbl"].sum()),
        eur_gas_mcf=float(df["gross_gas_mcf"].sum()),
        eur_water_bbl=float(df["gross_water_bbl"].sum()),
        roi=roi,
    )
