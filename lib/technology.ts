const base = [
  "◎ OpenAI",
  "✳ Claude",
  "☁ Google Cloud",
  "aws",
  "▦ Microsoft Azure",
  "♧ n8n",
  "ϟ Supabase",
  "▲ Vercel",
];
export function technologyFor(goal: number | null, selected: number[]) {
  if (goal === null && selected.length === 5)
    return {
      label: "Built with leading AI and cloud technologies",
      items: base,
    };
  const items = new Set<string>();
  if (selected.includes(0)) {
    items.add("◎ OpenAI");
    items.add("✳ Claude");
  }
  if (selected.includes(1)) {
    items.add("ϟ Supabase");
    items.add("▦ Microsoft Azure");
  }
  if (selected.includes(2)) items.add("Bitrix24 / your CRM");
  if (selected.includes(3)) items.add("♧ n8n / Make");
  if (selected.includes(4)) {
    items.add("React");
    items.add("▲ Vercel");
  }
  if (goal === 3) {
    items.add("Runway");
    items.add("Sora");
    items.add("ElevenLabs");
  }
  return {
    label:
      "Suggested technologies for your selected solution · confirmed during discovery",
    items: [...items],
  };
}
