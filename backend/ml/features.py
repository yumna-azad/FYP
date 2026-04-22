"""Precomputed feature constants derived from smartloc_raw_data_VERIFIED.xlsx.

Business medians come from Businesses sheet grouped by smartloc_type (same feature
engineering as the training notebook: rating fills, review_log, review_popularity,
competition_density, etc.).

Monthly features come from Tourism_Monthly + Climate + Events_Calendar — identical
pipeline to the notebook cells that built `mf`.
"""

from __future__ import annotations

BUSINESS_MEDIANS: dict[str, dict[str, float]] = {
    "cafe": {
        "category_encoded": 0.0,
        "rating": 4.2,
        "review_log": 3.4339872044851463,
        "confidence_score": 2.0,
        "rating_vs_type": 0.0,
        "review_popularity": 0.967741935483871,
        "is_above_median_rating": 1.0,
        "competition_density": 164.0,
        "digital_presence": 0.0,
    },
    "hotel": {
        "category_encoded": 1.0,
        "rating": 4.1,
        "review_log": 2.5649493574615367,
        "confidence_score": 2.0,
        "rating_vs_type": 0.0,
        "review_popularity": 0.9230769230769231,
        "is_above_median_rating": 1.0,
        "competition_density": 1014.0,
        "digital_presence": 0.0,
    },
    "restaurant": {
        "category_encoded": 2.0,
        "rating": 4.3,
        "review_log": 3.258096538021482,
        "confidence_score": 2.0,
        "rating_vs_type": 0.0,
        "review_popularity": 0.9615384615384616,
        "is_above_median_rating": 1.0,
        "competition_density": 163.0,
        "digital_presence": 0.0,
    },
    "retail_shop": {
        "category_encoded": 3.0,
        "rating": 4.0,
        "review_log": 2.8903717578961645,
        "confidence_score": 2.0,
        "rating_vs_type": 0.0,
        "review_popularity": 0.9444444444444444,
        "is_above_median_rating": 1.0,
        "competition_density": 97.0,
        "digital_presence": 0.0,
    },
    "wellness_center": {
        "category_encoded": 4.0,
        "rating": 4.25,
        "review_log": 2.5257286443082556,
        "confidence_score": 2.0,
        "rating_vs_type": 0.0,
        "review_popularity": 0.92,
        "is_above_median_rating": 1.0,
        "competition_density": 70.0,
        "digital_presence": 0.0,
    },
}

MONTHLY_FEATURES: list[dict[str, float]] = [
    {"month": 1,  "is_peak": 0, "is_monsoon": 0, "off_peak_severity": 0.14298631179862842, "avg_temp": 17.9, "precip_mm": 130, "humidity": 84, "rainy_days": 11, "sun_hours": 5.9, "avg_arrivals": 154149.16666666666, "std_arrivals": 108528.2890612704,  "events_count": 1, "event_impact": 3,  "est_daily_visitors": 1783.849315068493, "seasonality_index": 0.30954875614141886},
    {"month": 2,  "is_peak": 0, "is_monsoon": 0, "off_peak_severity": 0.12397975994962218, "avg_temp": 18.4, "precip_mm": 108, "humidity": 80, "rainy_days": 9,  "sun_hours": 7.0, "avg_arrivals": 157567.83333333334, "std_arrivals": 105214.46087951346, "events_count": 2, "event_impact": 5,  "est_daily_visitors": 1783.849315068493, "seasonality_index": 0.3385914735157943},
    {"month": 3,  "is_peak": 0, "is_monsoon": 0, "off_peak_severity": 0.24938760578602726, "avg_temp": 19.4, "precip_mm": 120, "humidity": 75, "rainy_days": 9,  "sun_hours": 8.0, "avg_arrivals": 135011.0,            "std_arrivals": 89870.24472259992,  "events_count": 2, "event_impact": 7,  "est_daily_visitors": 1783.849315068493, "seasonality_index": 0.1469636258088266},
    {"month": 4,  "is_peak": 1, "is_monsoon": 0, "off_peak_severity": 0.0,                 "avg_temp": 19.8, "precip_mm": 245, "humidity": 83, "rainy_days": 16, "sun_hours": 7.1, "avg_arrivals": 99224.2,             "std_arrivals": 68073.13833811396,  "events_count": 4, "event_impact": 17, "est_daily_visitors": 4459.623287671233, "seasonality_index": 0.15705721607883677},
    {"month": 5,  "is_peak": 0, "is_monsoon": 1, "off_peak_severity": 0.599639290634566,   "avg_temp": 20.3, "precip_mm": 217, "humidity": 85, "rainy_days": 21, "sun_hours": 6.3, "avg_arrivals": 72012.0,             "std_arrivals": 55151.15947103923,  "events_count": 2, "event_impact": 4,  "est_daily_visitors": 891.9246575342465,  "seasonality_index": 0.3882339615161341},
    {"month": 6,  "is_peak": 0, "is_monsoon": 1, "off_peak_severity": 0.5701631976373758,  "avg_temp": 19.9, "precip_mm": 179, "humidity": 82, "rainy_days": 19, "sun_hours": 6.3, "avg_arrivals": 77313.8,             "std_arrivals": 57573.36386038252,  "events_count": 1, "event_impact": 2,  "est_daily_visitors": 891.9246575342465,  "seasonality_index": 0.34319339629320234},
    {"month": 7,  "is_peak": 0, "is_monsoon": 1, "off_peak_severity": 0.3541756779145572,  "avg_temp": 19.7, "precip_mm": 186, "humidity": 81, "rainy_days": 20, "sun_hours": 6.3, "avg_arrivals": 116163.0,            "std_arrivals": 87469.60358032955,  "events_count": 1, "event_impact": 3,  "est_daily_visitors": 891.9246575342465,  "seasonality_index": 0.013156441587494908},
    {"month": 8,  "is_peak": 1, "is_monsoon": 0, "off_peak_severity": 0.0,                 "avg_temp": 19.5, "precip_mm": 193, "humidity": 81, "rainy_days": 20, "sun_hours": 6.3, "avg_arrivals": 108409.8,            "std_arrivals": 83197.59258956955,  "events_count": 3, "event_impact": 11, "est_daily_visitors": 4459.623287671233, "seasonality_index": 0.07902247016013707},
    {"month": 9,  "is_peak": 0, "is_monsoon": 0, "off_peak_severity": 0.5147569492705197,  "avg_temp": 19.4, "precip_mm": 232, "humidity": 82, "rainy_days": 19, "sun_hours": 6.6, "avg_arrivals": 87279.6,             "std_arrivals": 62656.02887432302,  "events_count": 2, "event_impact": 6,  "est_daily_visitors": 1783.849315068493, "seasonality_index": 0.2585305902841689},
    {"month": 10, "is_peak": 0, "is_monsoon": 1, "off_peak_severity": 0.47172756880331,    "avg_temp": 18.9, "precip_mm": 374, "humidity": 86, "rainy_days": 20, "sun_hours": 6.0, "avg_arrivals": 95019.2,             "std_arrivals": 60879.64104033466,  "events_count": 2, "event_impact": 4,  "est_daily_visitors": 891.9246575342465,  "seasonality_index": 0.19278009826270412},
    {"month": 11, "is_peak": 0, "is_monsoon": 1, "off_peak_severity": 0.27434148858216967, "avg_temp": 18.4, "precip_mm": 331, "humidity": 88, "rainy_days": 18, "sun_hours": 5.7, "avg_arrivals": 130522.6,            "std_arrivals": 75077.49792580996,  "events_count": 2, "event_impact": 4,  "est_daily_visitors": 891.9246575342465,  "seasonality_index": 0.1088331657864556},
    {"month": 12, "is_peak": 1, "is_monsoon": 0, "off_peak_severity": 0.0,                 "avg_temp": 18.1, "precip_mm": 235, "humidity": 87, "rainy_days": 15, "sun_hours": 5.4, "avg_arrivals": 179867.8,            "std_arrivals": 83360.17892975039,  "events_count": 3, "event_impact": 14, "est_daily_visitors": 4459.623287671233, "seasonality_index": 0.5280371529301824},
]

MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

# Per-area composite data from Price_Index + Property_Listings sheets.
# price_per_perch_lkr is a midpoint; rent_indicative_lkr is a midpoint monthly rent for
# a commercial unit in that area (derived from Property_Listings monthly_price_lkr grouped
# by location, with NE Commercial (Shop Rent) from Price_Index as fallback).
# footfall_weight is a relative 0..1 scaling (Gregory Lake, Town Centre = high tourism).
NUWARA_ELIYA_AREAS: list[dict] = [
    {"name": "Town Centre / Main Street", "price_per_perch_lkr": 3_000_000, "rent_indicative_lkr": 110_000, "footfall_weight": 0.95, "competition_weight": 0.95, "tags": ["high traffic", "near bus stand"]},
    {"name": "Gregory Lake Front",        "price_per_perch_lkr": 8_000_000, "rent_indicative_lkr": 220_000, "footfall_weight": 1.00, "competition_weight": 0.70, "tags": ["tourist hub", "premium"]},
    {"name": "Hakgala Road",              "price_per_perch_lkr": 1_500_000, "rent_indicative_lkr": 80_000,  "footfall_weight": 0.65, "competition_weight": 0.40, "tags": ["tourist corridor", "tea estate views"]},
    {"name": "Pedro / Hill Club Area",    "price_per_perch_lkr": 2_000_000, "rent_indicative_lkr": 95_000,  "footfall_weight": 0.60, "competition_weight": 0.55, "tags": ["heritage", "upscale"]},
    {"name": "Nanu Oya",                  "price_per_perch_lkr": 800_000,   "rent_indicative_lkr": 45_000,  "footfall_weight": 0.50, "competition_weight": 0.30, "tags": ["train station", "transit"]},
    {"name": "Ambewela",                  "price_per_perch_lkr": 500_000,   "rent_indicative_lkr": 30_000,  "footfall_weight": 0.35, "competition_weight": 0.15, "tags": ["rural scenic", "dairy"]},
    {"name": "Kandapola",                 "price_per_perch_lkr": 700_000,   "rent_indicative_lkr": 40_000,  "footfall_weight": 0.40, "competition_weight": 0.20, "tags": ["tea country", "niche tourism"]},
    {"name": "Glencairn",                 "price_per_perch_lkr": 550_000,   "rent_indicative_lkr": 35_000,  "footfall_weight": 0.30, "competition_weight": 0.15, "tags": ["rural", "budget"]},
    {"name": "Hawa Eliya",                "price_per_perch_lkr": 1_650_000, "rent_indicative_lkr": 70_000,  "footfall_weight": 0.55, "competition_weight": 0.35, "tags": ["residential growth"]},
    {"name": "Lover's Leap",              "price_per_perch_lkr": 1_200_000, "rent_indicative_lkr": 60_000,  "footfall_weight": 0.45, "competition_weight": 0.25, "tags": ["waterfall tourism"]},
    {"name": "Seetha Eliya",              "price_per_perch_lkr": 900_000,   "rent_indicative_lkr": 50_000,  "footfall_weight": 0.40, "competition_weight": 0.20, "tags": ["temple tourism"]},
    {"name": "Tea estates belt",          "price_per_perch_lkr": 400_000,   "rent_indicative_lkr": 25_000,  "footfall_weight": 0.30, "competition_weight": 0.10, "tags": ["tea estate", "remote"]},
]

FEATURE_ORDER = [
    "category_encoded", "rating", "review_log", "confidence_score",
    "rating_vs_type", "review_popularity", "is_above_median_rating",
    "competition_density", "digital_presence",
    "month", "is_peak", "is_monsoon", "off_peak_severity",
    "avg_temp", "precip_mm", "humidity", "rainy_days", "sun_hours",
    "avg_arrivals", "std_arrivals", "events_count", "event_impact",
    "est_daily_visitors", "seasonality_index",
]
