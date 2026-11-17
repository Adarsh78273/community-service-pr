import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:/Users/Adarsh Sharma/Desktop/NGO";
const BUILD = path.join(ROOT, ".build");
const PREVIEWS = path.join(BUILD, "deck-render");
const C = {
  ink: "#173B3F", teal: "#2D7370", canvas: "#F5F6F2", white: "#FFFFFF",
  text: "#263335", muted: "#5D6B6C", line: "#C8D5D2", pale: "#E7F1EF",
};

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function text(slide, name, value, x, y, w, h, size, color = C.text, bold = false, align = "left") {
  const shape = slide.shapes.add({
    geometry: "textbox", name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none", line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    fontSize: size, color, bold, typeface: "Arial", alignment: align,
    verticalAlignment: "middle", wrap: "square", autoFit: "shrinkText", insets: 0,
  };
  return shape;
}

function rect(slide, name, x, y, w, h, color) {
  slide.shapes.add({
    geometry: "rect", name, position: { left: x, top: y, width: w, height: h },
    fill: color, line: { style: "solid", fill: "none", width: 0 },
  });
}

function base(title, number) {
  const slide = presentation.slides.add();
  slide.background.fill = C.canvas;
  text(slide, "deck-label", "NGO CONNECT  /  PROJECT REVIEW", 72, 30, 700, 28, 14, C.teal, true);
  text(slide, "slide-title", title, 72, 78, 1120, 72, 44, C.ink, true);
  rect(slide, "title-rule", 72, 158, 64, 4, C.teal);
  text(slide, "page-number", String(number).padStart(2, "0"), 1134, 660, 74, 24, 14, C.muted, true, "right");
  return slide;
}

function block(slide, label, content, x, y, width) {
  text(slide, `${label}-label`, label.toUpperCase(), x, y, width, 28, 16, C.teal, true);
  text(slide, `${label}-content`, content, x, y + 38, width, 134, 24, C.text);
}

// 1. Cover
let slide = presentation.slides.add();
slide.background.fill = C.ink;
text(slide, "cover-kicker", "COMMUNITY OPERATIONS PLATFORM", 88, 90, 900, 34, 17, "#B8D8D2", true);
text(slide, "cover-title", "NGO Connect", 88, 170, 1040, 104, 68, C.white, true);
rect(slide, "cover-rule", 88, 294, 98, 6, "#74B5A8");
text(slide, "cover-subtitle", "Event management, volunteer registration, and attendance", 88, 330, 1060, 90, 30, "#E7F1EF");
text(slide, "cover-meta", "Project report and implementation review  |  16 November 2026", 88, 590, 1060, 34, 16, "#C7D9D6");
slide.speakerNotes.text = "The prototype supports Volunteer and NGO Admin workflows. Team-member login is outside this version.";

// 2. Project scope
slide = base("Project scope", 2);
block(slide, "Purpose", "Give NGO Admins one place to manage events and give volunteers a clear path to discover, register, and check in.", 72, 210, 520);
block(slide, "Current capabilities", "Volunteer signup and login\nEvent creation and updates\nCapacity-aware registration\nQR attendance and reports", 650, 210, 540);
text(slide, "boundary-label", "PROTOTYPE BOUNDARY", 72, 475, 400, 28, 16, C.teal, true);
text(slide, "boundary-text", "Only Volunteer and NGO Admin accounts are active. Team-member accounts, assignment screens, donations, and payments are not implemented.", 72, 510, 1100, 86, 22, C.muted);
slide.speakerNotes.text = "Do not present team-member login as available. Admin accounts are created through a backend setup command.";

// 3. Roles
slide = base("Two roles, two workflows", 3);
text(slide, "volunteer-heading", "VOLUNTEER", 72, 205, 500, 38, 22, C.teal, true);
text(slide, "volunteer-flow", "01   Create an account and sign in\n02   Browse live events\n03   Register while capacity remains\n04   Scan the current event QR at the venue", 72, 253, 525, 280, 25);
rect(slide, "column-divider", 620, 207, 2, 340, C.line);
text(slide, "admin-heading", "NGO ADMIN", 680, 205, 500, 38, 22, C.teal, true);
text(slide, "admin-flow", "01   Sign in with a provisioned account\n02   Create and publish events\n03   Generate or replace attendance QR\n04   Review registrations and attendance", 680, 253, 525, 280, 25);
slide.speakerNotes.text = "The server enforces each role. Public signup always creates a volunteer. Admins are provisioned by the operator.";

// 4. Architecture
slide = base("Application architecture", 4);
text(slide, "frontend-step", "01", 72, 230, 80, 60, 32, C.teal, true);
text(slide, "frontend-name", "React + Vite", 72, 300, 340, 52, 30, C.ink, true);
text(slide, "frontend-desc", "Pages, forms, navigation, and QR scanning.\nLocal port: 5173", 72, 360, 330, 100, 21, C.muted);
rect(slide, "divider-1", 440, 225, 2, 250, C.line);
text(slide, "api-step", "02", 482, 230, 80, 60, 32, C.teal, true);
text(slide, "api-name", "Express API", 482, 300, 350, 52, 30, C.ink, true);
text(slide, "api-desc", "Validation, role checks, business rules, and JSON responses.\nLocal port: 5000", 482, 360, 350, 105, 21, C.muted);
rect(slide, "divider-2", 865, 225, 2, 250, C.line);
text(slide, "db-step", "03", 910, 230, 80, 60, 32, C.teal, true);
text(slide, "database-name", "PostgreSQL", 910, 300, 310, 52, 30, C.ink, true);
text(slide, "database-desc", "Persistent users, events, registrations, and attendance.\nLocal port: 5432", 910, 360, 310, 110, 21, C.muted);
slide.speakerNotes.text = "All three local components need to be running and configured. The frontend calls the backend, and the backend connects to PostgreSQL.";

// 5. Data model
slide = base("Data model", 5);
text(slide, "users-title", "USERS", 72, 218, 300, 42, 24, C.teal, true);
text(slide, "users-body", "Name, unique email, password hash, role\nRoles: volunteer or ngo_admin", 72, 275, 330, 118, 22);
rect(slide, "model-divider-1", 440, 218, 2, 270, C.line);
text(slide, "events-title", "EVENTS", 482, 218, 300, 42, 24, C.teal, true);
text(slide, "events-body", "Owner, event details, capacity\nStatus: draft, live, or closed\nCurrent QR token", 482, 275, 340, 154, 22);
rect(slide, "model-divider-2", 865, 218, 2, 270, C.line);
text(slide, "registrations-title", "REGISTRATIONS", 910, 218, 330, 42, 24, C.teal, true);
text(slide, "registrations-body", "Event and volunteer references\nAttendance flag and check-in time\nOne registration per event and volunteer", 910, 275, 320, 174, 22);
text(slide, "integrity-note", "Foreign keys and unique constraints protect relationships and prevent duplicate registrations.", 72, 540, 1100, 52, 21, C.muted);
slide.speakerNotes.text = "The schema is in Backend/db/schema.sql. server.js applies it after a successful database connection.";

// 6. Security
slide = base("Authentication and access", 6);
block(slide, "Passwords", "bcrypt hashes are stored. The API does not store plaintext passwords.", 72, 205, 520);
block(slide, "Sessions", "The browser receives an HTTP-only cookie. The backend verifies the signed token and reloads the account.", 650, 205, 540);
block(slide, "Authorization", "Protected routes check user role and event ownership before returning or changing data.", 72, 392, 520);
block(slide, "Request safety", "Login and signup are rate limited. Helmet adds headers. CORS restricts the browser origin.", 650, 392, 540);
slide.speakerNotes.text = "These are implemented controls, not a security certification. Production requires HTTPS and matching cookie origins.";

// 7. Event lifecycle
slide = base("Event lifecycle", 7);
text(slide, "draft-label", "DRAFT", 72, 240, 260, 48, 30, C.ink, true);
text(slide, "draft-copy", "Admin creates event details\nRegistration remains closed", 72, 300, 300, 100, 22, C.muted);
rect(slide, "life-divider-1", 420, 240, 2, 170, C.line);
text(slide, "live-label", "LIVE", 480, 240, 260, 48, 30, C.teal, true);
text(slide, "live-copy", "Volunteers can register\nCapacity is enforced by API", 480, 300, 300, 100, 22, C.muted);
rect(slide, "life-divider-2", 830, 240, 2, 170, C.line);
text(slide, "closed-label", "CLOSED", 890, 240, 260, 48, 30, C.ink, true);
text(slide, "closed-copy", "New registrations stop\nPast attendance remains reviewable", 890, 300, 320, 110, 22, C.muted);
text(slide, "qr-note", "QR regeneration replaces the stored token, so an earlier QR can no longer check in volunteers.", 72, 510, 1100, 70, 22, C.text);
slide.speakerNotes.text = "Registration and check-in logic use database transactions. The server validates QR codes rather than trusting the browser.";

// 8. API surface
slide = base("API surface", 8);
const apiRows = [
  ["/api/auth", "Signup, login, session lookup, logout"],
  ["/api/events", "List, create, update, QR generation, registration"],
  ["/api/registrations", "Role-scoped registration records"],
  ["/api/events/:id/registrations", "Event registrations for its NGO Admin"],
  ["/api/events/:id/attendance", "Validate QR and record volunteer check-in"],
  ["/api/health/database", "Database connectivity check"],
];
let y = 192;
for (const [route, purpose] of apiRows) {
  text(slide, `route-${y}`, route, 72, y, 430, 36, 20, C.teal, true);
  text(slide, `purpose-${y}`, purpose, 520, y, 650, 36, 22, C.text);
  rect(slide, `row-rule-${y}`, 72, y + 45, 1090, 1, C.line);
  y += 70;
}
slide.speakerNotes.text = "The frontend API client is in frontend/src/services/api.js. Route logic is in Backend/app.js.";

// 9. Verification
slide = base("Verification results", 9);
text(slide, "passed-label", "PASSED", 72, 205, 300, 38, 22, C.teal, true);
text(slide, "passed-items", "Frontend production build\nFrontend lint\nBackend JavaScript syntax checks\nAPI integration suite", 72, 258, 520, 220, 25, C.text);
rect(slide, "verification-divider", 620, 205, 2, 310, C.line);
text(slide, "pending-label", "NOT VERIFIED", 680, 205, 400, 38, 22, C.ink, true);
text(slide, "pending-items", "Live PostgreSQL connection\nAdmin provisioning against a live database\nFull browser-to-database walkthrough", 680, 258, 500, 205, 25, C.text);
text(slide, "test-note", "The API suite passed with pg-mem, an in-memory PostgreSQL-compatible test database.", 72, 535, 1090, 58, 21, C.muted);
slide.speakerNotes.text = "Be precise: tests passed against pg-mem. Local configuration still needs a real PostgreSQL connection test.";

// 10. Run and next steps
slide = base("Run and next steps", 10);
text(slide, "run-label", "LOCAL RUN", 72, 205, 330, 36, 22, C.teal, true);
text(slide, "run-steps", "1   Start PostgreSQL and configure Backend/.env\n2   In Backend, run npm run dev\n3   In frontend, run npm run dev\n4   Open localhost:5173", 72, 258, 590, 210, 23, C.text);
rect(slide, "next-divider", 700, 205, 2, 300, C.line);
text(slide, "next-label", "BEFORE A LIVE DEMO", 752, 205, 430, 36, 22, C.teal, true);
text(slide, "next-steps", "Connect and verify PostgreSQL\nCreate the first NGO Admin\nTest signup, registration, QR check-in, and reports end to end", 752, 258, 440, 210, 23, C.text);
text(slide, "closing-line", "Current prototype: Volunteer and NGO Admin. Team-member login is a future scope item.", 72, 545, 1100, 52, 21, C.ink, true);
slide.speakerNotes.text = "Admin provisioning succeeds only after the backend connects to PostgreSQL and the schema exists.";

await fs.mkdir(PREVIEWS, { recursive: true });
const candidate = path.join(BUILD, "ngo-connect-candidate.pptx");
for (const [index, item] of presentation.slides.items.entries()) {
  const blob = await presentation.export({ slide: item, format: "png", scale: 1 });
  await fs.writeFile(path.join(PREVIEWS, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await blob.arrayBuffer()));
}
const montage = await presentation.export({ format: "png", montage: true });
await fs.writeFile(path.join(PREVIEWS, "montage.png"), new Uint8Array(await montage.arrayBuffer()));
await (await PresentationFile.exportPptx(presentation)).save(candidate);
console.log(JSON.stringify({ candidate, slides: presentation.slides.items.length, previews: PREVIEWS }));
