import { useMemo, type ReactNode } from "react"
import { View, Text, Platform, useColorScheme, type StyleProp, type ViewStyle, type TextStyle } from "react-native"
import { useMarkdown, Renderer } from "react-native-marked"
import { CodeBlock } from "./CodeBlock"
import { useTheme } from "../../theme"

// react-native-marked's base Renderer hardcodes `selectable` on every plain
// text node it produces (text/strong/em/del/heading/codespan). On Android,
// selectable <Text> nested inside a FlatList row has a long-standing,
// still-unresolved RN bug (facebook/react-native#46999, a reopened
// regression of #28952's fix) where the underlying view's selectable state
// — and, per our own diff-scroll flow (issue #104), its exposure to the
// accessibility tree Maestro/UiAutomator reads from — never gets applied
// correctly. Chat messages here are rendered as rows of the session screen's
// own FlatList (app/session/[id].tsx), so every markdown text node hits
// this. Code content is still copyable via CodeBlock's explicit Copy
// button, so dropping `selectable` on plain text costs little.
class CustomRenderer extends Renderer {
  private plainText(children: string | ReactNode[], styles?: StyleProp<TextStyle>): ReactNode {
    return (
      <Text key={this.getKey()} style={styles}>
        {children}
      </Text>
    )
  }

  code(text: string, language?: string, containerStyle?: ViewStyle, _textStyle?: TextStyle) {
    return (
      <View key={this.getKey()} style={containerStyle}>
        <CodeBlock code={text} language={language} />
      </View>
    )
  }

  text(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(text, styles)
  }

  strong(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(children, styles)
  }

  em(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(children, styles)
  }

  del(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(children, styles)
  }

  heading(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.plainText(text, styles)
  }

  codespan(text: string, styles?: TextStyle): ReactNode {
    return this.plainText(text, [styles, { fontStyle: "normal", fontWeight: "normal" }])
  }
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

interface Props {
  children: string
  // Inside a rounded user bubble the paragraph gap is removed so the text sits
  // tight against the padding.
  tight?: boolean
}

export function Markdown({ children, tight = false }: Props) {
  const colors = useTheme()

  const theme = useMemo(
    () => ({
      text: { color: colors.text, fontSize: 19, lineHeight: 26 },
      paragraph: { marginTop: 0, marginBottom: tight ? 0 : 13 },
      h1: { fontSize: 26, fontWeight: "700" as const, color: colors.text, marginBottom: 12, marginTop: 20 },
      h2: { fontSize: 22, fontWeight: "600" as const, color: colors.text, marginBottom: 10, marginTop: 18 },
      h3: { fontSize: 19, fontWeight: "600" as const, color: colors.text, marginBottom: 8, marginTop: 16 },
      link: { color: colors.accent, textDecorationLine: "underline" as const },
      blockquote: {
        backgroundColor: "transparent",
        borderLeftWidth: 3,
        borderLeftColor: colors.border,
        paddingLeft: 14,
        paddingVertical: 2,
        marginVertical: 8,
      },
      code: {
        backgroundColor: colors.codeBg,
        color: colors.codeText,
        fontFamily: mono,
        fontSize: 15,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
      },
      codespan: {
        backgroundColor: colors.codeBg,
        color: colors.codeText,
        fontFamily: mono,
        fontSize: 15,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
      },
      list: { marginBottom: 4 },
      li: { marginBottom: 8 },
      hr: { backgroundColor: colors.border, height: 1, marginVertical: 12 },
      strong: { fontWeight: "700" as const },
      em: { fontStyle: "italic" as const },
      strikethrough: { textDecorationLine: "line-through" as const },
      image: { borderRadius: 8 },
    }),
    [colors, tight],
  )

  // A module-scope singleton renderer would share one CustomRenderer (and
  // its underlying github-slugger) across every Markdown instance and every
  // streamed token forever. github-slugger never resets, so its heading-slug
  // keys only ever climb — which fed into useMarkdown's memoized parser and
  // made the emitted React keys change on every token, remounting the whole
  // subtree (resetting code-block scroll position, flashing content). Scoping
  // the renderer to `children` resets the slugger per parse, so keys are
  // deterministic (and stable) for a given value, while re-renders with an
  // unchanged value stay memoized instead of creating a new renderer.
  const renderer = useMemo(() => new CustomRenderer(), [children])

  // react-native-marked's default <RNMarkdown> export renders blocks inside a
  // FlatList. Chat messages are rendered inside app/session/[id].tsx's own
  // *inverted* FlatList (each row a MessageBubble) — nesting one
  // VirtualizedList inside another, especially an inverted one, is a known
  // React Native footgun where the inner list's content can fail to lay out
  // (renders zero height) instead of just warning. We already force
  // scrollEnabled: false and a large initialNumToRender here, which defeats
  // virtualization anyway, so there's nothing to lose by rendering the parsed
  // blocks directly with the useMarkdown hook instead (issue #104).
  const elements = useMarkdown(children ?? "", {
    renderer,
    styles: theme,
    colorScheme: useColorScheme() === "light" ? "light" : "dark",
  })

  if (!children?.trim()) return null

  return <View style={{ backgroundColor: "transparent" }}>{elements}</View>
}
