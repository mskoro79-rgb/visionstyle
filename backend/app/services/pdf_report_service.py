"""Phase 12 — PDF report generation for the no-login dashboard.

Renders a shareable, printable summary (appearance profile, AI score, top
recommendation, color palette, fashion tips) using ReportLab so shoppers
can save/print their session without needing an account.
"""
from __future__ import annotations

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.schemas import DashboardReport

BRAND_PURPLE = colors.HexColor("#7c3aed")
BRAND_GOLD = colors.HexColor("#d4af37")
BRAND_DARK = colors.HexColor("#120c1e")


def build_dashboard_pdf(report: DashboardReport) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("VSTitle", parent=styles["Title"], textColor=BRAND_PURPLE, fontSize=24)
    heading_style = ParagraphStyle("VSHeading", parent=styles["Heading2"], textColor=BRAND_DARK, spaceBefore=14)
    body_style = ParagraphStyle("VSBody", parent=styles["BodyText"], leading=15)

    story = [
        Paragraph("VisionStyle — Personal Style Report", title_style),
        Paragraph(f"Session {report.session_id} &middot; Generated {report.generated_at.strftime('%Y-%m-%d %H:%M UTC')}", body_style),
        Spacer(1, 0.6 * cm),
        Paragraph(f"AI Score: <b>{report.ai_score:.1f}</b> / 100", heading_style),
    ]

    if report.analysis:
        a = report.analysis
        story.append(Paragraph("Appearance Analysis", heading_style))
        rows = [
            ["Face Shape", a.face_shape.shape.value.title(), f"{a.face_shape.confidence:.0%} confidence"],
            [
                "Body Shape",
                a.body_shape.shape.value.replace("_", " ").title() if a.body_shape else "N/A",
                f"{a.body_shape.confidence:.0%} confidence" if a.body_shape else "Upload a full-body photo",
            ],
            [
                "Skin Tone",
                f"{a.skin_tone.depth.value.title()} / {a.skin_tone.undertone.value.title()}",
                a.skin_tone.hex_color.upper(),
            ],
        ]
        table = Table([["Attribute", "Result", "Detail"], *rows], colWidths=[4 * cm, 6 * cm, 6 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND_PURPLE),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f5fb")]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(table)

    if report.latest_recommendation and report.latest_recommendation.recommendations:
        rec = report.latest_recommendation.recommendations[0]
        story.append(Paragraph("Top Recommendation", heading_style))
        story.append(Paragraph(f"<b>{rec.title}</b> &mdash; {rec.confidence:.0%} match confidence", body_style))
        story.append(Paragraph(rec.reason, body_style))

        piece_rows = [["Category", "Item", "Price"]]
        for piece in rec.outfit_pieces:
            piece_rows.append([piece.category.title(), piece.name, f"${piece.price:.2f}" if piece.price else "—"])
        piece_table = Table(piece_rows, colWidths=[4 * cm, 9 * cm, 3 * cm])
        piece_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND_GOLD),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f5fb")]),
                ]
            )
        )
        story.append(Spacer(1, 0.3 * cm))
        story.append(piece_table)

        if rec.fashion_tips:
            story.append(Paragraph("Fashion Tips", heading_style))
            for tip in rec.fashion_tips:
                story.append(Paragraph(f"&#10022; {tip}", body_style))

        scores = rec.scores
        story.append(Paragraph("Score Breakdown", heading_style))
        score_rows = [
            ["Fashion Score", f"{scores.fashion_score:.0f} / 100"],
            ["Color Harmony", f"{scores.color_harmony_score:.0f} / 100"],
            ["Body Fit", f"{scores.body_fit_score:.0f} / 100"],
            ["Occasion Match", f"{scores.occasion_match_score:.0f} / 100"],
        ]
        score_table = Table(score_rows, colWidths=[6 * cm, 4 * cm])
        score_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
                    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f7f5fb")]),
                ]
            )
        )
        story.append(score_table)

    if not report.analysis:
        story.append(Paragraph("No AI Analysis has been run yet for this session.", body_style))

    doc.build(story)
    return buffer.getvalue()
