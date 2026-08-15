import { BRANDING } from "@/lib/branding";

// Serves /llms.txt dynamically from the same BRANDING config that drives the
// rest of the site, so it always describes the *business* (not the internal
// software project) and always points at the real deployment domain. Replaces
// the old hand-written public/llms.txt, which referenced a wrong domain and
// leaked implementation/admin details.
//
// Note: Google ignores llms.txt; ChatGPT/Perplexity may read it opportunistically.
// We intentionally do NOT link /admin (private console) or deep-link /catalog's
// gated pricing — only public, citable context.
export const dynamic = "force-static";

export function GET(): Response {
  const {
    companyName,
    siteUrl,
    metaDescription,
    addressLine,
    contactPhone,
    contactEmail,
    areasServed,
    productTypes,
    foundedYear,
  } = BRANDING;

  const lines: string[] = [];

  lines.push(`# ${companyName}`);
  lines.push("");
  lines.push(`> ${metaDescription}`);
  lines.push("");

  lines.push("## About");
  const facts: string[] = [];
  if (foundedYear) facts.push(`Established ${foundedYear}.`);
  if (addressLine) facts.push(`Based in ${addressLine}.`);
  if (areasServed.length) facts.push(`Serving ${areasServed.join(", ")}.`);
  if (facts.length) lines.push(`- ${facts.join(" ")}`);
  if (productTypes.length) {
    lines.push(`- Product categories: ${productTypes.join(", ")}.`);
  }
  lines.push("");

  lines.push("## Pages");
  lines.push(`- [Home](${siteUrl}/): Company overview, product range, warranty, and contact details.`);
  lines.push(
    `- Sales Catalogue: live wholesale pricing and stock are available to verified B2B buyers on request via the contact details below.`,
  );
  lines.push("");

  const contact: string[] = [];
  if (contactPhone) contact.push(`- Phone/WhatsApp: ${contactPhone}`);
  if (contactEmail) contact.push(`- Email: ${contactEmail}`);
  if (contact.length) {
    lines.push("## Contact");
    lines.push(...contact);
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
