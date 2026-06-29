"""Reports router - AI-powered PDF investment report generation."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ReportRequest
from analytics.portfolio_metrics import compute_full_metrics
from analytics.risk_engine import compute_var_metrics
import io
import json
from datetime import datetime

router = APIRouter()


def generate_ai_commentary(metrics: dict, var_data: dict, api_key: str = None) -> dict:
    """Generate institutional commentary using Groq API."""
    if not api_key:
        return generate_template_commentary(metrics, var_data)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        m = metrics["metrics"]
        prompt = f"""You are a senior portfolio manager at a top-tier investment bank.
Generate a concise, institutional-quality investment report commentary based on these metrics:

Portfolio Metrics:
- Total Return: {m['total_return']:.2%}
- Annualized Return: {m['annualized_return']:.2%}
- Volatility: {m['annualized_volatility']:.2%}
- Sharpe Ratio: {m['sharpe_ratio']:.2f}
- Sortino Ratio: {m['sortino_ratio']:.2f}
- Maximum Drawdown: {m['maximum_drawdown']:.2%}
- Beta: {m['beta']:.2f}
- Alpha: {m['alpha']:.2%}

Risk Metrics (95% VaR):
- Daily VaR: {var_data['var_metrics']['daily']['historical_var']:.2%}
- Monthly VaR: {var_data['var_metrics']['monthly']['historical_var']:.2%}

Return ONLY a valid JSON object with these keys:
{{
  "executive_summary": "2-3 sentence overall assessment",
  "performance_commentary": "2-3 sentence performance analysis",
  "risk_commentary": "2-3 sentence risk analysis",
  "diversification_commentary": "2-3 sentence diversification assessment",
  "recommendations": ["action item 1", "action item 2", "action item 3"]
}}"""

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        return json.loads(content)
    except Exception:
        return generate_template_commentary(metrics, var_data)


def generate_template_commentary(metrics: dict, var_data: dict) -> dict:
    """Fallback template-based commentary generation."""
    m = metrics["metrics"]
    sharpe = m["sharpe_ratio"]
    mdd = m["maximum_drawdown"]
    ann_ret = m["annualized_return"]
    beta = m["beta"]

    if sharpe > 1.0:
        perf_qual = "strong"
    elif sharpe > 0.5:
        perf_qual = "adequate"
    else:
        perf_qual = "below benchmark"

    risk_qual = "elevated" if mdd < -0.20 else ("moderate" if mdd < -0.10 else "well-controlled")

    return {
        "executive_summary": (
            f"The portfolio has delivered {ann_ret:.1%} annualized returns with a Sharpe ratio of {sharpe:.2f}, "
            f"indicating {perf_qual} risk-adjusted performance relative to peers. "
            f"Maximum drawdown of {mdd:.1%} reflects {risk_qual} downside exposure."
        ),
        "performance_commentary": (
            f"Portfolio performance has been {'above' if ann_ret > 0.10 else 'below'} historical equity averages. "
            f"The Sortino ratio of {m['sortino_ratio']:.2f} suggests {'acceptable' if m['sortino_ratio'] > 1.0 else 'suboptimal'} downside risk management. "
            f"Alpha of {m['alpha']:.2%} indicates {'positive' if m['alpha'] > 0 else 'negative'} active returns versus the benchmark."
        ),
        "risk_commentary": (
            f"Portfolio beta of {beta:.2f} implies {'above-market' if beta > 1.1 else ('below-market' if beta < 0.9 else 'market-neutral')} systematic risk exposure. "
            f"Daily 95% VaR stands at {var_data['var_metrics']['daily']['historical_var']:.2%}, indicating potential single-day loss at the 5th percentile. "
            f"Monthly VaR of {var_data['var_metrics']['monthly']['historical_var']:.2%} warrants {'active' if abs(var_data['var_metrics']['monthly']['historical_var']) > 0.10 else 'standard'} risk monitoring."
        ),
        "diversification_commentary": (
            "Portfolio concentration should be assessed against sector and geographic allocation targets. "
            "High inter-asset correlations may reduce diversification benefits during market stress. "
            "Consider rebalancing toward uncorrelated asset classes to improve the efficient frontier positioning."
        ),
        "recommendations": [
            f"{'Reduce' if beta > 1.2 else 'Maintain'} market beta exposure through {'defensive sector rotation' if beta > 1.2 else 'current allocation'}",
            f"Review maximum drawdown of {mdd:.1%} against risk budget thresholds",
            "Evaluate sector concentration and implement weight caps on overweight positions",
            "Consider adding uncorrelated assets to improve portfolio Sharpe ratio",
            "Implement systematic rebalancing to restore target weights quarterly",
        ],
    }


def build_pdf_report(
    portfolio_name: str,
    tickers: list,
    weights: list,
    metrics: dict,
    var_data: dict,
    commentary: dict,
) -> bytes:
    """Build a professional PDF report using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    NAVY = HexColor("#0A1628")
    BLUE = HexColor("#1E40AF")
    GOLD = HexColor("#D4AF37")
    LIGHT_GRAY = HexColor("#F8FAFC")
    MID_GRAY = HexColor("#64748B")
    GREEN = HexColor("#059669")
    RED = HexColor("#DC2626")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", fontSize=22, fontName="Helvetica-Bold",
                                  textColor=NAVY, spaceAfter=6, alignment=TA_LEFT)
    subtitle_style = ParagraphStyle("subtitle", fontSize=11, fontName="Helvetica",
                                     textColor=MID_GRAY, spaceAfter=4)
    heading_style = ParagraphStyle("heading", fontSize=13, fontName="Helvetica-Bold",
                                    textColor=NAVY, spaceBefore=12, spaceAfter=4)
    body_style = ParagraphStyle("body", fontSize=9, fontName="Helvetica",
                                 textColor=HexColor("#334155"), leading=14, spaceAfter=6)
    label_style = ParagraphStyle("label", fontSize=8, fontName="Helvetica",
                                  textColor=MID_GRAY, spaceAfter=2)

    story = []
    m = metrics["metrics"]
    var_m = var_data["var_metrics"]
    now = datetime.now().strftime("%B %d, %Y")

    # Header
    story.append(Paragraph(portfolio_name, title_style))
    story.append(Paragraph(f"Investment Risk & Performance Report — {now}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=12))

    # Executive Summary
    story.append(Paragraph("Executive Summary", heading_style))
    story.append(Paragraph(commentary.get("executive_summary", ""), body_style))
    story.append(Spacer(1, 8))

    # Key Metrics Table
    story.append(Paragraph("Performance Metrics", heading_style))

    def fmt_pct(v, d=2): return f"{v*100:.{d}f}%"
    def fmt_float(v, d=2): return f"{v:.{d}f}"

    metrics_data = [
        ["METRIC", "VALUE", "METRIC", "VALUE"],
        ["Total Return", fmt_pct(m["total_return"]), "Sharpe Ratio", fmt_float(m["sharpe_ratio"])],
        ["Annualized Return", fmt_pct(m["annualized_return"]), "Sortino Ratio", fmt_float(m["sortino_ratio"])],
        ["Annualized Volatility", fmt_pct(m["annualized_volatility"]), "Beta", fmt_float(m["beta"])],
        ["Max Drawdown", fmt_pct(m["maximum_drawdown"]), "Alpha", fmt_pct(m["alpha"])],
        ["Calmar Ratio", fmt_float(m["calmar_ratio"]), "Info Ratio", fmt_float(m["information_ratio"])],
    ]

    t = Table(metrics_data, colWidths=[4.5 * cm, 3.5 * cm, 4.5 * cm, 3.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, white]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (0, -1), NAVY),
        ("TEXTCOLOR", (2, 1), (2, -1), NAVY),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # VaR Section
    story.append(Paragraph("Value at Risk Analysis (95% Confidence)", heading_style))
    story.append(Paragraph(commentary.get("risk_commentary", ""), body_style))
    story.append(Spacer(1, 6))

    var_data_table = [
        ["HORIZON", "HISTORICAL VAR", "PARAMETRIC VAR", "MONTE CARLO VAR", "CVAR (ES)"],
    ]
    for horizon in ["daily", "weekly", "monthly"]:
        h = var_m[horizon]
        var_data_table.append([
            horizon.capitalize(),
            fmt_pct(h["historical_var"]),
            fmt_pct(h["parametric_var"]),
            fmt_pct(h["monte_carlo_var"]),
            fmt_pct(h["conditional_var"]),
        ])

    vt = Table(var_data_table, colWidths=[3 * cm, 3.3 * cm, 3.3 * cm, 3.3 * cm, 3.1 * cm])
    vt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, white]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(vt)
    story.append(Spacer(1, 12))

    # Holdings Table
    story.append(Paragraph("Portfolio Holdings", heading_style))
    holdings_data = [["TICKER", "WEIGHT"]]
    for ticker, weight in zip(tickers, weights):
        holdings_data.append([ticker, f"{weight*100:.1f}%"])

    ht = Table(holdings_data, colWidths=[4 * cm, 3 * cm])
    ht.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, white]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(ht)
    story.append(Spacer(1, 12))

    # Recommendations
    story.append(Paragraph("Strategic Recommendations", heading_style))
    for rec in commentary.get("recommendations", []):
        story.append(Paragraph(f"• {rec}", body_style))
    story.append(Spacer(1, 8))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#E2E8F0"), spaceBefore=12))
    story.append(Paragraph(
        f"This report is generated for informational purposes only and does not constitute investment advice. "
        f"Generated on {now}. Past performance does not guarantee future results.",
        ParagraphStyle("footer", fontSize=7, textColor=MID_GRAY, fontName="Helvetica"),
    ))

    doc.build(story)
    return buffer.getvalue()


@router.post("/generate")
async def generate_report(req: ReportRequest):
    try:
        weights = [h / sum(req.weights) for h in req.weights]
        metrics = compute_full_metrics(
            tickers=req.tickers,
            weights=weights,
            benchmark=req.benchmark.value,
            period=req.period.value,
        )
        var_data = compute_var_metrics(
            tickers=req.tickers,
            weights=weights,
            period=req.period.value,
        )
        commentary = generate_ai_commentary(metrics, var_data, req.groq_api_key)
        pdf_bytes = build_pdf_report(
            portfolio_name=req.portfolio_name,
            tickers=req.tickers,
            weights=weights,
            metrics=metrics,
            var_data=var_data,
            commentary=commentary,
        )
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{datetime.now().strftime('%Y%m%d')}.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
