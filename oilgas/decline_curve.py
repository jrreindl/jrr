"""Arps decline-curve math for type-curve forecasting.

Implements standard hyperbolic/exponential/harmonic Arps decline with a
hyperbolic-to-exponential ("terminal decline") switch, which is the
convention used throughout upstream oil & gas reserves and economics work.

All internal math works in *annual* units (rate per year, time in years)
so the closed-form Arps integrals apply directly. Callers typically supply
rates in per-day terms (bbl/d, Mcf/d); convert with DAYS_PER_YEAR before
calling into this module, or use `monthly_forecast`, which handles that
conversion for you.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Optional

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

DAYS_PER_YEAR = 365.25


def rate_at_time(qi: float, di: float, b: float, t: float) -> float:
    """Instantaneous Arps rate at time t (years), before any terminal-decline switch.

    qi: initial rate (vol/year), di: nominal annual decline (fraction),
    b: hyperbolic exponent (0 = exponential, 1 = harmonic, 0<b<1 hyperbolic).
    """
    if t <= 0:
        return qi
    if b == 0:
        return qi * math.exp(-di * t)
    return qi * (1.0 + b * di * t) ** (-1.0 / b)


def nominal_decline_at_time(di: float, b: float, t: float) -> float:
    """Instantaneous nominal decline rate at time t, hyperbolic segment only."""
    if b == 0:
        return di
    return di / (1.0 + b * di * t)


def time_to_terminal_decline(di: float, b: float, dmin: float) -> Optional[float]:
    """Years until the hyperbolic nominal decline rate falls to dmin.

    Returns None if the curve is exponential (b<=0) or never reaches dmin
    (dmin <= 0 or dmin >= di), meaning no switch is needed/possible.
    """
    if b <= 0 or dmin <= 0 or dmin >= di:
        return None
    return (di / dmin - 1.0) / (b * di)


def cumulative_hyperbolic(qi: float, di: float, b: float, t: float) -> float:
    """Closed-form Arps cumulative volume from 0 to t (years), single segment,
    no terminal-decline switch applied."""
    if t <= 0:
        return 0.0
    q_t = rate_at_time(qi, di, b, t)
    if b == 0:
        return (qi - q_t) / di
    if abs(b - 1.0) < 1e-9:
        return (qi / di) * math.log(qi / q_t)
    return (qi / ((1.0 - b) * di)) * (1.0 - (q_t / qi) ** (1.0 - b))


@dataclass
class DeclineSegment:
    """A single-phase Arps decline definition, in per-day rate terms (the
    units analysts normally think in: bbl/d, Mcf/d, bbl/d water)."""

    qi: float  # initial rate, vol/day
    di_nominal_annual: float  # nominal annual decline, fraction (e.g. 0.70)
    b: float  # hyperbolic exponent
    dmin_annual: float  # terminal nominal decline, fraction (e.g. 0.06)
    econ_limit: float  # rate floor, vol/day; forecast stops below this

    def rate_at(self, t_years: float) -> float:
        """Rate (vol/day) at time t_years, with terminal-decline switch and
        econ-limit floor applied."""
        qi_annual = self.qi * DAYS_PER_YEAR
        t_switch = time_to_terminal_decline(self.di_nominal_annual, self.b, self.dmin_annual)
        if t_switch is not None and t_years > t_switch:
            q_switch = rate_at_time(qi_annual, self.di_nominal_annual, self.b, t_switch)
            q_annual = q_switch * math.exp(-self.dmin_annual * (t_years - t_switch))
        else:
            q_annual = rate_at_time(qi_annual, self.di_nominal_annual, self.b, t_years)
        q_daily = q_annual / DAYS_PER_YEAR
        if q_daily < self.econ_limit:
            return 0.0
        return q_daily

    def cumulative_at(self, t_years: float) -> float:
        """Cumulative volume (vol) from 0 to t_years, terminal-decline switch
        applied, NOT econ-limit truncated (caller truncates at the volume level)."""
        if t_years <= 0:
            return 0.0
        qi_annual = self.qi * DAYS_PER_YEAR
        t_switch = time_to_terminal_decline(self.di_nominal_annual, self.b, self.dmin_annual)
        if t_switch is None or t_years <= t_switch:
            return cumulative_hyperbolic(qi_annual, self.di_nominal_annual, self.b, t_years)
        np_switch = cumulative_hyperbolic(qi_annual, self.di_nominal_annual, self.b, t_switch)
        q_switch = rate_at_time(qi_annual, self.di_nominal_annual, self.b, t_switch)
        dmin = self.dmin_annual
        dt = t_years - t_switch
        np_exp = (q_switch - q_switch * math.exp(-dmin * dt)) / dmin
        return np_switch + np_exp


def monthly_forecast(segment: Optional[DeclineSegment], start_date: date, n_months: int) -> pd.DataFrame:
    """Build a monthly production forecast for one phase.

    Returns a DataFrame indexed by month (0..n_months-1) with columns:
    date (month-start), days, volume (for the month), avg_rate (volume/days).
    Once the average rate for a month drops below the segment's econ_limit,
    that month and all subsequent months are zeroed out (well is "off
    econ limit"). Passing segment=None returns an all-zero forecast (phase
    not modeled for this prospect).
    """
    month_starts = pd.date_range(start=start_date, periods=n_months + 1, freq="MS")
    rows = []
    econ_limit_hit = False
    for i in range(n_months):
        d0, d1 = month_starts[i], month_starts[i + 1]
        days = (d1 - d0).days
        if segment is None:
            rows.append({"month": i, "date": d0.date(), "days": days, "volume": 0.0, "avg_rate": 0.0})
            continue
        t0 = (d0.date() - start_date).days / DAYS_PER_YEAR
        t1 = (d1.date() - start_date).days / DAYS_PER_YEAR
        volume = max(0.0, segment.cumulative_at(t1) - segment.cumulative_at(t0))
        avg_rate = volume / days if days else 0.0
        if not econ_limit_hit and avg_rate < segment.econ_limit and i > 0:
            econ_limit_hit = True
        if econ_limit_hit:
            volume, avg_rate = 0.0, 0.0
        rows.append({"month": i, "date": d0.date(), "days": days, "volume": volume, "avg_rate": avg_rate})
    return pd.DataFrame(rows)


def fit_arps(t_years: "list[float] | pd.Series", rate: "list[float] | pd.Series") -> dict:
    """Least-squares fit of qi, di (nominal annual), b to historical rate-vs-time
    data using the base (no terminal-decline switch) Arps hyperbolic form.

    t_years: elapsed time since first point, in years (must start near 0).
    rate: observed rate at each t (same units the caller wants qi returned in,
    e.g. bbl/d).

    Returns {"qi", "di_nominal_annual", "b"}. Caller is expected to pick a
    dmin_annual and econ_limit separately (those aren't fit from history,
    they're forward-looking assumptions).
    """
    t = np.asarray(t_years, dtype=float)
    q = np.asarray(rate, dtype=float)
    if len(t) < 3:
        raise ValueError("Need at least 3 data points to fit a decline curve.")

    def model(t_, qi, di, b):
        with np.errstate(over="ignore", invalid="ignore"):
            return np.where(
                b < 1e-6,
                qi * np.exp(-di * t_),
                qi * (1.0 + np.maximum(b, 1e-6) * di * t_) ** (-1.0 / np.maximum(b, 1e-6)),
            )

    qi0 = float(q[0]) if q[0] > 0 else float(np.max(q))
    p0 = [qi0, 0.7, 1.0]
    bounds = ([1e-3, 1e-4, 0.0], [qi0 * 10 + 1, 5.0, 2.0])
    popt, _ = curve_fit(model, t, q, p0=p0, bounds=bounds, maxfev=10000)
    qi_fit, di_fit, b_fit = popt
    return {"qi": float(qi_fit), "di_nominal_annual": float(di_fit), "b": float(b_fit)}


def eur(segment: Optional[DeclineSegment], start_date: date, n_months: int) -> float:
    """Estimated ultimate recovery over the forecast horizon (sum of monthly volumes)."""
    if segment is None:
        return 0.0
    return float(monthly_forecast(segment, start_date, n_months)["volume"].sum())
