from api.models import Company

from .schemas import detect_language


ADDRESS_KEYWORDS = [
    "address",
    "location",
    "located",
    "where are you",
    "where is",
    "地址",
    "位置",
    "地点",
    "地點",
    "在哪里",
    "在哪裡",
    "alamat",
    "lokasi",
]

EMAIL_KEYWORDS = [
    "email",
    "e-mail",
    "mail address",
    "邮箱",
    "郵箱",
    "电邮",
    "電郵",
    "emel",
]

PHONE_KEYWORDS = [
    "phone",
    "telephone",
    "mobile",
    "contact number",
    "call",
    "电话",
    "電話",
    "联络号码",
    "聯絡號碼",
    "电话号码",
    "電話號碼",
    "telefon",
    "nombor",
]

GENERAL_CONTACT_KEYWORDS = [
    "contact",
    "contact details",
    "联系方式",
    "聯絡方式",
    "联系",
    "聯絡",
    "hubungi",
]


def get_company_contact_answer(message):
    company = Company.objects.first()
    language = detect_language(message)
    if company is None:
        return unavailable_reply(language), []

    lowered = str(message or "").lower()
    wants_all = any(keyword in lowered for keyword in GENERAL_CONTACT_KEYWORDS)
    wants_address = wants_all or any(keyword in lowered for keyword in ADDRESS_KEYWORDS)
    wants_email = wants_all or any(keyword in lowered for keyword in EMAIL_KEYWORDS)
    wants_phone = wants_all or any(keyword in lowered for keyword in PHONE_KEYWORDS)
    if not any([wants_address, wants_email, wants_phone]):
        wants_address = wants_email = wants_phone = True

    details = []
    if wants_address:
        address = format_company_address(company)
        if address:
            details.append(("address", address))
    if wants_email:
        details.extend(
            (label, value)
            for label, value in [
                ("office_email", company.cOfficeEmail),
                ("gallery_email", company.cOwnerEmail),
            ]
            if value
        )
    if wants_phone:
        details.extend(
            (label, value)
            for label, value in [
                ("office_phone", company.cOfficeNo),
                ("office_mobile", company.cOfficeTelNo),
                ("gallery_phone", company.cOwnerTelNo),
            ]
            if value
        )

    if not details:
        return unavailable_reply(language), []
    return (
        contact_intro(company.cName or "DeltricArt", language),
        format_contact_details(details, language),
    )


def format_company_address(company):
    locality = " ".join(
        value
        for value in [company.cPostcode, company.cCity]
        if value
    )
    return ", ".join(
        value
        for value in [
            company.cAddress1,
            company.cAddress2,
            locality,
            company.cState,
        ]
        if value
    )


def contact_intro(company_name, language):
    if language == "zh-CN":
        return f"当然可以。以下是 {company_name} 的公司资料："
    if language == "ms":
        return f"Sudah tentu. Berikut ialah maklumat {company_name}:"
    return f"Certainly. Here are {company_name}'s company details:"


def format_contact_details(details, language):
    labels = contact_labels(language)
    return [
        {
            "label": labels[key],
            "value": value,
            "kind": detail_kind(key),
        }
        for key, value in details
    ]


def detail_kind(key):
    if key == "address":
        return "address"
    if key.endswith("email"):
        return "email"
    if key.endswith("phone") or key == "office_mobile":
        return "phone"
    return "text"


def contact_labels(language):
    if language == "zh-CN":
        return {
            "address": "地址",
            "office_email": "公司电邮",
            "gallery_email": "联络电邮",
            "office_phone": "公司电话",
            "office_mobile": "公司手机",
            "gallery_phone": "联络电话",
        }
    if language == "ms":
        return {
            "address": "Alamat",
            "office_email": "E-mel pejabat",
            "gallery_email": "E-mel perhubungan",
            "office_phone": "Telefon pejabat",
            "office_mobile": "Telefon bimbit pejabat",
            "gallery_phone": "Telefon perhubungan",
        }
    return {
        "address": "Address",
        "office_email": "Office email",
        "gallery_email": "Contact email",
        "office_phone": "Office phone",
        "office_mobile": "Office mobile",
        "gallery_phone": "Contact phone",
    }


def unavailable_reply(language):
    if language == "zh-CN":
        return "抱歉，这项公司联络资料目前还没有提供。你也可以前往 Contact 页面查看最新资料。"
    if language == "ms":
        return "Maaf, maklumat perhubungan syarikat ini belum tersedia. Anda juga boleh menyemak halaman Contact."
    return "Sorry, this company contact information is not available yet. You can also check the Contact page for the latest details."
