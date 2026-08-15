import math
from datetime import date

import pytest

from oilgas.decline_curve import (
    DeclineSegment,
    cumulative_hyperbolic,
    fit_arps,
    monthly_forecast,
    nominal_decline_at_time,
    rate_at_time,
    time_to_terminal_decline,
)


def test_exponential_rate_matches_closed_form():
    qi, di = 1000.0, 0.5
    t = 2.0
    q = rate_at_time(qi, di, 0.0, t)
    assert q == pytest.approx(qi * math.exp(-di * t), rel=1e-6)


def test_hyperbolic_rate_decreases_over_time():
    qi, di, b = 1000.0, 0.7, 0.8
    q0 = rate_at_time(qi, di, b, 0.0)
    q1 = rate_at_time(qi, di, b, 1.0)
    q2 = rate_at_time(qi, di, b, 2.0)
    assert q0 == pytest.approx(qi)
    assert q1 < q0
    assert q2 < q1


def test_nominal_decline_decreases_for_hyperbolic():
    di, b = 0.7, 0.8
    d0 = nominal_decline_at_time(di, b, 0.0)
    d1 = nominal_decline_at_time(di, b, 5.0)
    assert d0 == pytest.approx(di)
    assert d1 < d0


def test_time_to_terminal_decline_is_none_for_exponential():
    assert time_to_terminal_decline(0.5, 0.0, 0.06) is None


def test_time_to_terminal_decline_positive_for_hyperbolic():
    t_switch = time_to_terminal_decline(0.7, 0.8, 0.06)
    assert t_switch is not None
    assert t_switch > 0
    # nominal decline at t_switch should equal dmin
    assert nominal_decline_at_time(0.7, 0.8, t_switch) == pytest.approx(0.06, rel=1e-6)


def test_cumulative_hyperbolic_matches_integral_for_exponential_case():
    # b=0 special case: Np = (qi - q(t)) / di, verified against known closed form
    qi, di = 1000.0, 0.5
    t = 3.0
    q_t = rate_at_time(qi, di, 0.0, t)
    expected = (qi - q_t) / di
    assert cumulative_hyperbolic(qi, di, 0.0, t) == pytest.approx(expected, rel=1e-9)


def test_decline_segment_switches_to_exponential_terminal_decline():
    seg = DeclineSegment(qi=1000.0, di_nominal_annual=0.70, b=1.2, dmin_annual=0.06, econ_limit=1.0)
    t_switch = time_to_terminal_decline(seg.di_nominal_annual, seg.b, seg.dmin_annual)
    assert t_switch is not None
    # well past the switch point, decline rate between two points should approach dmin
    r1 = seg.rate_at(t_switch + 5.0)
    r2 = seg.rate_at(t_switch + 6.0)
    implied_annual_decline = -1 * (r2 - r1) / r1  # approx nominal decline over ~1 yr
    assert implied_annual_decline == pytest.approx(seg.dmin_annual, abs=0.01)


def test_decline_segment_zero_below_econ_limit():
    seg = DeclineSegment(qi=100.0, di_nominal_annual=0.90, b=0.5, dmin_annual=0.08, econ_limit=10.0)
    # far enough out, rate must have dropped to zero (econ limit truncation)
    assert seg.rate_at(50.0) == 0.0


def test_monthly_forecast_shape_and_positive_early_volumes():
    seg = DeclineSegment(qi=500.0, di_nominal_annual=0.65, b=1.0, dmin_annual=0.06, econ_limit=5.0)
    df = monthly_forecast(seg, date(2024, 1, 1), 24)
    assert len(df) == 24
    assert df.loc[0, "volume"] > 0
    # cumulative volume across months should be less than qi*days for month0 (declining)
    assert df["volume"].iloc[0] > df["volume"].iloc[1]


def test_monthly_forecast_none_segment_is_all_zero():
    df = monthly_forecast(None, date(2024, 1, 1), 12)
    assert (df["volume"] == 0).all()


def test_fit_arps_recovers_known_parameters():
    true_qi, true_di, true_b = 600.0, 0.65, 0.9
    t = [i / 12.0 for i in range(36)]
    rates = [rate_at_time(true_qi, true_di, true_b, ti) for ti in t]
    fit = fit_arps(t, rates)
    assert fit["qi"] == pytest.approx(true_qi, rel=0.02)
    assert fit["di_nominal_annual"] == pytest.approx(true_di, rel=0.05)
    assert fit["b"] == pytest.approx(true_b, rel=0.1)


def test_fit_arps_requires_min_points():
    with pytest.raises(ValueError):
        fit_arps([0, 0.1], [100, 90])


def test_monthly_forecast_truncates_after_econ_limit():
    seg = DeclineSegment(qi=50.0, di_nominal_annual=0.95, b=0.3, dmin_annual=0.08, econ_limit=20.0)
    df = monthly_forecast(seg, date(2024, 1, 1), 60)
    zero_rows = df[df["volume"] == 0]
    assert len(zero_rows) > 0
    first_zero = zero_rows["month"].min()
    # once truncated, everything after should stay zero
    assert (df.loc[df["month"] >= first_zero, "volume"] == 0).all()
