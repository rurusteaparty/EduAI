from datetime import datetime, timedelta, timezone
from typing import Dict, Any
import math


class SM2Algorithm:
    """
    SuperMemo SM-2 spaced repetition algorithm.
    
    Quality ratings:
      5 - Perfect recall with no hesitation
      4 - Correct response with slight hesitation  
      3 - Correct response with serious difficulty
      2 - Incorrect — remembered upon seeing correct answer
      1 - Incorrect — easy to recall after seeing answer
      0 - Complete blackout
    
    Rules:
      - If quality < 3: reset interval to 1 day, keep repetitions
      - If quality >= 3: compute new interval via SM-2
      - Ease factor never falls below 1.3
    """

    MIN_EASE_FACTOR = 1.3
    INITIAL_EASE_FACTOR = 2.5

    def calculate(
        self,
        quality: int,
        ease_factor: float,
        interval: int,
        repetitions: int,
    ) -> Dict[str, Any]:
        """
        Compute updated SM-2 parameters after a review.
        Returns dict with new ease_factor, interval, repetitions, next_review_date.
        """
        quality = max(0, min(5, quality))

        if quality >= 3:
            # Successful recall
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = round(interval * ease_factor)

            new_repetitions = repetitions + 1
            new_ease = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        else:
            # Failed recall — reset
            new_interval = 1
            new_repetitions = 0
            new_ease = ease_factor - 0.20  # Penalize ease factor

        # Clamp ease factor
        new_ease = max(self.MIN_EASE_FACTOR, round(new_ease, 4))
        new_interval = max(1, new_interval)

        # Cap at 365 days
        new_interval = min(365, new_interval)

        next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

        return {
            "ease_factor": new_ease,
            "interval": new_interval,
            "repetitions": new_repetitions,
            "next_review_date": next_review,
        }

    def estimate_retention(self, interval: int, ease_factor: float) -> float:
        """
        Estimate memory retention (0-1) using the forgetting curve.
        R = e^(-t/S) where S is stability (proxy: ease_factor * interval)
        """
        stability = ease_factor * interval
        # At review time (t = interval days), retention should be ~0.9 for SM-2
        # Use a simplified model
        retention = math.exp(-interval / (stability + 1))
        return round(max(0.0, min(1.0, retention)), 3)

    def get_priority_score(self, card) -> float:
        """
        Calculate how urgently a card needs review.
        Higher score = more overdue / more critical.
        """
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        if card.next_review_date is None:
            return 1000.0  # Never reviewed — highest priority

        overdue_days = (now - card.next_review_date).days
        if overdue_days <= 0:
            return 0.0  # Not due yet

        # Overdue weight + low ease factor weight
        return overdue_days * (3.0 - card.ease_factor)
