from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.backend.repl import ReplRegistry, ReplSession
from app.backend.sdk_proxy import SDKProxy
from app.backend.ws_hub import WSHub
from app.backend.main import create_app
from app.backend import deps
from app.backend.routes import repl as repl_route


def _make_session() -> ReplSession:
    proxy = SDKProxy(MagicMock(), WSHub())
    return ReplSession(proxy=proxy)


def test_session_executes_simple_expression():
    s = _make_session()
    result = s.execute("1 + 2")
    assert result.ok
    assert result.more is False
    # Repr of bare expression is printed by the interactive interpreter.
    assert "3" in result.output


def test_session_executes_print_statement():
    s = _make_session()
    result = s.execute("print('hello')")
    assert result.ok
    assert "hello" in result.output


def test_session_keeps_state_across_calls():
    s = _make_session()
    s.execute("x = 42")
    result = s.execute("x * 2")
    assert "84" in result.output


def test_session_handles_syntax_error():
    s = _make_session()
    result = s.execute("def broken(:")
    # broken syntax is a complete error (not an incomplete statement waiting for more).
    assert result.ok is False
    assert result.more is False
    assert "SyntaxError" in result.output or "invalid syntax" in result.output.lower()


def test_session_handles_runtime_error():
    s = _make_session()
    result = s.execute("1/0")
    assert result.ok is False
    assert "ZeroDivisionError" in result.output


def test_session_detects_incomplete_statement():
    s = _make_session()
    # An incomplete `def` body — the interpreter should ask for more.
    result = s.execute("def f():")
    assert result.more is True
    # Completing it should succeed.
    result2 = s.execute("def f():\n    return 7\n")
    assert result2.ok
    result3 = s.execute("f()")
    assert "7" in result3.output


def test_session_exposes_client_in_locals():
    proxy = SDKProxy(MagicMock(), WSHub())
    s = ReplSession(proxy=proxy)
    result = s.execute("type(client).__name__")
    assert "SDKProxy" in result.output


def test_registry_returns_same_session_for_same_id():
    proxy = SDKProxy(MagicMock(), WSHub())
    reg = ReplRegistry(proxy=proxy)
    a = reg.session_for("abc")
    b = reg.session_for("abc")
    assert a is b


def test_registry_isolates_sessions_by_id():
    proxy = SDKProxy(MagicMock(), WSHub())
    reg = ReplRegistry(proxy=proxy)
    a = reg.session_for("abc")
    b = reg.session_for("xyz")
    a.execute("x = 1")
    res = b.execute("'x' in dir()")
    assert "False" in res.output


def test_ws_repl_evaluates_expression(monkeypatch):
    # Reset the route-level registry mapping so tests stay hermetic.
    monkeypatch.setattr(repl_route, "_REGISTRIES", {})

    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    with client.websocket_connect("/api/ws/repl?session_id=test1") as ws:
        ws.send_json({"source": "21 * 2"})
        reply = ws.receive_json()
        assert reply["ok"]
        assert reply["more"] is False
        assert "42" in reply["output"]


def test_ws_repl_keeps_session_state(monkeypatch):
    monkeypatch.setattr(repl_route, "_REGISTRIES", {})

    app = create_app()
    app.dependency_overrides[deps.get_proxy] = lambda: SDKProxy(MagicMock(), WSHub())
    client = TestClient(app)
    with client.websocket_connect("/api/ws/repl?session_id=stateful") as ws:
        ws.send_json({"source": "x = 7"})
        ws.receive_json()  # discard
        ws.send_json({"source": "x + 1"})
        reply = ws.receive_json()
        assert "8" in reply["output"]
