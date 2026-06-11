"use server";

import type { PlanExportPayload } from "@/modules/weekly-plan/types";
import type { Worksheet } from "exceljs";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function dayOfWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function dateHeader(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function dayName(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function monthName(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function monthKey(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} ${d.getFullYear()}`;
}

function locationShort(value: string | null): string {
  if (!value) return "\u2014";
  const map: Record<string, string> = { OFFICE: "OFC", WFH: "WFH", LEAVE: "LV", HOLIDAY: "HD" };
  return map[value] ?? value;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ─── CSV ────────────────────────────────────────────────────────────────────────

function generateCsv(payload: PlanExportPayload): Uint8Array {
  const lines: string[] = [];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  if (payload.viewMode === "weekly" && payload.pivotData?.length && payload.pivotData[0]?.days.length) {
    const days = payload.pivotData[0].days;
    const headers = ["Employee", ...days.flatMap((d) => [`${dateHeader(d.iso)} Plan`, `${dateHeader(d.iso)} Actual`])];
    lines.push(headers.join(","));
    for (const row of payload.pivotData) {
      const vals = [esc(row.name), ...row.days.flatMap((d) => [esc(locationShort(d.planned)), esc(locationShort(d.actualLocation))])];
      lines.push(vals.join(","));
    }
  } else {
    const rows = payload.rows ?? [];
    lines.push(["Employee", "Date", "Day", "Location", "Project"].join(","));
    for (const r of rows) {
      lines.push([esc(r.user_name ?? r.user_id), esc(r.date), esc(dayName(r.date)), esc(locationShort(r.work_location)), esc(r.project ?? "")].join(","));
    }
  }

  return new TextEncoder().encode("\uFEFF" + lines.join("\n"));
}

// ─── XLSX (ExcelJS) ─────────────────────────────────────────────────────────────

async function generateXlsx(payload: PlanExportPayload): Promise<Uint8Array> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "KL HRMS";

  const H_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1F4E78" } };
  const H_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const BDR = {
    top: { style: "thin" as const, color: { argb: "FFD9E2EC" } },
    left: { style: "thin" as const, color: { argb: "FFD9E2EC" } },
    bottom: { style: "thin" as const, color: { argb: "FFD9E2EC" } },
    right: { style: "thin" as const, color: { argb: "FFD9E2EC" } },
  };
  const ALT_ROW = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF9FAFB" } };
  const EMP_FONT = { bold: true, size: 10, color: { argb: "FF1D1D1F" } };
  const CELL_FONT = { size: 10, color: { argb: "FF6B7280" } };

  function styleHeader(ws: Worksheet, row: number, colCount: number) {
    for (let c = 1; c <= colCount; c++) {
      const cell = ws.getCell(row, c);
      cell.fill = H_FILL;
      cell.font = H_FONT;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = BDR;
    }
    ws.getRow(row).height = 28;
  }

  function styleCell(ws: Worksheet, row: number, col: number, opts?: { bold?: boolean; align?: "left" | "center" }) {
    const cell = ws.getCell(row, col);
    cell.font = opts?.bold ? EMP_FONT : CELL_FONT;
    cell.alignment = { horizontal: opts?.align ?? "center", vertical: "middle" };
    cell.border = BDR;
    if (row % 2 === 0) cell.fill = ALT_ROW;
  }

  // ─── SUMMARY SHEET ────────────────────────────────────────────────────────
  if (payload.viewMode === "monthly" && payload.rows?.length) {
    const rows = payload.rows;
    const byEmployee = new Map<string, Map<string, number>>();
    const monthSet = new Set<string>();

    for (const r of rows) {
      const mk = monthKey(r.date);
      monthSet.add(mk);
      if (!byEmployee.has(r.user_id)) byEmployee.set(r.user_id, new Map());
      const empMonths = byEmployee.get(r.user_id)!;
      empMonths.set(mk, (empMonths.get(mk) ?? 0) + 1);
    }

    const months = Array.from(monthSet).sort((a, b) => {
      const da = new Date(a.replace(" ", " 1 "));
      const db = new Date(b.replace(" ", " 1 "));
      return da.getTime() - db.getTime();
    });
    const employees = Array.from(byEmployee.entries())
      .map(([id, m]) => ({ id, name: rows.find((r) => r.user_id === id)?.user_name ?? id, months: m }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const sumWs = wb.addWorksheet("SUMMARY", { properties: { tabColor: { argb: "FF1F4E78" } } });
    const totalCols = 2 + months.length + 1;

    sumWs.mergeCells(1, 1, 1, totalCols);
    const titleCell = sumWs.getCell(1, 1);
    titleCell.value = payload.title ?? "Plan Summary";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1D1D1F" } };
    titleCell.alignment = { horizontal: "center" };

    sumWs.getRow(1).height = 32;

    sumWs.getCell(2, 1).value = "";
    sumWs.getCell(2, 2).value = "Employee";
    months.forEach((m, i) => { sumWs.getCell(2, 3 + i).value = m; });
    sumWs.getCell(2, totalCols).value = "Grand Total";
    styleHeader(sumWs, 2, totalCols);

    let r = 3;
    for (const emp of employees) {
      sumWs.getCell(r, 1).value = "";
      sumWs.getCell(r, 2).value = emp.name;
      let grand = 0;
      months.forEach((m, i) => {
        const val = emp.months.get(m) ?? 0;
        grand += val;
        sumWs.getCell(r, 3 + i).value = val;
      });
      sumWs.getCell(r, totalCols).value = grand;
      sumWs.getCell(r, totalCols).font = { bold: true, size: 10, color: { argb: "FF1F4E78" } };
      for (let c = 1; c <= totalCols; c++) styleCell(sumWs, r, c, { bold: c === 2, align: c <= 2 ? "left" : "center" });
      sumWs.getRow(r).height = 22;
      r++;
    }

    sumWs.getColumn(1).width = 4;
    sumWs.getColumn(2).width = 30;
    for (let c = 3; c <= totalCols; c++) sumWs.getColumn(c).width = 16;

    // ─── PER-MONTH SHEETS ───────────────────────────────────────────────────
    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      const mk = monthKey(r.date);
      if (!grouped.has(mk)) grouped.set(mk, []);
      grouped.get(mk)!.push(r);
    }

    for (const [mk, monthRows] of grouped) {
      const sheetName = mk.length > 31 ? mk.slice(0, 31) : mk;
      const ws = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: "FF0D9488" } } });

      ws.mergeCells(1, 1, 1, 5);
      ws.getCell(1, 1).value = `${payload.title ?? "Plan Export"} — ${mk}`;
      ws.getCell(1, 1).font = { bold: true, size: 13, color: { argb: "FF1D1D1F" } };
      ws.getCell(1, 1).alignment = { horizontal: "center" };
      ws.getRow(1).height = 30;

      const headers = ["Employee", "Date", "Day", "Location", "Project"];
      headers.forEach((h, i) => { ws.getCell(2, i + 1).value = h; });
      styleHeader(ws, 2, 5);

      const sorted = [...monthRows].sort((a, b) => {
        if (a.user_name !== b.user_name) return (a.user_name ?? "").localeCompare(b.user_name ?? "");
        return a.date.localeCompare(b.date);
      });

      let dr = 3;
      for (const row of sorted) {
        ws.getCell(dr, 1).value = row.user_name ?? row.user_id;
        ws.getCell(dr, 2).value = row.date;
        ws.getCell(dr, 3).value = dayName(row.date);
        ws.getCell(dr, 4).value = locationShort(row.work_location);
        ws.getCell(dr, 5).value = row.project ?? "";
        for (let c = 1; c <= 5; c++) styleCell(ws, dr, c, { bold: c === 1, align: c === 1 ? "left" : "center" });
        ws.getRow(dr).height = 22;
        dr++;
      }

      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 16;
      ws.getColumn(3).width = 14;
      ws.getColumn(4).width = 14;
      ws.getColumn(5).width = 36;
    }
  } else {
    // ─── WEEKLY / MONTHLY PIVOT SINGLE SHEET ────────────────────────────────
    const ws = wb.addWorksheet("Plan Export", { properties: { tabColor: { argb: "FF1F4E78" } } });

    if (payload.pivotData?.length) {
      const days = payload.pivotData[0].days;
      const colCount = 2 + days.length; // Employee, Type, and days columns

      ws.mergeCells(1, 1, 1, colCount);
      ws.getCell(1, 1).value = payload.title ?? "Plan Export";
      ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF1D1D1F" } };
      if (payload.periodLabel) {
        ws.mergeCells(2, 1, 2, colCount);
        ws.getCell(2, 1).value = payload.periodLabel;
        ws.getCell(2, 1).font = { size: 11, color: { argb: "FF6B7280" } };
      }
      const startRow = payload.periodLabel ? 3 : 2;

      ws.getCell(startRow, 1).value = "Employee";
      ws.getCell(startRow, 2).value = "Type";
      let c = 3;
      for (const d of days) {
        ws.getCell(startRow, c++).value = `${dateHeader(d.iso)} (${dayOfWeek(d.iso)})`;
      }
      styleHeader(ws, startRow, colCount);
      ws.getCell(startRow, 1).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      ws.getCell(startRow, 2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      let r = startRow + 1;
      let empIndex = 0;
      for (const row of payload.pivotData) {
        const isAlt = empIndex % 2 === 1;

        // Row r: Planned values
        ws.getCell(r, 1).value = row.name;
        ws.getCell(r, 2).value = "Planned";
        c = 3;
        for (const d of row.days) {
          ws.getCell(r, c++).value = locationShort(d.planned);
        }

        // Row r+1: Actual values
        ws.getCell(r + 1, 1).value = ""; // Will be merged
        ws.getCell(r + 1, 2).value = "Actual";
        c = 3;
        for (const d of row.days) {
          ws.getCell(r + 1, c++).value = locationShort(d.actualLocation);
        }

        // Merge Employee column vertically
        ws.mergeCells(r, 1, r + 1, 1);

        // Apply styles and background fills for both rows
        for (let col = 1; col <= colCount; col++) {
          const cell1 = ws.getCell(r, col);
          cell1.font = col === 1 ? EMP_FONT : (col === 2 ? { bold: true, size: 10, color: { argb: "FF475569" } } : CELL_FONT);
          cell1.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
          cell1.border = BDR;
          if (isAlt) cell1.fill = ALT_ROW;

          const cell2 = ws.getCell(r + 1, col);
          cell2.font = col === 1 ? EMP_FONT : (col === 2 ? { bold: true, size: 10, color: { argb: "FF475569" } } : CELL_FONT);
          cell2.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
          cell2.border = BDR;
          if (isAlt) cell2.fill = ALT_ROW;
        }

        ws.getRow(r).height = 22;
        ws.getRow(r + 1).height = 22;
        r += 2;
        empIndex++;
      }

      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 12;
      for (let col = 3; col <= colCount; col++) ws.getColumn(col).width = 16;
    } else {
      const rows = payload.rows ?? [];
      const headers = ["Employee", "Date", "Day", "Location", "Project"];
      headers.forEach((h, i) => { ws.getCell(1, i + 1).value = h; });
      styleHeader(ws, 1, 5);
      let r = 2;
      for (const row of rows) {
        ws.getCell(r, 1).value = row.user_name ?? row.user_id;
        ws.getCell(r, 2).value = row.date;
        ws.getCell(r, 3).value = dayName(row.date);
        ws.getCell(r, 4).value = locationShort(row.work_location);
        ws.getCell(r, 5).value = row.project ?? "";
        for (let c = 1; c <= 5; c++) styleCell(ws, r, c, { bold: c === 1, align: c === 1 ? "left" : "center" });
        ws.getRow(r).height = 22;
        r++;
      }
      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 16;
      ws.getColumn(3).width = 14;
      ws.getColumn(4).width = 14;
      ws.getColumn(5).width = 36;
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

// ─── PDF (pdf-lib) ─────────────────────────────────────────────────────────────

async function generatePdf(payload: PlanExportPayload): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 40;
  const PAGE_W = 842;
  const PAGE_H = 595;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const HEADER_BG = [0.12, 0.31, 0.47];
  const WHITE = [1, 1, 1];
  const TEXT = [0.11, 0.11, 0.12];
  const GRAY = [0.6, 0.6, 0.6];
  const BORDER_C = [0.85, 0.89, 0.93];
  const ALT_BG = [0.98, 0.98, 0.99];
  const RED_BG = [1, 0.96, 0.96];

  const BADGE: Record<string, { bg: number[]; fg: number[] }> = {
    OFFICE: { bg: [0.91, 0.96, 0.95], fg: [0.05, 0.58, 0.53] },
    WFH: { bg: [0.92, 0.95, 0.99], fg: [0.23, 0.51, 0.96] },
    LEAVE: { bg: [0.99, 0.96, 0.91], fg: [0.96, 0.62, 0.04] },
    HOLIDAY: { bg: [0.94, 0.92, 0.99], fg: [0.55, 0.36, 0.96] },
  };

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function ensureSpace(needed: number) {
    if (y - needed < 50) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  }

  function drawRect(x: number, ry: number, w: number, h: number, color: number[]) {
    page.drawRectangle({ x, y: ry - h, width: w, height: h, color: rgb(color[0]!, color[1]!, color[2]!) });
  }

  function drawBorder(x: number, ry: number, w: number, h: number) {
    page.drawRectangle({ x, y: ry - h, width: w, height: h, borderColor: rgb(BORDER_C[0]!, BORDER_C[1]!, BORDER_C[2]!), borderWidth: 0.5 });
  }

  function drawBadge(x: number, ry: number, w: number, value: string | null) {
    const label = locationShort(value ?? "");
    if (!value) { drawDash(x, ry, w); return; }

    const badge = BADGE[value];
    const tw = boldFont.widthOfTextAtSize(label, 8);
    const textX = x + (w - tw) / 2;
    page.drawText(label, {
      x: textX,
      y: ry - 11 + 8 * 0.35,
      size: 8,
      font: boldFont,
      color: rgb(badge ? badge.fg[0]! : GRAY[0]!, badge ? badge.fg[1]! : GRAY[1]!, badge ? badge.fg[2]! : GRAY[2]!)
    });
  }

  function drawDash(x: number, ry: number, w: number) {
    const tw = font.widthOfTextAtSize("\u2014", 8);
    const cellH = 22;
    page.drawText("\u2014", { x: x + (w - tw) / 2, y: ry - cellH / 2 + 8 * 0.35, size: 8, font, color: rgb(GRAY[0]!, GRAY[1]!, GRAY[2]!) });
  }

  // ─── TITLE ──────────────────────────────────────────────────────────────────
  page.drawText(payload.title ?? "Plan Export", { x: MARGIN, y: y - 7, size: 16, font: boldFont, color: rgb(TEXT[0]!, TEXT[1]!, TEXT[2]!) });
  y -= 22;
  if (payload.periodLabel) {
    page.drawText(payload.periodLabel, { x: MARGIN, y: y - 8, size: 11, font, color: rgb(0.42, 0.45, 0.50) });
    y -= 22;
  }

  // ─── WEEKLY / MONTHLY PIVOT TABLE ───────────────────────────────────────────
  if ((payload.viewMode === "weekly" || payload.viewMode === "monthly_pivot") && payload.pivotData?.length) {
    const days = payload.pivotData[0].days;
    const DAY_W = Math.min(110, Math.floor((CONTENT_W - 170) / days.length));
    const EMP_W = CONTENT_W - DAY_W * days.length;
    const ROW_H = 22;
    const HEADER_H = 30;

    function drawTableHeader() {
      drawRect(MARGIN, y, CONTENT_W, HEADER_H, HEADER_BG);
      
      // employee column header
      page.drawText("EMPLOYEE", { x: MARGIN + 12, y: y - 18, size: 9, font: boldFont, color: rgb(1, 1, 1) });
      
      // type column header
      const tW = boldFont.widthOfTextAtSize("TYPE", 8);
      page.drawText("TYPE", { x: MARGIN + EMP_W - 60 + (60 - tW) / 2, y: y - 18, size: 8, font: boldFont, color: rgb(1, 1, 1) });

      for (let i = 0; i < days.length; i++) {
        const cx = MARGIN + EMP_W + i * DAY_W;
        const d = days[i]!;
        const dayLabel = dayOfWeek(d.iso);
        const dateLabel = dateHeader(d.iso);
        const isToday = new Date().toISOString().slice(0, 10) === d.iso;
        const tc = isToday ? [0.12, 0.31, 0.47] : [1, 1, 1];
        const dc = isToday ? [0.6, 0.8, 1] : [0.75, 0.78, 0.82];

        const dateW = boldFont.widthOfTextAtSize(dateLabel, DAY_W < 45 ? 6 : 8);
        const dayW = font.widthOfTextAtSize(dayLabel, DAY_W < 45 ? 5 : 7);

        page.drawText(dateLabel, {
          x: cx + (DAY_W - dateW) / 2,
          y: y - (DAY_W < 45 ? 12 : 10),
          size: DAY_W < 45 ? 6 : 8,
          font: boldFont,
          color: rgb(tc[0]!, tc[1]!, tc[2]!)
        });
        page.drawText(dayLabel, {
          x: cx + (DAY_W - dayW) / 2,
          y: y - (DAY_W < 45 ? 22 : 24),
          size: DAY_W < 45 ? 5 : 7,
          font,
          color: rgb(dc[0]!, dc[1]!, dc[2]!)
        });
      }
      y -= HEADER_H;
    }

    function ensureSpaceWithHeader(needed: number) {
      if (y - needed < 50) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        drawTableHeader();
      }
    }

    // Draw initial table header
    ensureSpaceWithHeader(HEADER_H + ROW_H * 2 + 10);
    drawTableHeader();

    // ── Employee rows ──
    const empColX = MARGIN;
    const dayColStart = MARGIN + EMP_W;

    for (let ei = 0; ei < payload.pivotData.length; ei++) {
      const emp = payload.pivotData[ei]!;
      const employeeHeight = ROW_H * 2;
      ensureSpaceWithHeader(employeeHeight + 4);

      const rowBg = ei % 2 === 1 ? ALT_BG : WHITE;
      const hasMismatch = emp.days.some((d) => {
        if (!d.planned || !d.actualLocation) return false;
        return d.planned !== d.actualLocation && d.actualLocation !== null;
      });
      const empBg = hasMismatch ? RED_BG : rowBg;

      // ── Employee cell (spans 2 rows, height 44, no avatar badge) ──
      drawRect(empColX, y, EMP_W - 60, employeeHeight, empBg);
      drawBorder(empColX, y, EMP_W - 60, employeeHeight);

      // Name & Dept (centered vertically inside height 44)
      page.drawText(emp.name, { x: empColX + 12, y: y - 18, size: 9, font: boldFont, color: rgb(TEXT[0]!, TEXT[1]!, TEXT[2]!) });
      page.drawText("No Dept", { x: empColX + 12, y: y - 30, size: 7, font, color: rgb(GRAY[0]!, GRAY[1]!, GRAY[2]!) });

      // ── Type column (Row 1: Planned, Row 2: Actual) ──
      // Row 1 (Planned)
      drawRect(empColX + EMP_W - 60, y, 60, ROW_H, empBg);
      drawBorder(empColX + EMP_W - 60, y, 60, ROW_H);
      const pW = boldFont.widthOfTextAtSize("Planned", 7);
      page.drawText("Planned", { x: empColX + EMP_W - 60 + (60 - pW) / 2, y: y - 13, size: 7, font: boldFont, color: rgb(0.28, 0.33, 0.41) });

      // Row 2 (Actual)
      drawRect(empColX + EMP_W - 60, y - ROW_H, 60, ROW_H, empBg);
      drawBorder(empColX + EMP_W - 60, y - ROW_H, 60, ROW_H);
      const aW = boldFont.widthOfTextAtSize("Actual", 7);
      page.drawText("Actual", { x: empColX + EMP_W - 60 + (60 - aW) / 2, y: y - ROW_H - 13, size: 7, font: boldFont, color: rgb(0.28, 0.33, 0.41) });

      // ── Plan row ──
      for (let di = 0; di < days.length; di++) {
        const cx = dayColStart + di * DAY_W;
        drawBorder(cx, y, DAY_W, ROW_H);
        drawRect(cx, y, DAY_W, ROW_H, empBg);
        if (emp.days[di]?.planned) {
          drawBadge(cx, y, DAY_W, emp.days[di]!.planned);
        } else {
          drawDash(cx, y, DAY_W);
        }
      }

      y -= ROW_H;

      // ── Actual row ──
      for (let di = 0; di < days.length; di++) {
        const cx = dayColStart + di * DAY_W;
        const d = emp.days[di]!;
        drawBorder(cx, y, DAY_W, ROW_H);
        drawRect(cx, y, DAY_W, ROW_H, empBg);

        const isFut = new Date(d.iso + "T00:00:00") > new Date(new Date().setHours(0, 0, 0, 0));
        if (isFut) {
          drawDash(cx, y, DAY_W);
        } else if (d.actualLocation) {
          drawBadge(cx, y, DAY_W, d.actualLocation);
        } else {
          drawDash(cx, y, DAY_W);
        }
      }

      y -= ROW_H;
    }
  }

  // ─── MONTHLY FLAT TABLE ─────────────────────────────────────────────────────
  else if (payload.rows?.length) {
    const COL_W = [180, 80, 80, 80, 180];
    const ROW_H = 20;
    const HEADER_H = 28;
    const headers = ["Employee", "Date", "Day", "Location", "Project"];

    ensureSpace(HEADER_H + ROW_H + 10);

    let cx = MARGIN;
    for (let i = 0; i < headers.length; i++) {
      drawRect(cx, y, COL_W[i]!, HEADER_H, HEADER_BG);
      page.drawText(headers[i]!, { x: cx + 4, y: y - 10, size: 9, font: boldFont, color: rgb(1, 1, 1) });
      cx += COL_W[i]!;
    }
    y -= HEADER_H;

    for (let ri = 0; ri < payload.rows.length; ri++) {
      const r = payload.rows[ri]!;
      ensureSpace(ROW_H + 4);

      const bg = ri % 2 === 0 ? WHITE : ALT_BG;
      const vals = [r.user_name ?? r.user_id, r.date, dayName(r.date), locationShort(r.work_location), r.project ?? ""];

      cx = MARGIN;
      for (let ci = 0; ci < vals.length; ci++) {
        drawRect(cx, y, COL_W[ci]!, ROW_H, bg);
        drawBorder(cx, y, COL_W[ci]!, ROW_H);
        page.drawText(vals[ci]!, { x: cx + 4, y: y - ROW_H / 2 + 8 * 0.35, size: 8, font: ci === 0 ? boldFont : font, color: rgb(TEXT[0]!, TEXT[1]!, TEXT[2]!) });
        cx += COL_W[ci]!;
      }
      y -= ROW_H;
    }
  }

  return await doc.save();
}

// ─── Main action ────────────────────────────────────────────────────────────────

export async function exportWeeklyPlanReportAction(params: {
  orgSlug: string;
  memberId: string;
  payload: PlanExportPayload;
}): Promise<Blob> {
  const { payload } = params;

  let data: Uint8Array;
  let mime: string;

  if (payload.format === "csv") {
    data = generateCsv(payload);
    mime = "text/csv; charset=utf-8";
  } else if (payload.format === "xlsx") {
    data = await generateXlsx(payload);
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    data = await generatePdf(payload);
    mime = "application/pdf";
  }

  return new Blob([data as BlobPart], { type: mime });
}
