from __future__ import annotations

import asyncio
import time
import unittest
from unittest.mock import AsyncMock, patch

from app.api.health import dependency_health, health


class HealthEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_health_liveness_does_not_probe_mcp_by_default(self) -> None:
        with patch("app.api.health.get_mcp_health", new=AsyncMock()) as get_mcp_health:
            response = await health(
                user_id=None,
                include_dependencies=False,
                mcp_timeout_ms=900,
            )

        get_mcp_health.assert_not_called()
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["backend"]["status"], "ok")
        self.assertEqual(response["dependencies"]["mcp"]["status"], "not_checked")

    async def test_dependency_health_times_out_mcp_as_warming(self) -> None:
        async def slow_mcp(*, timeout_seconds: float = 5.0):
            del timeout_seconds
            await asyncio.sleep(2)
            return {"status": "ok"}

        started = time.perf_counter()
        with patch("app.api.health.get_mcp_health", new=slow_mcp):
            response = await dependency_health(user_id=None, mcp_timeout_ms=100)
        elapsed = time.perf_counter() - started

        self.assertLess(elapsed, 1.0)
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["dependencies"]["mcp"]["status"], "warming")

    async def test_health_can_include_dependency_status_with_short_timeout(self) -> None:
        with patch(
            "app.api.health.get_mcp_health",
            new=AsyncMock(return_value={"status": "ok", "service": "mcp"}),
        ) as get_mcp_health:
            response = await health(
                user_id=None,
                include_dependencies=True,
                mcp_timeout_ms=100,
            )

        get_mcp_health.assert_awaited_once()
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["dependencies"]["mcp"]["status"], "ok")


if __name__ == "__main__":
    unittest.main()
