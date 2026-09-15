import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ResponseType = Literal[
    "recommendation",
    "comparison",
    "product_qa",
    "clarification",
    "greeting",
    "courtesy",
    "company_contact",
    "out_of_scope",
]
DetailKind = Literal["text", "address", "email", "phone"]

INTERNAL_PRODUCT_ID_PATTERN = re.compile(
    r"(?:[（(\[【]\s*)?"
    r"(?:(?:product|artwork|item)\s+|(?:商品|产品|作品)\s*)?"
    r"id\s*[:：#-]?\s*\d+"
    r"(?:\s*[）)\]】])?",
    re.IGNORECASE,
)


def hide_internal_product_ids(value):
    if value is None:
        return None
    cleaned = INTERNAL_PRODUCT_ID_PATTERN.sub("", str(value))
    cleaned = re.sub(r"[（(\[【]\s*[）)\]】]", "", cleaned)
    cleaned = re.sub(r"\s+([,，。；;:：])", r"\1", cleaned)
    cleaned = re.sub(r"^[,，；;:：]\s*", "", cleaned)
    return " ".join(cleaned.split())


class ProductRecommendation(BaseModel):
    product_id: int = Field(description="An exact product ID from PRODUCT CONTEXT.")
    reason: str = Field(min_length=1, max_length=400)

    @field_validator("reason")
    @classmethod
    def hide_product_id_from_reason(cls, value):
        return hide_internal_product_ids(value)


class AnswerDetail(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=500)
    kind: DetailKind = "text"

    @field_validator("label", "value")
    @classmethod
    def normalize_detail_text(cls, value):
        return " ".join(str(value).split())


class ChatbotAnswer(BaseModel):
    response_type: ResponseType
    language: str = Field(description="Short language code such as zh-CN, en, or ms.")
    summary: str = Field(min_length=1, max_length=1800)
    details: list[AnswerDetail] = Field(default_factory=list, max_length=8)
    recommendations: list[ProductRecommendation] = Field(default_factory=list, max_length=3)
    follow_up_question: str | None = Field(default=None, max_length=400)

    @field_validator("summary", "follow_up_question")
    @classmethod
    def normalize_text(cls, value):
        return hide_internal_product_ids(value)

    def render_text(self):
        sections = [self.summary]
        if self.details:
            sections.append("\n".join(f"{detail.label}: {detail.value}" for detail in self.details))
        if self.follow_up_question and self.follow_up_question not in self.summary:
            sections.append(self.follow_up_question)
        return "\n\n".join(sections)


def detect_language(message):
    value = str(message or "")
    if re.search(r"[\u4e00-\u9fff]", value):
        return "zh-CN"
    if re.search(
        r"\b(saya|anda|boleh|produk|harga|hadiah|ruang|sesuai|terima|kasih|jumpa|alamat|lokasi|hubungi|telefon|emel)\b",
        value,
        re.IGNORECASE,
    ):
        return "ms"
    return "en"
