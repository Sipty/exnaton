"""
Swiss Energy Pricing Configuration

Switzerland uses a dual-tariff electricity pricing system (Doppeltarif):
- Hochtarif (HT): High tariff during peak hours
- Niedertarif (NT): Low tariff during off-peak hours

Pricing varies by canton and provider. These rates are based on typical
residential tariffs for 2024/2025 in the Zurich area (EWZ-like pricing).

Sources:
- ElCom (Swiss Electricity Commission): https://www.elcom.admin.ch
- Typical Swiss utility rates: ~27-32 Rp/kWh averag


For this project, we're assuming customers live in Switzerland and are using the Swiss energy pricing configuration defined here.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class TariffPeriod:
    """Defines when a tariff applies"""
    name: str
    start_hour: int  # 0-23
    end_hour: int    # 0-23 (exclusive)
    weekdays_only: bool  # True = Mon-Fri only, False = all days
    rate_chf_per_kwh: float


# Swiss electricity pricing configuration
# Based on typical Zurich-area residential rates (2024/2025)
SWISS_ENERGY_CONFIG = {
    "currency": "CHF",
    "currency_symbol": "Fr.",
    
    # Average blended rate for simple calculations
    "average_rate_chf_per_kwh": 0.27,
    
    # Dual tariff structure (Doppeltarif)
    "tariff_type": "dual",
    
    # High tariff (Hochtarif) - peak hours
    "high_tariff": {
        "name": "Hochtarif (HT)",
        "rate_chf_per_kwh": 0.32,
        "rate_rappen_per_kwh": 32,
        "description": "Peak hours rate",
        "schedule": {
            "weekdays": {"start": 7, "end": 20},  # Mon-Fri 07:00-20:00
            "weekends": None  # No high tariff on weekends
        }
    },
    
    # Low tariff (Niedertarif) - off-peak hours
    "low_tariff": {
        "name": "Niedertarif (NT)",
        "rate_chf_per_kwh": 0.22,
        "rate_rappen_per_kwh": 22,
        "description": "Off-peak hours rate",
        "schedule": {
            "weekdays": {"start": 20, "end": 7},  # Mon-Fri 20:00-07:00
            "weekends": "all_day"  # All day Sat-Sun
        }
    },
    
    # Network fees and taxes (included in rates above)
    "includes": [
        "Energie (energy cost)",
        "Netznutzung (grid usage)",
        "Abgaben (fees and levies)",
        "MwSt (VAT 8.1%)"
    ],
    
    # Savings tips for residents
    "savings_tips": [
        {
            "title": "Shift laundry to off-peak",
            "description": "Run washing machine and dryer after 20:00 or on weekends",
            "potential_savings": "~30% on laundry costs"
        },
        {
            "title": "Charge EV overnight",
            "description": "Schedule EV charging between 22:00-06:00 for lowest rates",
            "potential_savings": "~31% vs daytime charging"
        },
        {
            "title": "Dishwasher timing",
            "description": "Use delay start to run after 20:00",
            "potential_savings": "~30% on dishwashing costs"
        },
        {
            "title": "Weekend cooking",
            "description": "Heavy cooking (oven, multiple appliances) costs less on weekends",
            "potential_savings": "~31% on cooking energy"
        }
    ],
    
    # Best times for high-consumption activities
    "optimal_times": {
        "best": {
            "periods": ["Weekends all day", "Weekdays 20:00-07:00"],
            "rate": 0.22,
            "label": "Niedertarif"
        },
        "avoid": {
            "periods": ["Weekdays 07:00-20:00"],
            "rate": 0.32,
            "label": "Hochtarif"
        }
    },
    
    # Rate comparison
    "rate_difference": {
        "savings_percent": 31.25,  # (0.32-0.22)/0.32 * 100
        "savings_per_kwh_chf": 0.10
    }
}


def get_tariff_for_hour(hour: int, is_weekend: bool) -> dict:
    """
    Determine which tariff applies for a given hour and day type.
    
    Args:
        hour: Hour of day (0-23)
        is_weekend: True if Saturday or Sunday
    
    Returns:
        Dict with tariff info
    """
    config = SWISS_ENERGY_CONFIG
    
    # Weekends are always low tariff
    if is_weekend:
        return {
            "tariff": "low",
            "name": config["low_tariff"]["name"],
            "rate": config["low_tariff"]["rate_chf_per_kwh"],
        }
    
    # Weekdays: check if within high tariff hours (07:00-20:00)
    ht_start = config["high_tariff"]["schedule"]["weekdays"]["start"]
    ht_end = config["high_tariff"]["schedule"]["weekdays"]["end"]
    
    if ht_start <= hour < ht_end:
        return {
            "tariff": "high",
            "name": config["high_tariff"]["name"],
            "rate": config["high_tariff"]["rate_chf_per_kwh"],
        }
    else:
        return {
            "tariff": "low",
            "name": config["low_tariff"]["name"],
            "rate": config["low_tariff"]["rate_chf_per_kwh"],
        }


def calculate_cost(kwh: float, hour: int = None, is_weekend: bool = None) -> float:
    """
    Calculate cost for energy consumption.
    
    If hour and is_weekend provided, uses time-of-use pricing.
    Otherwise uses average rate.
    """
    if hour is not None and is_weekend is not None:
        tariff = get_tariff_for_hour(hour, is_weekend)
        return kwh * tariff["rate"]
    else:
        return kwh * SWISS_ENERGY_CONFIG["average_rate_chf_per_kwh"]


def get_hourly_rates() -> List[dict]:
    """
    Get rate for each hour of day (weekday and weekend).
    Useful for frontend visualization.
    """
    rates = []
    for hour in range(24):
        weekday_tariff = get_tariff_for_hour(hour, is_weekend=False)
        weekend_tariff = get_tariff_for_hour(hour, is_weekend=True)
        
        rates.append({
            "hour": hour,
            "hour_label": f"{hour:02d}:00",
            "weekday_rate": weekday_tariff["rate"],
            "weekday_tariff": weekday_tariff["tariff"],
            "weekend_rate": weekend_tariff["rate"],
            "weekend_tariff": weekend_tariff["tariff"],
        })
    
    return rates
