"""Save/load Project objects to local JSON files.

Fully offline: everything lives under a directory on disk (default
`data/projects/`), no network or database involved.
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict
from pathlib import Path
from typing import List, Optional

from .models import (
    CapexItem,
    DeclineSegmentSpec,
    EconomicAssumptions,
    FiscalTerms,
    OpexAssumptions,
    PriceDeck,
    Project,
    Prospect,
    TypeCurve,
)

DEFAULT_PROJECTS_DIR = Path(__file__).resolve().parent.parent / "data" / "projects"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", name.strip().lower()).strip("_")
    return slug or "project"


def project_to_dict(project: Project) -> dict:
    return asdict(project)


def _segment_from_dict(d: Optional[dict]) -> Optional[DeclineSegmentSpec]:
    return DeclineSegmentSpec(**d) if d else None


def _type_curve_from_dict(d: Optional[dict]) -> Optional[TypeCurve]:
    if not d:
        return None
    return TypeCurve(
        name=d.get("name", "Type Curve"),
        start_date=d.get("start_date", ""),
        oil=_segment_from_dict(d.get("oil")),
        gas=_segment_from_dict(d.get("gas")),
        water=_segment_from_dict(d.get("water")),
    )


def _economics_from_dict(d: dict) -> EconomicAssumptions:
    return EconomicAssumptions(
        fiscal=FiscalTerms(**d.get("fiscal", {})),
        price_deck=PriceDeck(**d.get("price_deck", {})),
        opex=OpexAssumptions(**d.get("opex", {})),
        capex=[CapexItem(**c) for c in d.get("capex", [])],
        forecast_months=d.get("forecast_months", 360),
        discount_rates_pct=d.get("discount_rates_pct", [8.0, 10.0, 12.0, 15.0, 20.0]),
    )


def _prospect_from_dict(d: dict) -> Prospect:
    return Prospect(
        id=d.get("id"),
        name=d.get("name", "New Prospect"),
        basin=d.get("basin", ""),
        county_state=d.get("county_state", ""),
        notes=d.get("notes", ""),
        type_curve=_type_curve_from_dict(d.get("type_curve")),
        economics=_economics_from_dict(d.get("economics", {})),
        last_results_summary=d.get("last_results_summary"),
    )


def project_from_dict(d: dict) -> Project:
    return Project(
        name=d.get("name", "New Project"),
        prospects=[_prospect_from_dict(p) for p in d.get("prospects", [])],
    )


def save_project(project: Project, directory: Path = DEFAULT_PROJECTS_DIR) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{slugify(project.name)}.json"
    path.write_text(json.dumps(project_to_dict(project), indent=2, default=str))
    return path


def load_project(path: Path) -> Project:
    data = json.loads(Path(path).read_text())
    return project_from_dict(data)


def list_saved_projects(directory: Path = DEFAULT_PROJECTS_DIR) -> List[Path]:
    if not directory.exists():
        return []
    return sorted(directory.glob("*.json"))
