import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from oilgas.app_state import ensure_project, require_active_prospect
from oilgas.economics import run_economics
from oilgas.models import CapexItem

st.set_page_config(page_title="Economics", page_icon="💰", layout="wide")
st.title("💰 Economics")

project = ensure_project()
prospect = require_active_prospect()
st.subheader(prospect.name)

if prospect.type_curve is None or not any([prospect.type_curve.oil, prospect.type_curve.gas, prospect.type_curve.water]):
    st.info("Build a **Type Curve** for this prospect first (at least one phase).")
    st.stop()

econ = prospect.economics

st.markdown("### Fiscal terms")
c1, c2 = st.columns(2)
econ.fiscal.working_interest = c1.number_input("Working Interest (WI)", min_value=0.0, max_value=1.0, value=econ.fiscal.working_interest, step=0.01)
econ.fiscal.net_revenue_interest = c2.number_input("Net Revenue Interest (NRI)", min_value=0.0, max_value=1.0, value=econ.fiscal.net_revenue_interest, step=0.01)
if econ.fiscal.net_revenue_interest > econ.fiscal.working_interest:
    st.warning("NRI is normally ≤ WI (NRI = WI × (1 − royalty burden)). Double-check these values.")

c3, c4, c5 = st.columns(3)
econ.fiscal.severance_tax_oil_pct = c3.number_input("Severance tax – oil (%)", min_value=0.0, max_value=100.0, value=econ.fiscal.severance_tax_oil_pct, step=0.1)
econ.fiscal.severance_tax_gas_pct = c4.number_input("Severance tax – gas (%)", min_value=0.0, max_value=100.0, value=econ.fiscal.severance_tax_gas_pct, step=0.1)
econ.fiscal.ad_valorem_tax_pct = c5.number_input("Ad valorem tax (%)", min_value=0.0, max_value=100.0, value=econ.fiscal.ad_valorem_tax_pct, step=0.1)

st.markdown("### Price deck")
pdk = econ.price_deck
c1, c2, c3 = st.columns(3)
pdk.oil_price = c1.number_input("Oil price ($/bbl)", min_value=0.0, value=pdk.oil_price, step=1.0)
pdk.gas_price = c2.number_input("Gas price ($/Mcf)", min_value=0.0, value=pdk.gas_price, step=0.1)
pdk.ngl_price = c3.number_input("NGL price ($/bbl)", min_value=0.0, value=pdk.ngl_price, step=1.0)
c4, c5, c6 = st.columns(3)
pdk.oil_differential = c4.number_input("Oil differential ($/bbl, +/-)", value=pdk.oil_differential, step=0.5)
pdk.gas_differential = c5.number_input("Gas differential ($/Mcf, +/-)", value=pdk.gas_differential, step=0.05)
pdk.ngl_yield_bbl_per_mmcf = c6.number_input("NGL yield (bbl per MMcf gas)", min_value=0.0, value=pdk.ngl_yield_bbl_per_mmcf, step=1.0)
c7, c8 = st.columns(2)
pdk.oil_price_escalation_pct_per_year = c7.number_input("Oil price escalation (%/yr)", value=pdk.oil_price_escalation_pct_per_year, step=0.5)
pdk.gas_price_escalation_pct_per_year = c8.number_input("Gas price escalation (%/yr)", value=pdk.gas_price_escalation_pct_per_year, step=0.5)

st.markdown("### Operating expenses (applied at your Working Interest share)")
opex = econ.opex
c1, c2, c3 = st.columns(3)
opex.fixed_monthly_cost = c1.number_input("Fixed LOE ($/month)", min_value=0.0, value=opex.fixed_monthly_cost, step=100.0)
opex.variable_oil_cost = c2.number_input("Variable oil cost ($/bbl)", min_value=0.0, value=opex.variable_oil_cost, step=0.5)
opex.variable_gas_cost = c3.number_input("Variable gas cost ($/Mcf)", min_value=0.0, value=opex.variable_gas_cost, step=0.05)
c4, c5, c6 = st.columns(3)
opex.variable_water_cost = c4.number_input("Water disposal cost ($/bbl)", min_value=0.0, value=opex.variable_water_cost, step=0.25)
opex.transportation_oil = c5.number_input("Oil transportation ($/bbl)", min_value=0.0, value=opex.transportation_oil, step=0.25)
opex.gathering_processing_pct_of_gas_rev = c6.number_input("Gathering/processing (% of gas revenue)", min_value=0.0, max_value=100.0, value=opex.gathering_processing_pct_of_gas_rev, step=1.0)
opex.opex_escalation_pct_per_year = st.number_input("Opex escalation (%/yr)", value=opex.opex_escalation_pct_per_year, step=0.5)

st.markdown("### Capital expenditures")
st.caption("Month offset 0 = first production month. Negative offsets (pre-spud capex) are pulled into month 0.")
capex_df = pd.DataFrame([{"Name": c.name, "Amount ($)": c.amount, "Month offset": c.month_offset, "Gross (apply WI%)": c.is_gross} for c in econ.capex])
if capex_df.empty:
    capex_df = pd.DataFrame([{"Name": "Drilling & Completion", "Amount ($)": 5_000_000.0, "Month offset": 0, "Gross (apply WI%)": True}])
edited = st.data_editor(capex_df, num_rows="dynamic", width='stretch', key="capex_editor")
econ.capex = [
    CapexItem(name=str(row["Name"]), amount=float(row["Amount ($)"]), month_offset=int(row["Month offset"]), is_gross=bool(row["Gross (apply WI%)"]))
    for _, row in edited.iterrows()
    if pd.notna(row["Name"]) and str(row["Name"]).strip()
]

st.markdown("### Run settings")
c1, c2 = st.columns(2)
econ.forecast_months = c1.number_input("Forecast horizon (months)", min_value=12, max_value=600, value=econ.forecast_months, step=12)
rates_str = c2.text_input("Discount rates (%, comma-separated)", value=", ".join(str(r) for r in econ.discount_rates_pct))
try:
    econ.discount_rates_pct = sorted({float(x.strip()) for x in rates_str.split(",") if x.strip()})
except ValueError:
    st.warning("Couldn't parse discount rates; keeping previous values.")

st.divider()
run = st.button("▶️ Run Economics", type="primary")

if run:
    try:
        result = run_economics(prospect.type_curve, econ)
    except Exception as e:
        st.error(f"Economics run failed: {e}")
        st.stop()

    npv10 = result.npv_by_rate.get(10.0, next(iter(result.npv_by_rate.values())))
    prospect.last_results_summary = {
        "npv10": npv10,
        "irr_pct": result.irr_pct,
        "payout_months": result.payout_months,
        "total_capex": result.total_capex,
        "eur_oil_bbl": result.eur_oil_bbl,
        "eur_gas_mcf": result.eur_gas_mcf,
    }

    st.markdown("### Results")
    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Total capex ($)", f"{result.total_capex:,.0f}")
    k2.metric("IRR", f"{result.irr_pct:,.1f}%" if result.irr_pct is not None else "N/A")
    k3.metric("Payout (months)", result.payout_months if result.payout_months else "Never")
    k4.metric("EUR oil (bbl)", f"{result.eur_oil_bbl:,.0f}")
    k5.metric("EUR gas (Mcf)", f"{result.eur_gas_mcf:,.0f}")

    st.markdown("#### NPV by discount rate")
    npv_df = pd.DataFrame(
        [{"Discount rate (%)": r, "NPV ($)": v} for r, v in sorted(result.npv_by_rate.items())]
    )
    c1, c2 = st.columns([1, 2])
    c1.dataframe(npv_df.style.format({"NPV ($)": "{:,.0f}"}), hide_index=True, width='stretch')
    fig_npv = go.Figure(go.Bar(x=npv_df["Discount rate (%)"], y=npv_df["NPV ($)"]))
    fig_npv.update_layout(height=300, margin=dict(t=20, b=20), xaxis_title="Discount rate (%)", yaxis_title="NPV ($)")
    c2.plotly_chart(fig_npv, width='stretch')

    st.markdown("#### Annual cash flow")
    annual_display = result.annual.copy()
    money_cols = ["total_revenue", "total_taxes", "total_opex", "capex", "operating_cash_flow", "net_cash_flow", "cumulative_cash_flow"]
    st.dataframe(annual_display.style.format({c: "{:,.0f}" for c in money_cols}), hide_index=True, width='stretch')

    fig_cf = go.Figure()
    fig_cf.add_trace(go.Bar(x=annual_display["year"], y=annual_display["net_cash_flow"], name="Net cash flow"))
    fig_cf.add_trace(go.Scatter(x=annual_display["year"], y=annual_display["cumulative_cash_flow"], name="Cumulative cash flow", yaxis="y2"))
    fig_cf.update_layout(
        height=400, margin=dict(t=20, b=20),
        yaxis=dict(title="Annual net cash flow ($)"),
        yaxis2=dict(title="Cumulative cash flow ($)", overlaying="y", side="right"),
        legend=dict(orientation="h"),
    )
    st.plotly_chart(fig_cf, width='stretch')

    with st.expander("Monthly cash flow detail"):
        st.dataframe(result.monthly, hide_index=True, width='stretch')
        csv = result.monthly.to_csv(index=False).encode("utf-8")
        st.download_button("⬇️ Download monthly cash flow (CSV)", data=csv, file_name=f"{prospect.name}_monthly_cashflow.csv", mime="text/csv")

    st.info("Results are cached on this prospect. Go to **Home** and click Save project to persist them to disk.")
