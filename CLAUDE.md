# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based Nashville Number System (NNS) chart maker - a single-page application for creating, editing, and printing music charts using the Nashville Number System notation. The NNS is a shorthand method of writing music charts where chords are represented as numbers relative to the song's key.

## Tech Stack

- **Pure vanilla JavaScript** (ES6 classes) - no framework or build tools
- **HTML5 + CSS3** - direct browser execution
- **localStorage** - for chart persistence
- **Google Fonts** - Kalam (handwriting), Shadows Into Light, Mansalva

## Development Workflow

### Running the Application
- Simply open `index.html` in a web browser
- No build process, bundler, or development server required
- Edit files directly and refresh browser to see changes

### Testing
- Manual testing via browser
- Load demo chart to verify notation rendering
- Test print preview via browser's print dialog (Cmd+P / Ctrl+P)

## Architecture

### Core Application Class: `NNSChartApp`

The entire application is encapsulated in a single ES6 class (`app.js`) that manages:

1. **Chart Parsing** (`parseChart`, `parseBars`, `parseChordNotation`)
   - Converts user text input into structured section/bar objects
   - Handles 4-beat bar auto-wrapping
   - Parses complex chord notation (seventh, suspended, diminished, inversions, push, staccato)

2. **Chart Rendering** (`renderChart`, `renderChordWithNotation`, `renderTiedChordPart`)
   - Generates HTML from parsed chart data
   - Renders special notations (diamonds for held chords, underlines for tied chords)
   - Handles repeat symbols and section labels

3. **Auto-save** (`autoSave`, `loadAutoSave`)
   - Continuously saves current work to `localStorage` as user types
   - Restores work-in-progress on page reload

4. **Chart Management** (`saveChart`, `loadChart`, `deleteChart`)
   - Persistent storage of named charts
   - Load/delete saved charts from list

5. **Smart Input Handling** (`handleChartInput`)
   - Auto-spacing: typing "1451" becomes "1 4 5 1"
   - Auto-indentation: aligns continuation lines with first chord
   - Context-aware number spacing (respects 7th chords, sus2/sus4)

### Data Flow

```
User Input (textarea)
  ↓
parseChart() → { sections: [...], headerComment }
  ↓
renderChart() → HTML string
  ↓
DOM updates (preview + print view)
  ↓
autoSave() → localStorage
```

### Chart Data Structure

Charts are parsed into this structure:

```javascript
{
  sections: [
    {
      name: { abbr: 'V', full: 'Verse' },  // or null for no label
      bars: [
        {
          type: 'bar',
          beats: [  // always 4 beats
            {
              value: '1',           // raw chord string
              held: false,          // diamond notation
              tied: false,          // underlined group
              notation: {           // parsed chord components
                base: '1',
                seventh: false,
                suspended: null,    // 's', 'sus', 'sus2', 'sus4'
                diminished: false,
                inversion: null,    // bass note for slash chords
                push: null,         // 'early' or 'late'
                staccato: false,    // ^ accent
                staccatoDot: false, // • dot
                ticks: 0            // beat count marks
              },
              tiedNotations: []     // for tied chords only
            }
          ],
          comment: 'optional',
          startRepeat: false,
          endRepeat: false
        }
      ]
    }
  ],
  headerComment: 'optional centered comment'
}
```

## Chart Notation Reference

The application supports extensive notation syntax:

### Section Labels
- Format: `LABEL:` (1-4 characters + colon)
- Common: `V:` (Verse), `C:` (Chorus), `B:` (Bridge), `I:` (Intro), `TA:` (Turn Around)
- Numbered: `V1:`, `C2:` - renders in boxes
- Case rules:
  - 3+ chars: preserve original case
  - 1-2 chars: uppercase unless mixed case (e.g., `Ta` stays `Ta`, `v` becomes `V`)

### Chord Modifiers (parsed right-to-left)
- **Tick marks**: `1'`, `4'''` - shows beat count above chord
- **Staccato dot**: `5*` - shows • above
- **Staccato accent**: `5^` - shows ^ above
- **Push notation**: `4<` (early), `5>` (late) - shows symbol above
- **Minor**: `6-`
- **Diminished**: `7o`
- **Seventh**: `17`, `4-7`
- **Suspended**: `1s`, `4sus`, `5sus2`, `2sus4`
- **Inversions**: `5/1`, `4/2` - renders as stacked fraction
- **Held chords**: `<1>` - displays in diamond
- **Push + diamond**: `<5<>` (early), `<5>>` (late)
- **Tied chords**: `1_4_5_1` - renders underlined
- **Mixed tied**: `1_<4>_5*` - can combine held/staccato in tied group

### Other Notation
- **Comments**: `#Comment text` - appears below bar or centered if first line
- **Repeat markers**: `||:` (start), `:||` (end)
- **Rhythm slashes**: `1 / / /`

## localStorage Schema

### Keys
- `nns_current_chart` - auto-saved work in progress
- `nns_saved_charts` - array of saved charts

### Saved Chart Object
```javascript
{
  id: "timestamp",
  title: "Song Title",
  key: "C",
  tempo: "120",
  time: "4/4",
  songwriter: "Artist Name",
  chartedBy: "Your Name",
  chart: "V 1 4 5 1\nC 1 5 6- 4",  // raw text input
  savedAt: "ISO date string"
}
```

## CSS Architecture

### Layout System
- **Grid-based** layout for metadata inputs and chart structure
- **CSS columns** (`column-count: 2`) for two-column toggle
- **Print media queries** hide UI controls and optimize for paper

### Font System
Dynamic font switching via classes:
- `.font-handwriting` - Kalam (default)
- `.font-shadows` - Shadows Into Light
- `.font-mansalva` - Mansalva
- `.font-helvetica` - Helvetica

Font sizes: `.size-small`, `.size-medium`, `.size-large`

### Special Components
- `.diamond` - rotated square (transform: rotate(45deg)) for held chords
- `.chord-inversion` - diagonal fraction display for slash chords
- `.section-box` - bordered box for section labels
- `.tied-chord` - underlined connected chords
- `.repeat-symbol` - authentic music notation repeat marks (thick/thin bars + dots)
- `.push-symbol` - < or > above chord for timing
- `.staccato-symbol`, `.staccato-dot-symbol` - articulation marks
- `.tick-marks` - beat count indicators

## Code Modification Guidelines

### When Editing `app.js`

1. **Parsing logic** (`parseChart`, `parseBars`, `parseChordNotation`):
   - Process modifiers **right-to-left** (ticks → staccato → push → inversion → suspended → seventh → diminished)
   - Maintain 4-beat bar structure
   - Preserve auto-spacing intelligence in `handleChartInput`

2. **Rendering logic** (`renderChart`, `renderChordWithNotation`):
   - Use `escapeHtml()` for all user input to prevent XSS
   - Maintain grid structure (section label + bars)
   - Keep tied chord rendering inline to preserve underline across parts

3. **localStorage operations**:
   - Always use try/catch with JSON.parse
   - Gracefully handle missing/corrupted data

### When Editing `styles.css`

1. **Print styles** (under `@media print`):
   - Hide `.no-print` elements
   - Show `.print-only` elements
   - Optimize page breaks and margins

2. **Font classes**:
   - Apply to all chart-related elements (`.chart-preview`, `.beat`, `.section-box`, etc.)
   - Don't apply to UI controls

3. **Responsive design**:
   - Keep two-column layout usable
   - Ensure diamonds and special symbols scale properly

## Common Tasks

### Adding New Chord Notation
1. Update `parseChordNotation()` to extract the modifier
2. Add property to notation object
3. Update `renderChordWithNotation()` to render it
4. Update `renderTiedChordPart()` if it can appear in tied chords
5. Add CSS for styling
6. Update help text in `index.html`

### Adding New Section Label
1. Update `expandSectionLabel()` in `app.js` with mapping
2. No other changes needed (flexible 1-4 char system)

### Modifying Auto-spacing Behavior
- Edit `handleChartInput()` event handler
- Test carefully with edge cases (7th chords, sus2/sus4, inversions)

### Changing Print Layout
- Modify `@media print` section in `styles.css`
- Test with actual browser print preview (not just CSS inspection)
