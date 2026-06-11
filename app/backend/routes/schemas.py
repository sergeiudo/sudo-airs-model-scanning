"""GET /api/schemas — enumerate Pydantic models in the airs_schemas package.

Walks the package's submodules and returns each top-level BaseModel subclass
with its JSON schema. The frontend renders these as collapsible JSON trees
on /environment so customers can see the full surface they're integrating with."""
import importlib
import inspect
import pkgutil
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


def _collect_models() -> dict[str, type[BaseModel]]:
    """Find every BaseModel subclass defined inside the airs_schemas package."""
    found: dict[str, type[BaseModel]] = {}
    try:
        pkg = importlib.import_module("airs_schemas")
    except ImportError:
        return found

    def _scan_module(mod: Any) -> None:
        for name, obj in inspect.getmembers(mod):
            if isinstance(obj, type) and issubclass(obj, BaseModel) and obj is not BaseModel:
                if obj.__module__.startswith("airs_schemas"):
                    found.setdefault(obj.__name__, obj)

    _scan_module(pkg)
    if hasattr(pkg, "__path__"):
        for sub in pkgutil.walk_packages(pkg.__path__, prefix=pkg.__name__ + "."):
            try:
                _scan_module(importlib.import_module(sub.name))
            except Exception:
                # Some submodules might fail to import standalone; skip them.
                continue
    return found


@router.get("/api/schemas")
def list_schemas() -> dict:
    models = _collect_models()
    entries = []
    for name in sorted(models):
        cls = models[name]
        try:
            entries.append({"name": name, "module": cls.__module__, "schema": cls.model_json_schema()})
        except Exception as exc:
            entries.append({"name": name, "module": cls.__module__, "schema": {}, "error": str(exc)})
    return {"schemas": entries}
