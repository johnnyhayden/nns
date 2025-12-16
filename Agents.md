# Nashville Number System Chart Maker

## Project Overview

A browser-based web application for creating, editing, and printing music charts using the **Nashville Number System (NNS)** notation. The NNS is a shorthand method of writing music charts popular in Nashville's recording industry, where chords are represented as numbers relative to the key of the song.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Classes), HTML5, CSS3
- **Storage**: Browser localStorage for persistence
- **Fonts**: Google Fonts (Kalam for handwriting style)
- **No build tools or dependencies required** - runs directly in the browser

## Architecture

### Single-Page Application Structure

```
nns/
├── index.html      # Main HTML structure
├── app.js          # Application logic (NNSChartApp class)
└── styles.css      # Styling including print styles
```

### Core Class: `NNSChartApp`

The entire application logic is encapsulated in a single class that handles:

1. **Chart Parsing** - Converts text input into structured section/bar data
2. **Chart Rendering** - Generates HTML preview from parsed data
3. **Auto-save** - Persists current work to localStorage
4. **Chart Management** - Save, load, delete named charts
5. **Print Support** - Optimized print stylesheet for physical charts

## Key Features

### Chart Notation Support

| Notation | Description | Example |
|----------|-------------|---------|
| Section labels | V, C, B, I, O, TA, PC, S, T, INT | `V 1 4 5 1` |
| Minor chords | Dash suffix | `6-` |
| Diminished | Lowercase 'o' suffix | `7o` |
| Seventh chords | Number suffix | `17`, `4-7` |
| Suspended | 's' or 'sus' suffix | `4sus`, `2s` |
| Inversions | Slash notation | `5/1` |
| Held chords | Angle brackets | `<1>` (displays as diamond) |
| Tied chords | Underscore separator | `1_4_5_1` (underlined) |
| Comments | Hash prefix | `#Diamond on the one!` |
| Repeat markers | Barlines | `||:`, `:||` |

### Smart Input

- **Auto-spacing**: Typing `1451` automatically becomes `1 4 5 1`
- **4-beat bars**: Chords auto-wrap into 4-beat measures
- **Real-time preview**: Changes reflect instantly

### Display Options

- **Two-column layout** toggle for dense charts
- **Font selection**: Handwriting (Kalam) or Helvetica
- **Print-optimized** output with proper page breaks

## Data Flow

```
User Input → parseChart() → Section/Bar Objects → renderChart() → HTML Preview
                                                        ↓
                                                   Print View
```

### Chart Data Structure

```javascript
{
  sections: [
    {
      name: { abbr: 'V', full: 'Verse' },
      bars: [
        {
          type: 'bar',
          beats: [
            { value: '1', held: false, tied: false, notation: {...} },
            { value: '4', held: false, tied: false, notation: {...} },
            // ... 4 beats per bar
          ],
          comment: 'optional comment',
          startRepeat: false,
          endRepeat: false
        }
      ]
    }
  ]
}
```

## Storage Schema

### localStorage Keys

- `nns_current_chart` - Auto-saved current work (JSON)
- `nns_saved_charts` - Array of saved charts (JSON)

### Saved Chart Object

```javascript
{
  id: "timestamp",
  title: "Song Title",
  key: "C",
  tempo: "120",
  time: "4/4",
  songwriter: "Artist Name",
  chartedBy: "John Hayden",
  chart: "V 1 4 5 1\nC 1 5 6- 4",
  savedAt: "ISO date string"
}
```

## CSS Architecture

### Key Styling Patterns

- **Grid-based layouts** for responsive design
- **CSS columns** for two-column chart display
- **Print media queries** for clean printed output
- **Font classes** (`.font-handwriting`, `.font-helvetica`) for dynamic font switching

### Notable CSS Components

- `.diamond` - Rotated square for held chords
- `.chord-inversion` - Stacked fraction display for slash chords
- `.section-box` - Bordered label for section markers
- `.tied-chord` - Underlined connected chords

## Usage

1. Open `index.html` in a browser
2. Enter song metadata (title, key, tempo, etc.)
3. Type chart notation in the textarea
4. Preview updates in real-time
5. Toggle two-column layout and font as needed
6. Save chart or print directly

## Demo

Click "Load Demo Chart" to see a comprehensive example demonstrating:
- Multiple sections (Intro, Verse, Chorus, Bridge, Turn Around)
- Various chord notations (minor, seventh, suspended, diminished)
- Held chords in diamonds
- Tied chords with underlines
- Comments and repeat markers
- Inversions (slash chords)

## Development Notes

- No build process required - edit files directly
- Test by opening `index.html` in browser
- localStorage persists across sessions
- Print preview available via browser print dialog

