import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from oilgas.app_state import ensure_project
from oilgas.economics import run_economics

st.set_page_config(page_title="Portfolio Summary", page_icon="📊", layout="wide")
st.title("📊 Portfolio Summary")

project = ensure_project()

if not project.prospects:
    st.info("Add prospects first.")
    st.stop()

runnable = [p for p in project.prospects if p.type_curve and any([p.type_curve.oil, p.type_curve.gas, p.type_curve.water])]
if not runnable:
    st.info("No prospects have a type curve yet.")
    st.stop()

recompute = st.button("🔄 Recompute all prospects", type="primary")

rows = []
monthly_by_prospect = {}
for p in runnable:
    try:
        result = run_economics(p.type_curve, p.economics)
    except Exception as e:
        st.warning(f"Skipping '{p.name}': {e}")
        continue
    npv10 = result.npv_by_rate.get(10.0, next(iter(result.npv_by_rate.values())))
    if recompute:
        p.last_results_summary = {
            "npv10": npv10,
            "irr_pct": result.irr_pct,
            "payout_months": result.payout_months,
            "total_capex": result.total_capex,
            "eur_oil_bbl": result.eur_oil_bbl,
            "eur_gas_mcf": result.eur_gas_mcf,
        }
    monthly_by_prospect[p.name] = result.monthly
    rows.append(
        {
            "Prospect": p.name,
            "Basin": p.basin,
            "WI": p.economics.fiscal.working_interest,
            "NRI": p.economics.fiscal.net_revenue_interest,
            "Total capex ($)": result.total_capex,
            "NPV10 ($)": npv10,
            "IRR (%)": result.irr_pct,
            "Payout (mo)": result.payout_months,
            "EUR oil (bbl)": result.eur_oil_bbl,
            "EUR gas (Mcf)": result.eur_gas_mcf,
        }
    )

df = pd.DataFrame(rows).sort_values("NPV10 ($)", ascending=False)

st.markdown("### Ranked by NPV10")
st.dataframe(
    df.style.format(
        {
            "WI": "{:.2f}", "NRI": "{:.2f}",
            "Total capex ($)": "{:,.0f}", "NPV10 ($)": "{:,.0f}",
            "IRR (%)": "{:,.1f}", "EUR oil (bbl)": "{:,.0f}", "EUR gas (Mcf)": "{:,.0f}",
        }
    ),
    hide_index=True,
    width='stretch',
)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Portfolio capex ($)", f"{df['Total capex ($)'].sum():,.0f}")
c2.metric("Portfolio NPV10 ($)", f"{df['NPV10 ($)'].sum():,.0f}")
c3.metric("Weighted avg IRR (%)", f"{(df['IRR (%)'] * df['Total capex ($)']).sum() / df['Total capex ($)'].sum():,.1f}" if df["Total capex ($)"].sum() else "N/A")
c4.metric("Prospects run", len(df))

st.markdown("### NPV10 by prospect")
fig = go.Figure(go.Bar(x=df["Prospect"], y=df["NPV10 ($)"]))
fig.update_layout(height=350, margin=dict(t=20, b=20), yaxis_title="NPV10 ($)")
st.plotly_chart(fig, width='stretch')

st.markdown("### Combined portfolio cash flow (calendar-aligned)")
combined = None
for name, monthly in monthly_by_prospect.items():
    slim = monthly[["date", "net_cash_flow"]].rename(columns={"net_cash_flow": name}).set_index("date")
    combined = slim if combined is None else combined.join(slim, how="outer")
combined = combined.fillna(0.0).sort_index()
combined["Portfolio total"] = combined.sum(axis=1)
combined["Cumulative"] = combined["Portfolio total"].cumsum()

fig2 = go.Figure()
fig2.add_trace(go.Bar(x=combined.index, y=combined["Portfolio total"], name="Monthly net cash flow"))
fig2.add_trace(go.Scatter(x=combined.index, y=combined["Cumulative"], name="Cumulative", yaxis="y2"))
fig2.update_layout(
    height=400, margin=dict(t=20, b=20),
    yaxis=dict(title="Monthly net cash flow ($)"),
    yaxis2=dict(title="Cumulative ($)", overlaying="y", side="right"),
    legend=dict(orientation="h"),
)
st.plotly_chart(fig2, width='stretch')

csv = df.to_csv(index=False).encode("utf-8")
st.download_button("⬇️ Download portfolio summary (CSV)", data=csv, file_name="portfolio_summary.csv", mime="text/csv")

if recompute:
    st.success("Recomputed. Go to **Home** and Save project to persist updated results.")
