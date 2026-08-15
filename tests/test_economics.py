import pytest

from oilgas.economics import run_economics
from oilgas.models import (
    CapexItem,
    DeclineSegmentSpec,
    EconomicAssumptions,
    FiscalTerms,
    OpexAssumptions,
    PriceDeck,
    TypeCurve,
)


def make_type_curve():
    return TypeCurve(
        name="Test TC",
        start_date="2024-01-01",
        oil=DeclineSegmentSpec(qi=800.0, di_nominal_annual=0.70, b=1.1, dmin_annual=0.06, econ_limit=5.0),
        gas=DeclineSegmentSpec(qi=1500.0, di_nominal_annual=0.65, b=1.0, dmin_annual=0.06, econ_limit=20.0),
        water=None,
    )


def make_econ(capex_amount=3_000_000.0):
    return EconomicAssumptions(
        fiscal=FiscalTerms(working_interest=0.80, net_revenue_interest=0.75,
                            severance_tax_oil_pct=4.6, severance_tax_gas_pct=7.6, ad_valorem_tax_pct=2.0),
        price_deck=PriceDeck(oil_price=70.0, gas_price=3.0),
        opex=OpexAssumptions(fixed_monthly_cost=5000.0, variable_oil_cost=3.0, variable_gas_cost=0.3),
        capex=[CapexItem(name="D&C", amount=capex_amount, month_offset=0, is_gross=True)],
        forecast_months=240,
        discount_rates_pct=[0.0, 10.0, 20.0],
    )


def test_run_economics_produces_expected_columns():
    result = run_economics(make_type_curve(), make_econ())
    for col in ["gross_oil_bbl", "net_oil_bbl", "total_revenue", "total_taxes", "total_opex", "capex", "net_cash_flow"]:
        assert col in result.monthly.columns


def test_capex_applied_at_working_interest_share():
    econ = make_econ(capex_amount=1_000_000.0)
    result = run_economics(make_type_curve(), econ)
    # WI = 0.80, capex entered as gross -> net capex should be 800,000
    assert result.total_capex == 800_000.0


def test_capex_net_flag_bypasses_wi_scaling():
    tc = make_type_curve()
    econ = make_econ()
    econ.capex = [CapexItem(name="D&C", amount=1_000_000.0, month_offset=0, is_gross=False)]
    result = run_economics(tc, econ)
    assert result.total_capex == 1_000_000.0


def test_npv_decreases_as_discount_rate_increases():
    result = run_economics(make_type_curve(), make_econ())
    npvs = [result.npv_by_rate[r] for r in sorted(result.npv_by_rate)]
    assert npvs[0] >= npvs[1] >= npvs[2]


def test_irr_is_reasonable_for_profitable_case():
    result = run_economics(make_type_curve(), make_econ(capex_amount=5_000_000.0))
    assert result.irr_pct is not None
    assert result.irr_pct > 0


def test_payout_none_when_never_profitable():
    huge_capex_econ = make_econ(capex_amount=500_000_000.0)
    result = run_economics(make_type_curve(), huge_capex_econ)
    assert result.payout_months is None


def test_payout_positive_for_profitable_case():
    result = run_economics(make_type_curve(), make_econ(capex_amount=1_000_000.0))
    assert result.payout_months is not None
    assert result.payout_months > 0


def test_eur_matches_forecast_sums():
    result = run_economics(make_type_curve(), make_econ())
    assert result.eur_oil_bbl == result.monthly["gross_oil_bbl"].sum()
    assert result.eur_gas_mcf == result.monthly["gross_gas_mcf"].sum()


def test_revenue_uses_nri_not_wi():
    tc = make_type_curve()
    econ = make_econ()
    result = run_economics(tc, econ)
    month0 = result.monthly.iloc[0]
    expected_net_oil = month0["gross_oil_bbl"] * econ.fiscal.net_revenue_interest
    assert month0["net_oil_bbl"] == expected_net_oil


def test_annual_rollup_sums_to_monthly_totals():
    result = run_economics(make_type_curve(), make_econ())
    assert result.annual["net_cash_flow"].sum() == pytest.approx(result.monthly["net_cash_flow"].sum(), rel=1e-6)
