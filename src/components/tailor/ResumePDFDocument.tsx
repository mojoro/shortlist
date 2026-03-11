import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
});

type Line =
  | { type: "h1" | "h2" | "h3" | "paragraph"; text: string }
  | { type: "bullet"; text: string };

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
            return <Text key={i} style={[styles.paragraph, styles.bold]}>{line.text}</Text>;
          if (line.type === "bullet")
            return (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{line.text}</Text>
              </View>
            );
          return <Text key={i} style={styles.paragraph}>{line.text}</Text>;
        })}
      </Page>
    </Document>
  );
}
