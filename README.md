# Nashville Number System Chart Maker

A browser-based tool for creating, editing, and printing music charts using the Nashville Number System (NNS) — a shorthand notation where chords are written as numbers relative to the song's key, making charts usable in any key without rewriting them.

## Getting Started

1. Open `index.html` in any modern web browser
2. No installation, build step, or internet connection required (fonts load from Google Fonts)
3. Click **Load Demo Chart** at the bottom of the left panel to see a fully annotated example

---

## Interface Overview

The app is split into two panels:

- **Left panel** — Song metadata, chart text input, saved charts list, and notation reference
- **Right panel** — Live preview that updates as you type; what you see is what prints

### Metadata Fields

| Field | Description |
|---|---|
| Title | Song name (appears at top of chart) |
| Key | Key of the song (e.g., `C`, `G#`, `Bb`) |
| Tempo | BPM (e.g., `120`) |
| Time | Time signature (e.g., `4/4`, `3/4`) |
| Songwriter | Artist or songwriter name |
| Charted By | Your name |

---

## Writing Charts

Type your chart into the text area. Each line represents a song section. The app auto-wraps chords into 4-beat bars.

### Basic Example

```
V: 1 4 5 1 1 4 5 1
C: 1 5 6- 4 1 5 6- 4
```

### Section Labels

Section labels are 1–4 characters followed by a colon:

| Input | Renders as |
|---|---|
| `V:` | Verse |
| `C:` | Chorus |
| `B:` | Bridge |
| `I:` | Intro |
| `TA:` | Turn Around |
| `Solo:` | Solo |
| `V1:`, `C2:` | Numbered sections in boxes |

Numbered sections (e.g., `V1:`, `V2:`) render the label inside a bordered box to distinguish them visually.

### Auto-spacing

Typing numbers runs together will be auto-spaced: typing `1451` becomes `1 4 5 1`. The app is context-aware and won't break 7th chords or suspended chord suffixes.

### Empty Lines

A blank line between sections adds vertical spacing in the preview.

---

## Chord Notation

Chords are numbers 1–7. Modifiers are added as suffixes (parsed right-to-left).

### Basic Chords

| Notation | Meaning |
|---|---|
| `1` | Major chord on scale degree 1 |
| `6-` | Minor chord (dash = minor) |
| `7o` | Diminished chord |

### Seventh Chords

| Notation | Renders |
|---|---|
| `17` | 1 with superscript 7 |
| `4-7` | Minor 7 |
| `57` | Dominant 7 |

### Suspended Chords

| Notation | Renders |
|---|---|
| `1s` | sus (shorthand) |
| `4sus` | sus |
| `5sus2` | sus2 |
| `2sus4` | sus4 |

### Inversions (Slash Chords)

| Notation | Renders |
|---|---|
| `5/1` | 5 over 1 (stacked fraction) |
| `4/2` | 4 over 2 |

### Held Chords (Diamond Notation)

Wrapping a chord in angle brackets renders it inside a diamond shape, indicating it should be held:

```
<1>
<5<>    (held chord with early push)
<5>>    (held chord with late push)
```

### Tied Chords

Chords connected with underscores render as an underlined group:

```
1_4_5_1
```

Modifiers work inside tied groups:

```
1_<4>_5*
```

### Push Notation

| Notation | Meaning |
|---|---|
| `4<` | Early push (hit slightly before the beat) |
| `5>` | Late push (hit slightly after the beat) |

### Staccato / Articulation

| Notation | Renders |
|---|---|
| `5^` | `^` above chord (accent) |
| `5*` | `•` above chord (staccato dot) |

### Beat Tick Marks

Tick marks above a chord indicate how many beats it lasts when multiple chords share a beat:

```
1'_4'''     (1 gets 1 beat, 4 gets 3 beats)
1''_4'_5'   (split beat notation)
```

### Rhythm Slashes

Use `/` to indicate beat hits without a chord change:

```
1 / / /
```

---

## Comments

Lines or inline text starting with `#` become comments:

- **First line comment**: `#My comment here` — renders centered between the title and the chart body
- **Inline comment**: `1 4 5 1 #This is a tag` — renders below the bar it follows

---

## Repeat Markers

```
||:
1 5 6- 4
:||
```

`||:` opens a repeat section, `:||` closes it. These render as standard music notation repeat symbols.

---

## Display Options

Controls in the top-right of the preview panel:

| Control | Description |
|---|---|
| **Save Chart** | Save the current chart to the saved charts list |
| **New Chart** | Clear all fields and start fresh |
| **2 col** | Toggle single/two-column layout |
| **Font** | Choose from Handwriting (Kalam), Shadows Into Light, Mansalva, or Helvetica |
| **Size** | Small, Medium, or Large font size |
| **Print** | Open browser print dialog |

---

## Saving Charts

Charts are saved to browser `localStorage` by default (no account needed). If your browser supports the File System Access API (Chrome/Edge), a `+` button appears next to "saving to browser storage" — clicking it lets you link a local folder so charts save as `.json` files on your filesystem instead, which survives clearing browser data and allows manual backup.

### Saved Chart List

Saved charts appear below the text input. Each entry has:
- **Load** — loads the chart into the editor
- **Delete** — removes it from storage

Your current in-progress work is also auto-saved continuously and restored automatically on page reload.

---

## Printing

Click **Print** (or use `Cmd+P` / `Ctrl+P`). The browser's print dialog will open. The UI controls are hidden in print output — only the chart header and body appear. For best results:
- Set paper size to Letter or A4
- Disable headers/footers in the print dialog
- Use the two-column layout for dense charts to fit more on one page

---

## Full Notation Quick Reference

```
Section labels:   V:  C:  B:  I:  TA:  Solo:  V1:  C2:
Minor:            6-
Diminished:       7o
Seventh:          17  4-7  57
Suspended:        1s  4sus  5sus2  2sus4
Inversion:        5/1  4/2
Held chord:       <1>
Tied chords:      1_4_5_1
Push early:       4<
Push late:        5>
Push + diamond:   <5<>  <5>>
Staccato accent:  5^
Staccato dot:     5*
Beat ticks:       1'  4''  5'''
Rhythm slash:     1 / / /
Repeat open:      ||:
Repeat close:     :||
Header comment:   #Comment (first line only)
Bar comment:      #Comment (after chords)
```
