"""Per-session Python REPL backed by code.InteractiveInterpreter.

A ReplRegistry holds one ReplSession per `session_id` so multiple browser tabs
can share state if they reuse the id (or stay isolated if they don't). Each
session pre-imports `client` (the SDKProxy instance), `UUID`, `json`, `pprint`.

Output is captured via contextlib.redirect_stdout/stderr; multi-line input is
detected with code.compile_command (the standard "more?" indicator)."""
import code
import io
import json as _json
import pprint as _pprint
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass
from threading import Lock
from typing import Any
from uuid import UUID as _UUID


@dataclass
class ExecResult:
    ok: bool         # True = ran cleanly; False = error
    more: bool       # True = input was incomplete, expecting continuation
    output: str      # captured stdout + stderr


class ReplSession:
    """A single InteractiveInterpreter with persistent locals and captured output."""

    def __init__(self, proxy: Any) -> None:
        # `proxy` is whatever the registry was given (typically an SDKProxy).
        # It is exposed in the REPL as `client` so REPL-issued calls flow
        # through the same chokepoint as UI-issued calls.
        self._locals: dict[str, Any] = {
            "client": proxy,
            "UUID": _UUID,
            "json": _json,
            "pprint": _pprint,
        }
        self._interp = code.InteractiveInterpreter(self._locals)
        self._buffer = ""  # incomplete-statement accumulator

    def execute(self, source: str) -> ExecResult:
        """Feed one chunk of source to the interpreter.

        Returns ExecResult.more=True when the statement is incomplete and the
        next call should be the continuation."""
        # Try the source standalone first; if it compiles/errors, use it.
        # Only fall back to buffered concatenation if standalone is incomplete.
        out, err = io.StringIO(), io.StringIO()
        standalone_compiled = None
        standalone_error = False
        try:
            with redirect_stdout(out), redirect_stderr(err):
                standalone_compiled = code.compile_command(source, "<repl>", "single")
        except (SyntaxError, OverflowError, ValueError):
            # Capture the formatted error while we're in the exception context.
            with redirect_stdout(out), redirect_stderr(err):
                self._interp.showsyntaxerror("<repl>")
            standalone_error = True

        # If standalone is complete or errored, use it and clear buffer.
        if standalone_compiled is not None or standalone_error:
            self._buffer = ""
            if standalone_error:
                return ExecResult(ok=False, more=False, output=out.getvalue() + err.getvalue())
            # Run the complete standalone statement.
            try:
                with redirect_stdout(out), redirect_stderr(err):
                    self._interp.runcode(standalone_compiled)
            except SystemExit:
                return ExecResult(ok=False, more=False, output=out.getvalue() + err.getvalue() + "\n[SystemExit suppressed]")
            captured = out.getvalue() + err.getvalue()
            ok = err.getvalue() == ""
            return ExecResult(ok=ok, more=False, output=captured)

        # Standalone is incomplete. Try combining with buffer.
        combined = (self._buffer + source) if self._buffer else source
        out, err = io.StringIO(), io.StringIO()
        try:
            with redirect_stdout(out), redirect_stderr(err):
                compiled = code.compile_command(combined, "<repl>", "single")
        except (SyntaxError, OverflowError, ValueError):
            with redirect_stdout(out), redirect_stderr(err):
                self._interp.showsyntaxerror("<repl>")
            self._buffer = ""
            return ExecResult(ok=False, more=False, output=out.getvalue() + err.getvalue())

        if compiled is None:
            # Still incomplete; wait for more input.
            self._buffer = combined if combined.endswith("\n") else combined + "\n"
            return ExecResult(ok=True, more=True, output="")

        # Complete statement. Reset buffer, run, capture.
        self._buffer = ""
        try:
            with redirect_stdout(out), redirect_stderr(err):
                self._interp.runcode(compiled)
        except SystemExit:
            return ExecResult(ok=False, more=False, output=out.getvalue() + err.getvalue() + "\n[SystemExit suppressed]")

        captured = out.getvalue() + err.getvalue()
        ok = err.getvalue() == ""
        return ExecResult(ok=ok, more=False, output=captured)


class ReplRegistry:
    """Maps session_id → ReplSession. One registry per FastAPI process."""

    def __init__(self, proxy: Any) -> None:
        self._proxy = proxy
        self._sessions: dict[str, ReplSession] = {}
        self._lock = Lock()

    def session_for(self, session_id: str) -> ReplSession:
        with self._lock:
            sess = self._sessions.get(session_id)
            if sess is None:
                sess = ReplSession(proxy=self._proxy)
                self._sessions[session_id] = sess
            return sess
