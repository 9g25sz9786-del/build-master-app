import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Puppeteer + a real headless Chromium binary can't run on the Edge runtime, and shouldn't be
// bundled by webpack (see next.config.mjs -> serverComponentsExternalPackages).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Server-side PDF generation (spinning up Chromium, loading the report, waiting for charts/fonts)
// reliably takes longer than the platform's default function timeout — raise it here.
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Reuse the same auth check as the report page itself before we ever spin up a browser.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();
  if (error || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const targetUrl = `${origin}/projects/${id}/full-report`;
  const incomingCookies = request.cookies.getAll();

  const [{ default: chromium }, puppeteer] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: { width: 1240, height: 1754 },
  });

  try {
    const page = await browser.newPage();

    // Forward the same session cookies this request arrived with, so the headless tab is
    // authenticated as the same user and sees the same data — no separate login flow needed.
    if (incomingCookies.length > 0) {
      await page.setCookie(
        ...incomingCookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: request.nextUrl.hostname,
          path: "/",
        }))
      );
    }

    // Force print styling (the same @media print rules the "Print" button already uses),
    // but here WE control every option — no OS print dialog, no per-browser margin/scale
    // defaults to drift between machines.
    await page.emulateMediaType("print");
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 45000 });

    // Give client-only pieces (chart SVGs measured via ResizeObserver, webfonts) a moment to
    // finish painting before we snapshot the page — these render correctly here specifically
    // because this is a real, measured browser tab, not a static server-side re-render.
    await page.waitForSelector(".chart-cols svg", { timeout: 8000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 400));

    // preferCSSPageSize makes Chromium honour the report's own @page { size: A4; margin: ... }
    // rules exactly, instead of substituting its own default format/margins.
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });

    const safeName = (project.name || "feasibility-report").replace(/[^a-z0-9-_ ]/gi, "").trim() || "feasibility-report";

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Could not generate the PDF." }, { status: 500 });
  } finally {
    await browser.close();
  }
}
