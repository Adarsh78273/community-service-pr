from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table as DocxTable
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph as RPara, Spacer, PageBreak, Table, TableStyle, KeepTogether
from xml.sax.saxutils import escape

SRC = r"C:\Users\Adarsh Sharma\Desktop\NGO\Deliverables\NGO_Connect_Project_Report.docx"
OUT = r"C:\Users\Adarsh Sharma\Desktop\NGO\Deliverables\NGO_Connect_Project_Report.pdf"
NAVY = colors.HexColor("#173B3F")
TEAL = colors.HexColor("#2D7370")
INK = colors.HexColor("#202B2D")
MUTED = colors.HexColor("#58686A")
PALE = colors.HexColor("#F2F6F5")
GRID = colors.HexColor("#D6E1DF")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BodyNGO", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.4, leading=13.3, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="TitleNGO", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=30, leading=35, textColor=colors.black, alignment=0, spaceAfter=8))
styles.add(ParagraphStyle(name="H1NGO", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=colors.black, spaceBefore=11, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name="H2NGO", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=colors.black, spaceBefore=8, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle(name="BulletNGO", parent=styles["BodyNGO"], leftIndent=14, firstLineIndent=-9, bulletIndent=0, spaceAfter=3))
styles.add(ParagraphStyle(name="CellNGO", parent=styles["BodyNGO"], fontSize=8.1, leading=10.6, spaceAfter=0))
styles.add(ParagraphStyle(name="CellHeadNGO", parent=styles["CellNGO"], fontName="Helvetica-Bold", textColor=colors.white))

def draw_page(canvas, doc):
    page = canvas.getPageNumber()
    if page > 1:
        canvas.saveState()
        w, h = letter
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(TEAL)
        canvas.drawRightString(w - .82*inch, h - .42*inch, "NGO CONNECT  /  PROJECT REPORT")
        canvas.setStrokeColor(GRID)
        canvas.setLineWidth(.5)
        canvas.line(.82*inch, .48*inch, w - .82*inch, .48*inch)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(w/2, .30*inch, f"Project review  |  16 November 2026  |  {page}")
        canvas.restoreState()

doc = Document(SRC)
story = []
usable = letter[0] - 1.64*inch

for item in doc.iter_inner_content():
    if isinstance(item, Paragraph):
        txt = item.text.strip()
        if txt:
            style_name = item.style.name
            if style_name == "Title": style = styles["TitleNGO"]
            elif style_name == "Heading 1": style = styles["H1NGO"]
            elif style_name == "Heading 2": style = styles["H2NGO"]
            elif style_name.startswith("List Bullet"):
                story.append(RPara("&#8226;&nbsp;&nbsp;" + escape(txt), styles["BulletNGO"]))
                continue
            else: style = styles["BodyNGO"]
            story.append(RPara(escape(txt).replace("\n", "<br/>"), style))
        before = item._p.xpath(".//w:br[@w:type='page']")
        if before: story.append(PageBreak())
        elif not txt and item.paragraph_format.space_before and item.paragraph_format.space_before.pt > 30:
            story.append(Spacer(1, min(item.paragraph_format.space_before.pt, 70)))
    elif isinstance(item, DocxTable):
        data = []
        for ri, row in enumerate(item.rows):
            values = []
            for cell in row.cells:
                cell_text = "<br/>".join(escape(p.text.strip()) for p in cell.paragraphs if p.text.strip())
                values.append(RPara(cell_text or " ", styles["CellHeadNGO"] if ri == 0 else styles["CellNGO"]))
            data.append(values)
        ncol = len(data[0])
        # Proportion widths from Word's table grid, normalized to printable area.
        widths = [float(col.width.inches) for col in item.columns]
        total = sum(widths) or ncol
        col_widths = [usable * x / total for x in widths]
        t = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
        commands = [
            ("BACKGROUND", (0,0), (-1,0), NAVY),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("GRID", (0,0), (-1,-1), .45, GRID),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
            ("RIGHTPADDING", (0,0), (-1,-1), 8),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]
        for ri in range(1, len(data)):
            if ri % 2 == 0: commands.append(("BACKGROUND", (0,ri), (-1,ri), PALE))
        t.setStyle(TableStyle(commands))
        story.extend([t, Spacer(1, 8)])

pdf = SimpleDocTemplate(OUT, pagesize=letter, rightMargin=.82*inch, leftMargin=.82*inch, topMargin=.72*inch, bottomMargin=.68*inch, title="NGO Connect Project Report", author="Adarsh Sharma")
pdf.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
print(OUT)
