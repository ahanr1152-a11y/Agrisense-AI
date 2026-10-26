
"""AgriSense configuration: Blynk pins, units, and sensor interpretation."""

# --------------------------------------------------
# BLYNK VIRTUAL PIN MAPPING
# Must match the Arduino ESP32 code and Blynk datastreams.
# --------------------------------------------------

PINS = {
    "temperature": "v0",
    "humidity": "v1",
    "soil_raw": "v2",
    "light": "v3",
    "water": "v4",

    # Legacy AI prediction; Arduino currently writes to V5 and V13.
    "ai_old": "v5",

    "rain": "v6",
    "pump_cmd": "v7",

    # These pins are reserved in the website configuration.
    # The current Arduino code does not implement all of them yet.
    "auto_mode": "v8",
    "ai_decision": "v9",
    "ai_score": "v10",
    "pump_status": "v11",
    "pump_runtime": "v12",
    "ai_amount": "v13",
    "voice_text": "v14",
}

# --------------------------------------------------
# DIGITAL SENSOR INTERPRETATION
# --------------------------------------------------

# Arduino defines LIGHT_ACTIVE_LOW = true.
# Therefore, GPIO LOW is interpreted as light detected.
# Verify this behavior with your actual light sensor.
LIGHT_ON_VALUE = 0

# Arduino defines RAIN_ACTIVE_LOW = true.
# Therefore, GPIO LOW is interpreted as rain detected.
RAIN_ON_VALUE = 0

LIGHT_ON_LABEL = "Light detected"
LIGHT_OFF_LABEL = "No light detected"

RAIN_ON_LABEL = "Rain detected"
RAIN_OFF_LABEL = "No rain detected"

# Arduino defines WATER_OK_ACTIVE_LOW = false.
# Therefore, GPIO HIGH is interpreted as water available.
WATER_ON_VALUE = 1
WATER_ON_LABEL = "Water available"
WATER_OFF_LABEL = "Water unavailable"

# --------------------------------------------------
# AI OUTPUT CONFIGURATION
# --------------------------------------------------

# Rename this to match what V10 actually represents when implemented.
AI_SCORE_LABEL = "AI score"

# Arduino prints irrigation_prediction in mm/day.
# Confirm the AI server's output unit before displaying it.
AI_AMOUNT_UNIT = "mm/day"

# Arduino does not currently publish pump runtime to V12.
PUMP_RUNTIME_UNIT = "s"

# --------------------------------------------------
# SOIL SENSOR
# --------------------------------------------------

# Keep False until the sensor has been calibrated.
# The dashboard should display the ADC reading as RAW,
# not as a percentage.
SOIL_CALIBRATED = False

# ESP32 12-bit ADC maximum reading.
# A reading of 4095 is suspicious but does not alone
# prove that the sensor is disconnected.
SOIL_SUSPECT_VALUE = 4095

# --------------------------------------------------
# API AND HISTORY SETTINGS
# --------------------------------------------------

# Maximum time to wait for a Blynk API response.
REQUEST_TIMEOUT = 6

# Maximum number of readings retained in server memory.
# History is lost when the Flask server restarts.
HISTORY_MAX = 360
