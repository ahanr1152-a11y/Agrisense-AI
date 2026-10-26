
"""Blynk Cloud External HTTP API wrapper (server-side only)."""

import logging
import re

import requests

log = logging.getLogger("agrisense.blynk")


class BlynkError(Exception):
    """Safe, user-facing Blynk error without credentials."""


class BlynkClient:
    def __init__(
        self,
        token,
        base_url="https://blynk.cloud",
        timeout=6,
    ):
        token = (token or "").strip()
        if not token:
            raise BlynkError("Blynk token is not configured.")

        self._token = token
        self._base = (
            base_url.rstrip("/") + "/external/api"
        )
        self._timeout = timeout
        self._session = requests.Session()

    def _get(self, endpoint, extra=None):
        # Only allow known API endpoint names.
        if endpoint not in {"getAll", "update"}:
            raise BlynkError("Unsupported Blynk API endpoint.")

        params = {"token": self._token}
        params.update(extra or {})

        try:
            response = self._session.get(
                f"{self._base}/{endpoint}",
                params=params,
                timeout=self._timeout,
            )

        except requests.exceptions.Timeout:
            raise BlynkError(
                "Blynk से जवाब आने में देर हुई।"
            ) from None

        except requests.exceptions.RequestException as exc:
            # Do not log the request URL: it contains the token.
            log.warning(
                "Blynk network error: %s",
                type(exc).__name__,
            )
            raise BlynkError(
                "Blynk क्लाउड तक नहीं पहुँच पाए।"
            ) from None

        # Capture the status, then release the connection.
        status = response.status_code

        if status != 200:
            response.close()

            if status in (401, 403):
                raise BlynkError(
                    "Blynk authentication failed. "
                    "Check the device token."
                )

            if status == 400:
                raise BlynkError(
                    "Blynk ने अनुरोध नहीं माना। "
                    "टोकन, पिन और डेटा का प्रकार जाँचें।"
                )

            log.warning("Blynk returned HTTP %s", status)
            raise BlynkError(
                f"Blynk ने HTTP {status} लौटाया।"
            )

        return response

    def get_all(self):
        """Return stored datastream values, such as {'v0': '25.1'}."""
        response = self._get("getAll")

        try:
            data = response.json()
        except ValueError:
            raise BlynkError(
                "Blynk से अनपेक्षित जवाब आया।"
            ) from None
        finally:
            response.close()

        # Blynk may return an error object even in a JSON response.
        if not isinstance(data, dict) or "error" in data:
            raise BlynkError(
                "Blynk से वैध sensor data नहीं मिला।"
            )

        return {
            str(key).lower(): value
            for key, value in data.items()
        }

    def update(self, pin, value):
        """Update a Blynk virtual datastream, e.g. v7 = 1."""
        pin = str(pin).strip().lower()

        if not re.fullmatch(r"v\d+", pin):
            raise BlynkError(
                "Invalid Blynk virtual pin."
            )

        response = self._get(
            "update",
            {pin: value},
        )
        response.close()

        return True

    def close(self):
        """Close the reusable HTTP session when shutting down."""
        self._session.close()
