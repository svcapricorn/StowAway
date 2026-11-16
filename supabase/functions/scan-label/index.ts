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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { imageData } = await req.json();
    if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
      return Response.json({ error: "imageData must be a data URL" }, { status: 400, headers: cors });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You read product packaging on a boat's inventory (medical kit, tools, spares, provisions). " +
              "Transcribe the label exactly, then fill fields ONLY from what is visible. Never guess dates or lot numbers. " +
              "Name = brand + product as printed (not a generic guess). Leave unknown fields empty.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this item and extract its label details." },
              { type: "image_url", image_url: { url: imageData } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "record_item" } },
      }),
    });

    if (r.status === 429) return Response.json({ error: "Rate limited, try again shortly." }, { status: 429, headers: cors });
    if (r.status === 402) return Response.json({ error: "AI credits exhausted." }, { status: 402, headers: cors });
    if (!r.ok) throw new Error(`gateway ${r.status}: ${await r.text()}`);

    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const item = args ? JSON.parse(args) : { found: false };
    if (item.barcode) item.barcode = String(item.barcode).replace(/\D/g, "") || undefined;
    if (!CATEGORIES.includes(item.category)) item.category = "other";
    return Response.json(item, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "scan failed" }, { status: 500, headers: cors });
  }
});
