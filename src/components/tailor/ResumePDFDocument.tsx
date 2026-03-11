import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { Styles } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    color: "#111",
    lineHeight: 1.5,
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  contactLine: { fontSize: 9, color: "#555", marginBottom: 16 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingBottom: 2,
    textTransform: "uppercase",
  },
  bullet: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 12, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  paragraph: { marginBottom: 4, fontSize: 10 },
  bold: { fontFamily: "Helvetica-Bold" },
  link: { color: "#2563eb", textDecoration: "underline" },
});

type Line =
  | { type: "h1" | "h2" | "h3" | "paragraph"; text: string }
  | { type: "bullet"; text: string };

type Span =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; url: string };

function parseInline(raw: string): Span[] {
  const spans: Span[] = [];
  // Match **bold** or [text](url) — whichever comes first
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) {
      spans.push({ kind: "text", text: raw.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      // bold: **text**
      spans.push({ kind: "bold", text: match[1] });
    } else {
      // link: [text](url)
      spans.push({ kind: "link", text: match[2], url: match[3] });
    }
    last = match.index + match[0].length;
  }

  if (last < raw.length) spans.push({ kind: "text", text: raw.slice(last) });
  return spans.length > 0 ? spans : [{ kind: "text", text: raw }];
}

function InlineText({ text, baseStyle }: { text: string; baseStyle: Styles[string] }) {
  const spans = parseInline(text);
  if (spans.length === 1 && spans[0].kind === "text") {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return (
    <Text style={baseStyle}>
      {spans.map((span, i) => {
        if (span.kind === "bold") return <Text key={i} style={styles.bold}>{span.text}</Text>;
        if (span.kind === "link") return <Link key={i} src={span.url} style={styles.link}>{span.text}</Link>;
        return <Text key={i}>{span.text}</Text>;
      })}
    </Text>
  );
}

function parseMarkdown(markdown: string): Line[] {
  return markdown
    .split("\n")
    .map((line): Line | null => {
      if (line.startsWith("# ")) return { type: "h1", text: line.slice(2).trim() };
      if (line.startsWith("## ")) return { type: "h2", text: line.slice(3).trim() };
      if (line.startsWith("### ")) return { type: "h3", text: line.slice(4).trim() };
      if (line.startsWith("- ") || line.startsWith("* "))
        return { type: "bullet", text: line.slice(2).trim() };
      if (line.trim()) return { type: "paragraph", text: line.trim() };
      return null;
    })
    .filter((l): l is Line => l !== null);
}

export function ResumePDFDocument({ markdown }: { markdown: string }) {
  const lines = parseMarkdown(markdown);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {lines.map((line, i) => {
          if (line.type === "h1")
            return <Text key={i} style={styles.name}>{line.text}</Text>;
          if (line.type === "h2")
            return <Text key={i} style={styles.sectionHeader}>{line.text}</Text>;
          if (line.type === "h3")
            return <InlineText key={i} text={line.text} baseStyle={{ ...styles.paragraph, ...styles.bold }} />;
          if (line.type === "bullet")
            return (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <InlineText text={line.text} baseStyle={styles.bulletText} />
              </View>
            );
          return <InlineText key={i} text={line.text} baseStyle={styles.paragraph} />;
        })}
      </Page>
    </Document>
  );
}
