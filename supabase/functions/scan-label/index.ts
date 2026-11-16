// Single-shot label reader: one vision call returns name, category, barcode
// digits and every form field visible on the packaging.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = ["first-aid", "medications", "tools", "emergency", "hygiene", "diagnostic", "ppe", "other"];

const tool = {
  type: "function",
  function: {
    name: "record_item",
    description: "Record the product shown in the photo.",
    parameters: {
      type: "object",
      properties: {
        found: { type: "boolean", description: "false if no product/label is visible" },
        name: { type: "string", description: "Product name as printed, e.g. 'Advil Ibuprofen Tablets'" },
        brand: { type: "string" },
        chemicalName: { type: "string", description: "Active ingredient(s)" },
        category: { type: "string", enum: CATEGORIES },
        strength: { type: "string", description: "e.g. 200 mg" },
        unitType: { type: "string", description: "pill, tablet, capsule, ml, g, piece..." },
        unitSize: { type: "string", description: "e.g. 100 count, 30 ml" },
        container: { type: "string", description: "bottle, box, tube, blister..." },
        expirationDate: { type: "string", description: "YYYY-MM-DD; if only month/year, use last day of month" },
        lotNumber: { type: "string" },
        barcode: { type: "string", description: "UPC/EAN digits printed under a barcode, digits only" },
        qrText: { type: "string", description: "Text of a QR code if legible" },
        rawText: { type: "string", description: "All legible label text, newline separated" },
        confidence: { type: "number", description: "0-1" },
      },
      required: ["found", "name", "category", "confidence"],
      additionalProperties: false,
    },
  },
};


// Strict schema: every property required, optional values nullable.
const props = tool.function.parameters.properties as Record<string, { type: string }>;
const strictSchema = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(props),
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) =>
    [k, ["found", "name", "category", "confidence"].includes(k) ? v : { ...v, type: [v.type, "null"] }])),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { imageData } = await req.json();
    if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
      return Response.json({ error: "imageData must be a data URL" }, { status: 400, headers: cors });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You read product packaging on a boat's inventory (medical kit, tools, spares, provisions). " +
          "Transcribe the label exactly, then fill fields ONLY from what is visible. Never guess dates or lot numbers. " +
          "Name = brand + product as printed (not a generic guess). Use null for unknown fields.",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Identify this item and extract its label details." },
            { type: "input_image", image_url: imageData },
          ],
        }],
        text: { format: { type: "json_schema", name: "record_item", strict: true, schema: strictSchema } },
      }),
    });

    if (r.status === 429) return Response.json({ error: "Rate limited, try again shortly." }, { status: 429, headers: cors });
    if (r.status === 402) return Response.json({ error: "AI credits exhausted." }, { status: 402, headers: cors });
    if (!r.ok || !r.body) throw new Error(`gateway ${r.status}: ${await r.text()}`);

    // Consume SSE stream, collecting output text deltas.
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          if (ev.type === "error" || ev.type === "response.failed") throw new Error(JSON.stringify(ev));
        } catch (e) { if (e instanceof Error && e.message.startsWith("{")) throw e; }
      }
    }
    const item = out ? JSON.parse(out) : { found: false };
    if (item.barcode) item.barcode = String(item.barcode).replace(/\D/g, "") || undefined;
    if (!CATEGORIES.includes(item.category)) item.category = "other";
    return Response.json(item, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "scan failed" }, { status: 500, headers: cors });
  }
});
