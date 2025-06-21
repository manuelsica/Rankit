from dataclasses import dataclass
from datetime import date
from typing import List

@dataclass
class Paper:
    id: int
    title: str
    abstract: str
    authors: List[str]
    published_date: date
    score: float
