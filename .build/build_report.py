from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = r"C:\Users\Adarsh Sharma\Desktop\NGO\Deliverables\NGO_Connect_Project_Report.docx"
NAVY, TEAL, PALE, GRID = "173B3F", "2D7370", "F2F6F5", "D6E1DF"
INK, GRAY = "202B2D", "58686A"

doc = Document()
sec = doc.sections[0]
sec.top_margin, sec.bottom_margin = Inches(.72), Inches(.7)
sec.left_margin = sec.right_margin = Inches(.82)
normal = doc.styles["Normal"]
normal.font.name, normal.font.size = "Aptos", Pt(10)
normal.font.color.rgb = RGBColor.from_string(INK)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.1
for name, size in (("Title", 31), ("Heading 1", 20), ("Heading 2", 13)):
    s = doc.styles[name]
    s.font.name = "Aptos Display" if name != "Heading 2" else "Aptos"
    s.font.size, s.font.bold = Pt(size), True
    s.font.color.rgb = RGBColor.from_string("000000")
    s.paragraph_format.space_before = Pt(11)
    s.paragraph_format.space_after = Pt(5)

def shade(cell, fill):
    pr = cell._tc.get_or_add_tcPr()
    el = OxmlElement("w:shd")
    el.set(qn("w:fill"), fill)
    pr.append(el)

def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment, t.autofit = WD_TABLE_ALIGNMENT.CENTER, False
    if widths:
        for col, width in zip(t.columns, widths): col.width = Inches(width)
    for i, value in enumerate(headers):
        c = t.rows[0].cells[i]
        shade(c, NAVY)
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(value); r.bold = True; r.font.name = "Aptos"; r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
    for ri, row in enumerate(rows):
        cells = t.add_row().cells
        for i, value in enumerate(row):
            c = cells[i]
            if ri % 2: shade(c, PALE)
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(value)); r.font.name = "Aptos"; r.font.size = Pt(9)
            r.font.color.rgb = RGBColor.from_string(INK)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "single")
        e.set(qn("w:sz"), "5"); e.set(qn("w:color"), GRID); borders.append(e)
    t._tbl.tblPr.append(borders)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return t

def bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(3)
    p.add_run(text)

# Cover
p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(68)
r = p.add_run("NGO CONNECT"); r.bold = True; r.font.size = Pt(12); r.font.color.rgb = RGBColor.from_string(TEAL)
p = doc.add_paragraph(style="Title"); p.paragraph_format.space_after = Pt(10); p.add_run("Project Report")
p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(25)
r = p.add_run("A web platform for NGO events, volunteer registration, and attendance")
r.font.size = Pt(15); r.font.color.rgb = RGBColor.from_string(GRAY)
t = doc.add_table(rows=1, cols=1); c = t.cell(0, 0); shade(c, "E7F1EF")
p = c.paragraphs[0]; r = p.add_run("CURRENT STATUS  "); r.bold = True; r.font.color.rgb = RGBColor.from_string(TEAL)
p.add_run("Frontend and backend implementation completed. Automated API checks pass with PostgreSQL-compatible test storage. A live PostgreSQL connection still needs local configuration and verification.")
doc.add_paragraph()
table(["Prepared for", "Prepared by", "Date"], [["Project review", "Adarsh Sharma", "16 November 2026"]], [2.2, 2.2, 2.2])
p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(78)
r = p.add_run("Active roles: NGO Admin and Volunteer  |  Team-member login: not implemented in this prototype")
r.font.size = Pt(9); r.font.color.rgb = RGBColor.from_string(GRAY)
doc.add_page_break()

doc.add_heading("Executive Summary", 1)
doc.add_paragraph("NGO Connect is a web application for managing NGO events and volunteer attendance. NGO Admins create and manage events. Volunteers browse live events, register, view their registrations, and check in by scanning an event QR code. A React frontend communicates with an Express API, which stores application records in PostgreSQL when configured.")
doc.add_paragraph("The prototype includes volunteer signup, login sessions, role-based access, event CRUD, registration capacity checks, QR generation, attendance recording, and NGO reports. Admin accounts are provisioned through a backend setup command. Team-member accounts and screens are intentionally excluded from the current prototype.")
doc.add_paragraph("The frontend production build, lint, backend syntax checks, and API integration suite passed in the project workspace. The API tests use pg-mem, an in-memory PostgreSQL-compatible test database. No live PostgreSQL service or Backend/.env was available for a real database connection test, so local configuration and end-to-end verification remain necessary.")
doc.add_heading("Project at a Glance", 2)
table(["Area", "Current implementation"], [
    ["Frontend", "React 19, Vite, React Router, and a credentials-included API client."],
    ["Backend", "Express 5 API with validation, role checks, rate limiting, and session handling."],
    ["Database", "PostgreSQL tables for users, events, and registrations; schema is applied on server startup."],
    ["Security", "bcrypt password hashes, HTTP-only session cookie, JWT verification, origin checks, Helmet headers."],
    ["Testing", "Build and lint passed; backend integration test passed with pg-mem."],
    ["Setup needed", "Configure a live PostgreSQL connection and create the first NGO Admin account."],
], [1.35, 5.25])

doc.add_heading("1. Purpose and Scope", 1)
doc.add_paragraph("The project supports a simple event lifecycle: an NGO Admin prepares an event and opens it for registration, volunteers sign up, and attendance is recorded at the venue. The backend becomes the source of truth for accounts, events, registrations, and attendance instead of browser-only mock data.")
doc.add_heading("Current roles", 2)
table(["Role", "Capabilities"], [
    ["Volunteer", "Create an account, sign in, browse live events, register, see personal registrations, and submit attendance with a valid event QR."],
    ["NGO Admin", "Sign in with a provisioned account, create and update events, set event status, generate or replace QR codes, and review registrations and attendance."],
    ["Team member", "Login and team-management flows are not implemented in this prototype."],
], [1.35, 5.25])
doc.add_paragraph("Public signup always creates a Volunteer account. Admin creation uses a separate setup command. Platform-wide admin, organization settings, donations, and payment processing are outside the active scope.")

doc.add_heading("2. Architecture", 1)
doc.add_paragraph("Local development runs three connected parts: the browser loads the React application, the frontend sends API requests to Express, and Express reads and writes records in PostgreSQL.")
table(["Part", "Responsibility", "Local address"], [
    ["React + Vite", "Pages, forms, navigation, QR scanning, and API client.", "http://localhost:5173"],
    ["Express API", "Request validation, session and role checks, business rules, and JSON responses.", "http://localhost:5000"],
    ["PostgreSQL", "Persistent user, event, registration, and attendance data.", "localhost:5432 by default"],
], [1.35, 3.75, 1.5])
doc.add_heading("Database model", 2)
table(["Table", "Key data and relationships"], [
    ["users", "UUID, name, unique email, password hash, and role limited to volunteer or ngo_admin."],
    ["events", "Owner reference, event details, positive capacity, draft/live/closed status, and current QR token."],
    ["registrations", "Event and volunteer references, attendance flag, check-in time, and unique event/volunteer pair."],
], [1.35, 5.25])
doc.add_paragraph("Foreign keys, uniqueness rules, status checks, and indexes help maintain data consistency. API database values are passed as parameters.")

doc.add_heading("3. User Workflows", 1)
doc.add_heading("Volunteer", 2)
for text in [
    "Create an account. The server validates the details and hashes the password before saving the user.",
    "Sign in. The server issues an HTTP-only session cookie that browser JavaScript cannot read.",
    "Browse live events and register. The API checks event status, capacity, and duplicate registration.",
    "Scan the event QR at the venue. The server verifies the current token and records check-in for a registered volunteer.",
]: bullet(text)
doc.add_heading("NGO Admin", 2)
for text in [
    "An operator provisions an admin account through the backend setup command.",
    "Create an event in draft status, then set it live to open registration.",
    "Generate an attendance QR. Replacing its token invalidates earlier QR codes.",
    "Review event registrations, volunteer records, attendance totals, and progress reports.",
]: bullet(text)

doc.add_heading("4. API and Security", 1)
table(["API area", "Purpose"], [
    ["/api/auth", "Volunteer signup, login, current session, and logout."],
    ["/api/events", "Event listing and CRUD, QR generation, volunteer registration, and event registration listing."],
    ["/api/registrations", "Registrations scoped to the signed-in volunteer or NGO Admin."],
    ["/api/events/:eventId/attendance", "Validate current QR token and record volunteer check-in."],
    ["/api/health and /api/health/database", "API and database health checks."],
], [2.8, 3.8])
doc.add_paragraph("Protected routes enforce user roles on the server. Signup cannot promote a user to admin. Passwords are stored as bcrypt hashes. Login attempts are rate limited. Registration and attendance use transactions to protect capacity and prevent duplicate check-ins. The session cookie is HTTP-only, and browser origins are restricted through FRONTEND_URL.")
doc.add_paragraph("Production deployment still needs matching HTTPS origins, suitable cookie settings, backups, logging, and account recovery procedures.")

doc.add_heading("5. Verification", 1)
table(["Check", "Result", "Evidence"], [
    ["Frontend build", "Passed", "Vite generated the production bundle."],
    ["Frontend lint", "Passed", "Oxlint completed with no findings in the final check."],
    ["Backend integration", "Passed", "Auth, roles, event CRUD, capacity, QR replacement, registration, and attendance tested with pg-mem."],
    ["Backend syntax", "Passed", "app.js, server.js, and create-admin.js parsed successfully."],
    ["Live PostgreSQL", "Not verified", "No local PostgreSQL service or Backend/.env was available in the workspace."],
], [1.55, 1.05, 4.0])
doc.add_paragraph("The integration test verifies API logic with PostgreSQL-compatible in-memory storage. It does not prove that the computer can connect to PostgreSQL. Before a live demo, verify /api/health/database, automatic schema creation, admin provisioning, browser login, and the volunteer event workflow against a real database.")

doc.add_page_break()
doc.add_heading("6. Running the Project", 1)
doc.add_paragraph("Install and start PostgreSQL, create the ngo_connect database once, then configure Backend/.env with DATABASE_URL and a private JWT_SECRET. Start the backend once so it creates tables. Provision the first NGO Admin, then keep the backend and frontend running in separate terminals.")
table(["Task", "Folder", "Command"], [
    ["Run API", "Backend", "npm run dev"],
    ["Run website", "frontend", "npm run dev"],
    ["Backend tests", "Backend", "npm test"],
    ["Frontend checks", "frontend", "npm run build and npm run lint"],
], [1.55, 1.45, 3.6])
doc.add_paragraph("The frontend defaults to http://localhost:5000/api. The backend expects the frontend at http://localhost:5173. Detailed Windows setup and admin provisioning instructions are in Backend/README.md.")

doc.add_heading("7. Next Steps", 1)
for text in [
    "Configure a real PostgreSQL service and validate Backend/.env without sharing its credentials.",
    "Start the API, confirm the database health endpoint, and create the NGO Admin account.",
    "Run both servers and manually verify admin event creation, volunteer signup, registration, QR check-in, and reports end to end.",
    "Add browser-level tests and run integration checks against a real PostgreSQL test database.",
    "Before deployment, set production HTTPS and cookie configuration, backups, logging, and account recovery policies.",
]: bullet(text)
doc.add_heading("Conclusion", 1)
doc.add_paragraph("The code now connects the volunteer and NGO Admin workflows to an API and has passing automated build, lint, syntax, and API checks. The remaining milestone is local live-database configuration and end-to-end verification. Team-member login is not part of this prototype.")

header = sec.header.paragraphs[0]; header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r = header.add_run("NGO CONNECT  /  PROJECT REPORT"); r.bold = True; r.font.size = Pt(8); r.font.color.rgb = RGBColor.from_string(TEAL)
footer = sec.footer.paragraphs[0]; footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = footer.add_run("Project review  |  16 November 2026  |  "); r.font.size = Pt(8); r.font.color.rgb = RGBColor.from_string(GRAY)
field = OxmlElement("w:fldSimple"); field.set(qn("w:instr"), "PAGE"); footer._p.append(field)
doc.core_properties.title = "NGO Connect Project Report"
doc.core_properties.subject = "Project scope, architecture, workflows, verification, and setup"
doc.core_properties.author = "Adarsh Sharma"
doc.save(OUT)
print(OUT)
