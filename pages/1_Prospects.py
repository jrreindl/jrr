import streamlit as st

from oilgas.app_state import ACTIVE_PROSPECT_KEY, ensure_project
from oilgas.models import Prospect

st.set_page_config(page_title="Prospects", page_icon="📍", layout="wide")
st.title("📍 Prospects")

project = ensure_project()

with st.expander("➕ Add a new prospect", expanded=len(project.prospects) == 0):
    with st.form("add_prospect"):
        c1, c2, c3 = st.columns(3)
        name = c1.text_input("Prospect name", value="")
        basin = c2.text_input("Basin / play", value="")
        county_state = c3.text_input("County, State", value="")
        notes = st.text_area("Notes", value="")
        submitted = st.form_submit_button("Add prospect", type="primary")
        if submitted:
            if not name.strip():
                st.warning("Give the prospect a name.")
            else:
                p = Prospect(name=name.strip(), basin=basin.strip(), county_state=county_state.strip(), notes=notes.strip())
                project.prospects.append(p)
                st.session_state[ACTIVE_PROSPECT_KEY] = p.id
                st.success(f"Added '{p.name}'.")
                st.rerun()

st.divider()

if not project.prospects:
    st.info("No prospects yet. Add one above.")
    st.stop()

st.subheader("Select active prospect")
active_id = st.session_state.get(ACTIVE_PROSPECT_KEY)
options = {p.id: f"{p.name}  ({p.basin or 'no basin'})" for p in project.prospects}
default_index = list(options.keys()).index(active_id) if active_id in options else 0
selected_id = st.radio(
    "Working on:",
    options=list(options.keys()),
    format_func=lambda pid: options[pid],
    index=default_index,
    label_visibility="collapsed",
)
st.session_state[ACTIVE_PROSPECT_KEY] = selected_id
prospect = project.get_prospect(selected_id)

st.divider()
st.subheader(f"Edit: {prospect.name}")
c1, c2, c3 = st.columns(3)
prospect.name = c1.text_input("Name", value=prospect.name, key=f"name_{prospect.id}")
prospect.basin = c2.text_input("Basin / play", value=prospect.basin, key=f"basin_{prospect.id}")
prospect.county_state = c3.text_input("County, State", value=prospect.county_state, key=f"cs_{prospect.id}")
prospect.notes = st.text_area("Notes", value=prospect.notes, key=f"notes_{prospect.id}")

status_cols = st.columns(3)
status_cols[0].metric("Type curve", "Set" if prospect.type_curve else "Not set")
status_cols[1].metric("Capex items", len(prospect.economics.capex))
last = prospect.last_results_summary or {}
status_cols[2].metric("Last NPV10 ($)", f"{last.get('npv10'):,.0f}" if last.get("npv10") is not None else "—")

st.divider()
if st.button("🗑️ Delete this prospect", type="secondary"):
    project.prospects = [p for p in project.prospects if p.id != prospect.id]
    if st.session_state.get(ACTIVE_PROSPECT_KEY) == prospect.id:
        st.session_state[ACTIVE_PROSPECT_KEY] = None
    st.rerun()

st.caption("Next: build a **Type Curve** for this prospect, then run its **Economics**.")
