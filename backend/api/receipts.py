from io import BytesIO
from xml.sax.saxutils import escape

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Company
from .receipt_assets import DELTRIC_ICON_MONOCHROME_PNG


PRIMARY = colors.black
PANEL = HexColor("#F2F2F2")
INK = colors.black
MUTED = HexColor("#4A4A4A")
LINE = HexColor("#BDBDBD")


def build_receipt_pdf(order):
    company = Company.objects.first()
    font_name, bold_font_name = receipt_fonts(order, company)
    styles = receipt_styles(font_name, bold_font_name)
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=f"Receipt {order.order_number}",
        author=(company.cName if company else "DeltricArt"),
    )

    story = []
    story.extend(receipt_header(order, company, styles))
    story.append(Spacer(1, 9 * mm))
    story.extend(receipt_parties(order, styles))
    story.append(Spacer(1, 8 * mm))
    story.extend(receipt_items(order, styles))
    story.append(Spacer(1, 7 * mm))
    story.extend(receipt_totals(order, styles))
    story.append(Spacer(1, 8 * mm))
    story.extend(receipt_payment(order, styles))

    company_name = company.cName if company else "DeltricArt"
    document.build(
        story,
        onFirstPage=lambda canvas, doc: draw_footer(
            canvas, doc, company_name, font_name
        ),
        onLaterPages=lambda canvas, doc: draw_footer(
            canvas, doc, company_name, font_name
        ),
    )
    return buffer.getvalue()


def receipt_fonts(order, company):
    text_values = [
        order.order_number,
        order.contact_name,
        order.contact_email,
        order.contact_mobile,
        *(item.product_name for item in order.items.all()),
    ]
    if company:
        text_values.extend(
            [
                company.cName,
                company.cAddress1,
                company.cAddress2,
                company.cCity,
                company.cState,
            ]
        )
    if any(contains_cjk(value) for value in text_values):
        try:
            pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
            return "STSong-Light", "STSong-Light"
        except Exception:
            pass
    return "Helvetica", "Helvetica-Bold"


def receipt_styles(font_name, bold_font_name):
    base = getSampleStyleSheet()
    return {
        "company": ParagraphStyle(
            "ReceiptCompany",
            parent=base["Heading1"],
            fontName=bold_font_name,
            fontSize=17,
            leading=21,
            textColor=PRIMARY,
            spaceAfter=4,
        ),
        "receipt_title": ParagraphStyle(
            "ReceiptTitle",
            parent=base["Heading1"],
            fontName=bold_font_name,
            fontSize=24,
            leading=28,
            alignment=TA_RIGHT,
            textColor=PRIMARY,
        ),
        "heading": ParagraphStyle(
            "ReceiptHeading",
            parent=base["Heading2"],
            fontName=bold_font_name,
            fontSize=9,
            leading=12,
            textColor=PRIMARY,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "ReceiptBody",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=9,
            leading=14,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "ReceiptSmall",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=8,
            leading=12,
            textColor=MUTED,
        ),
        "small_right": ParagraphStyle(
            "ReceiptSmallRight",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=8,
            leading=12,
            alignment=TA_RIGHT,
            textColor=MUTED,
        ),
        "paid": ParagraphStyle(
            "ReceiptPaid",
            parent=base["BodyText"],
            fontName=bold_font_name,
            fontSize=9,
            leading=12,
            alignment=TA_RIGHT,
            textColor=PRIMARY,
        ),
        "table_header": ParagraphStyle(
            "ReceiptTableHeader",
            parent=base["BodyText"],
            fontName=bold_font_name,
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        "table_header_center": ParagraphStyle(
            "ReceiptTableHeaderCenter",
            parent=base["BodyText"],
            fontName=bold_font_name,
            fontSize=8,
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.white,
        ),
        "table_header_right": ParagraphStyle(
            "ReceiptTableHeaderRight",
            parent=base["BodyText"],
            fontName=bold_font_name,
            fontSize=8,
            leading=10,
            alignment=TA_RIGHT,
            textColor=colors.white,
        ),
        "table": ParagraphStyle(
            "ReceiptTable",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=8.5,
            leading=12,
            textColor=INK,
        ),
        "table_right": ParagraphStyle(
            "ReceiptTableRight",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=8.5,
            leading=12,
            alignment=TA_RIGHT,
            textColor=INK,
        ),
        "table_center": ParagraphStyle(
            "ReceiptTableCenter",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=8.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=INK,
        ),
        "total": ParagraphStyle(
            "ReceiptTotal",
            parent=base["BodyText"],
            fontName=bold_font_name,
            fontSize=11,
            leading=14,
            alignment=TA_RIGHT,
            textColor=PRIMARY,
        ),
        "note": ParagraphStyle(
            "ReceiptNote",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=8.5,
            leading=13,
            alignment=1,
            textColor=MUTED,
        ),
    }


def receipt_header(order, company, styles):
    company_name = company.cName if company else "DeltricArt"
    company_lines = [format_company_address(company)] if company else []
    if company and company.cOfficeNo:
        company_lines.append(f"Tel: {company.cOfficeNo}")
    if company and company.cOfficeEmail:
        company_lines.append(f"Email: {company.cOfficeEmail}")

    payment = order.payment
    paid_at = payment.paid_at or payment.updated_at
    company_icon = Image(
        BytesIO(DELTRIC_ICON_MONOCHROME_PNG),
        width=14 * mm,
        height=10.9 * mm,
    )
    company_identity = Table(
        [[company_icon, Paragraph(safe(company_name), styles["company"])]],
        colWidths=[17 * mm, 88 * mm],
    )
    company_identity.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    left = [
        company_identity,
        Spacer(1, 1.5 * mm),
        Paragraph("<br/>".join(safe(line) for line in company_lines if line), styles["small"]),
    ]
    right = [
        Paragraph("RECEIPT", styles["receipt_title"]),
        Paragraph("PAID", styles["paid"]),
        Paragraph(f"Receipt no: RCT-{safe(order.order_number)}", styles["small_right"]),
        Paragraph(f"Paid on: {safe(format_datetime(paid_at))}", styles["small_right"]),
    ]
    table = Table([[left, right]], colWidths=[105 * mm, 54 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return [table]


def receipt_parties(order, styles):
    customer = "<br/>".join(
        [
            f"<b>{safe(order.contact_name)}</b>",
            safe(order.contact_email),
            safe(order.contact_mobile),
        ]
    )
    if order.fulfillment_method == order.FULFILLMENT_SELF_PICKUP:
        fulfillment_lines = [
            "Self pickup",
            f"Date: {order.pickup_date or '-'}",
            f"Time: {order.pickup_time.strftime('%H:%M') if order.pickup_time else '-'}",
        ]
    else:
        fulfillment_lines = ["Delivery", format_delivery_address(order)]

    table = Table(
        [
            [
                Paragraph("BILLED TO", styles["heading"]),
                Paragraph("FULFILMENT", styles["heading"]),
            ],
            [
                Paragraph(customer, styles["body"]),
                Paragraph("<br/>".join(safe(value) for value in fulfillment_lines), styles["body"]),
            ],
        ],
        colWidths=[80 * mm, 79 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("BACKGROUND", (0, 0), (-1, 0), PANEL),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return [table]


def receipt_items(order, styles):
    data = [
        [
            Paragraph("#", styles["table_header_center"]),
            Paragraph("ITEM", styles["table_header"]),
            Paragraph("QTY", styles["table_header_center"]),
            Paragraph("UNIT PRICE", styles["table_header_right"]),
            Paragraph("AMOUNT", styles["table_header_right"]),
        ]
    ]
    for index, item in enumerate(order.items.all(), start=1):
        name = safe(item.product_name)
        if item.product_code:
            name += f"<br/><font color='#4A4A4A' size='7'>{safe(item.product_code)}</font>"
        data.append(
            [
                Paragraph(str(index), styles["table_center"]),
                Paragraph(name, styles["table"]),
                Paragraph(str(item.quantity), styles["table_center"]),
                Paragraph(format_money(order, item.unit_price), styles["table_right"]),
                Paragraph(format_money(order, item.line_total), styles["table_right"]),
            ]
        )

    table = Table(
        data,
        colWidths=[10 * mm, 73 * mm, 17 * mm, 29 * mm, 30 * mm],
        repeatRows=1,
        hAlign="CENTER",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return [Paragraph("PURCHASE DETAILS", styles["heading"]), table]


def receipt_totals(order, styles):
    rows = [
        [Paragraph("Subtotal", styles["body"]), Paragraph(format_money(order, order.subtotal), styles["table_right"])],
        [Paragraph("Delivery fee", styles["body"]), Paragraph(format_money(order, order.delivery_fee), styles["table_right"])],
        [Paragraph("TOTAL PAID", styles["heading"]), Paragraph(format_money(order, order.total), styles["total"])],
    ]
    table = Table(rows, colWidths=[45 * mm, 35 * mm], hAlign="RIGHT")
    table.setStyle(
        TableStyle(
            [
                ("LINEABOVE", (0, 2), (-1, 2), 1, PRIMARY),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return [table]


def receipt_payment(order, styles):
    payment = order.payment
    details = [
        ["Order number", order.order_number],
        ["Payment method", order.get_payment_method_display()],
        ["Payment provider", payment.get_provider_display()],
        ["Payment reference", payment.bill_id or "-"],
        ["Currency", order.currency_code],
    ]
    rows = [
            [Paragraph(safe(label), styles["small"]), Paragraph(safe(value), styles["body"])]
            for label, value in details
        ]
    rows.append(
        [
            Paragraph(
                "Thank you for your purchase. Please keep this receipt for your records.",
                styles["note"],
            ),
            "",
        ]
    )
    note_row = len(rows) - 1
    table = Table(rows, colWidths=[40 * mm, 119 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, note_row - 1), PANEL),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, note_row - 1), 0.35, LINE),
                ("SPAN", (0, note_row), (-1, note_row)),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, note_row), (-1, note_row), 9),
                ("BOTTOMPADDING", (0, note_row), (-1, note_row), 9),
            ]
        )
    )
    return [KeepTogether([Paragraph("PAYMENT DETAILS", styles["heading"]), table])]


def draw_footer(canvas, document, company_name, font_name):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont(font_name, 7)
    canvas.drawString(18 * mm, 9 * mm, company_name)
    canvas.drawRightString(A4[0] - 18 * mm, 9 * mm, f"Page {document.page}")
    canvas.restoreState()


def format_company_address(company):
    if not company:
        return ""
    locality = " ".join(value for value in [company.cPostcode, company.cCity] if value)
    return ", ".join(
        value
        for value in [company.cAddress1, company.cAddress2, locality, company.cState]
        if value
    )


def format_delivery_address(order):
    locality = " ".join(
        value for value in [order.delivery_postcode, order.delivery_city] if value
    )
    return ", ".join(
        value
        for value in [
            order.delivery_addr1,
            order.delivery_addr2,
            locality,
            order.delivery_state,
        ]
        if value
    ) or "-"


def format_datetime(value):
    if not value:
        return "-"
    return timezone.localtime(value).strftime("%d %b %Y, %I:%M %p")


def format_money(order, value):
    return f"{order.currency_symbol}{value:,.2f}"


def contains_cjk(value):
    return any("\u3400" <= character <= "\u9fff" for character in str(value or ""))


def safe(value):
    return escape(str(value or "-"))
