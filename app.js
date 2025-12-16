// Nashville Number System Chart Maker

class NNSChartApp {
    constructor() {
        this.currentChartId = null;
        this.charts = this.loadChartsFromStorage();
        this.initializeElements();
        this.attachEventListeners();
        this.renderSavedCharts();
        this.updatePreview();
    }

    initializeElements() {
        // Input elements
        this.titleInput = document.getElementById('song-title');
        this.keyInput = document.getElementById('song-key');
        this.tempoInput = document.getElementById('song-tempo');
        this.timeInput = document.getElementById('song-time');
        this.songwriterInput = document.getElementById('song-songwriter');
        this.chartedByInput = document.getElementById('song-chartedby');
        this.chartInput = document.getElementById('chart-input');

        // Preview elements
        this.chartPreview = document.getElementById('chart-preview');
        this.printView = document.getElementById('print-view');
        this.twoColumnToggle = document.getElementById('two-column-toggle');
        this.fontSelect = document.getElementById('font-select');
        this.fontSizeSelect = document.getElementById('font-size-select');

        // Buttons
        this.saveBtn = document.getElementById('save-chart-btn');
        this.newBtn = document.getElementById('new-chart-btn');
        this.printBtn = document.getElementById('print-btn');

        // Saved charts list
        this.savedChartsList = document.getElementById('saved-charts-list');
    }

    attachEventListeners() {
        // Auto-update preview on any input change
        this.titleInput.addEventListener('input', () => this.updatePreview());
        this.keyInput.addEventListener('input', () => this.updatePreview());
        this.tempoInput.addEventListener('input', () => this.updatePreview());
        this.timeInput.addEventListener('input', () => this.updatePreview());
        this.songwriterInput.addEventListener('input', () => this.updatePreview());
        this.chartedByInput.addEventListener('input', () => this.updatePreview());
        this.chartInput.addEventListener('input', (e) => this.handleChartInput(e));
        this.twoColumnToggle.addEventListener('change', () => this.updatePreview());
        this.fontSelect.addEventListener('change', () => this.updatePreview());
        this.fontSizeSelect.addEventListener('change', () => this.updatePreview());

        // Button events
        this.saveBtn.addEventListener('click', () => this.saveChart());
        this.newBtn.addEventListener('click', () => this.newChart());
        this.printBtn.addEventListener('click', () => this.printChart());

        // Demo link
        const demoLink = document.getElementById('load-demo-link');
        if (demoLink) {
            demoLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadDemo();
            });
        }
    }

    loadDemo() {
        this.titleInput.value = 'My Demo Song';
        this.keyInput.value = 'C';
        this.tempoInput.value = '120';
        this.timeInput.value = '4/4';
        this.songwriterInput.value = 'Larry Laffer';
        this.chartedByInput.value = 'John Hayden';

        const demoChart = `I: 1 5 6- 4
I: 1 5 6- 4

v1: 1 4 5 1
#Diamond on the one!
<1> 4 5 1
2- 5 1 1
#Tied chords below
1_4_5_1 2- 5 1

C: 17 5 6- 4
#Seventh chord above
1 5 6- 4
||:
C: 1 5 6- 4 1 5 6- 4
:||

B: 4sus 5 6- 1
#Suspended and diminished
4sus2 5sus4 7o 1
2- 5/1 <1>
#Inversion and diamond above

V2: 1 <4 5 1
#Early push on 4
1 5>_4> 1 5>_4>
#Late push tied chords
<<5> 4 <5>> 1
#Early and late push diamonds

V: 1^ 4^ 5^ 1^
#Staccato accents above
17 4-7 5 1
1'_4''' 1''_4'_5'
#Beat ticks: 1 beat + 3 beats, then 2+1+1

C: 1 5 6- 4
1 5^ 6-^ 4
#Staccato on 5 and 6-

Solo: 5 5 4 4 1
TA: 5 5 4 4 1`;

        this.chartInput.value = demoChart;
        this.twoColumnToggle.checked = true;
        this.fontSelect.value = 'handwriting';
        this.fontSizeSelect.value = 'medium';
        this.updatePreview();
    }

    handleChartInput(e) {
        const textarea = this.chartInput;
        const cursorPos = textarea.selectionStart;
        const text = textarea.value;

        // Only process if we just typed a single character
        if (e.inputType === 'insertText' && e.data && e.data.length === 1) {
            const justTyped = e.data;

            // Check if the character just typed is a number
            if (/\d/.test(justTyped)) {
                // Get the character before the number we just typed
                const beforeCursor = text.substring(0, cursorPos);
                const charBefore = beforeCursor.length >= 2 ? beforeCursor[beforeCursor.length - 2] : '';

                // Check if we need to insert a space
                let needsSpace = false;

                // Case 1: Number after number (e.g., "14" -> "1 4")
                // BUT: Don't space if we just typed "7" (could be 7th chord like "17")
                if (/\d/.test(charBefore) && justTyped !== '7') {
                    needsSpace = true;
                }
                // Case 2: Number after minus sign (e.g., "6-4" -> "6- 4")
                else if (charBefore === '-') {
                    needsSpace = true;
                }
                // Case 3: Number after "o" for diminished (e.g., "7o4" -> "7o 4")
                else if (charBefore === 'o') {
                    needsSpace = true;
                }
                // Case 4: Number after "s" for suspended (e.g., "1s4" -> "1s 4")
                // But NOT if we're typing "2" or "4" after "sus" (for sus2/sus4)
                else if (charBefore === 's') {
                    // Check if it's part of "sus" (3 chars back should be 'u')
                    const threeBack = beforeCursor.length >= 4 ? beforeCursor[beforeCursor.length - 3] : '';
                    if (threeBack === 'u') {
                        // It's "sus", allow 2 or 4 for sus2/sus4, space otherwise
                        if (justTyped !== '2' && justTyped !== '4') {
                            needsSpace = true;
                        }
                    } else {
                        // It's just "s", not "sus", so space
                        needsSpace = true;
                    }
                }
                // Case 5: Number after "sus2" or "sus4" (e.g., "1sus24" -> "1sus2 4")
                else if (beforeCursor.length >= 5) {
                    const last4 = beforeCursor.substring(beforeCursor.length - 5, beforeCursor.length - 1);
                    if (last4 === 'sus2' || last4 === 'sus4') {
                        needsSpace = true;
                    }
                }

                if (needsSpace) {
                    // Insert a space before the number we just typed
                    const newText = text.substring(0, cursorPos - 1) + ' ' + justTyped + text.substring(cursorPos);
                    textarea.value = newText;
                    // Move cursor to after the space and number
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
                }
            }
        }

        this.updatePreview();
    }

    parseChart(chartText) {
        const lines = chartText.split('\n').filter(line => line.trim());
        const sections = [];
        let currentSection = null;
        let pendingStartRepeat = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check if this is a comment line
            if (trimmed.startsWith('#')) {
                const comment = trimmed.substring(1).trim();
                // Attach comment to the last bar in current section
                if (currentSection && currentSection.bars.length > 0) {
                    const lastBar = currentSection.bars[currentSection.bars.length - 1];
                    lastBar.comment = comment;
                }
                continue;
            }

            // Check if this is a start repeat marker
            if (trimmed === '||:') {
                pendingStartRepeat = true;
                continue;
            }

            // Check if this is an end repeat marker
            if (trimmed === ':||') {
                // Attach to the last bar in current section
                if (currentSection && currentSection.bars.length > 0) {
                    const lastBar = currentSection.bars[currentSection.bars.length - 1];
                    lastBar.endRepeat = true;
                }
                continue;
            }

            // Check if line starts with a section label followed by colon
            // Format: up to 4 characters followed by colon (V:, C:, TA:, V1:, C2:, etc.)
            let sectionMatch = trimmed.match(/^([A-Za-z0-9]{1,4}):+\s*(.*)$/);
            let isSection = false;

            if (sectionMatch) {
                const [, label, content] = sectionMatch;
                // Process the label according to the rules
                const processedLabel = this.processSectionLabel(label);
                const sectionName = this.expandSectionLabel(processedLabel.abbr);

                // Always treat as section if it matches the pattern
                isSection = true;

                // If there's content after the label, add it as bars
                if (content.trim()) {
                    if (!currentSection || currentSection.name.abbr !== sectionName.abbr) {
                        currentSection = { name: sectionName, bars: [] };
                        sections.push(currentSection);
                    }
                    const bars = this.parseBars(content);
                    // Apply pending start repeat to first bar
                    if (pendingStartRepeat && bars.length > 0) {
                        bars[0].startRepeat = true;
                        pendingStartRepeat = false;
                    }
                    currentSection.bars.push(...bars);
                } else {
                    // Just a section label, start new section
                    currentSection = { name: sectionName, bars: [] };
                    sections.push(currentSection);
                }
            }

            if (!isSection) {
                if (currentSection) {
                    // Regular bar line under current section
                    const bars = this.parseBars(trimmed);
                    // Apply pending start repeat to first bar
                    if (pendingStartRepeat && bars.length > 0) {
                        bars[0].startRepeat = true;
                        pendingStartRepeat = false;
                    }
                    currentSection.bars.push(...bars);
                } else {
                    // No section defined yet, create a default one
                    currentSection = { name: '', bars: [] };
                    sections.push(currentSection);
                    const bars = this.parseBars(trimmed);
                    // Apply pending start repeat to first bar
                    if (pendingStartRepeat && bars.length > 0) {
                        bars[0].startRepeat = true;
                        pendingStartRepeat = false;
                    }
                    currentSection.bars.push(...bars);
                }
            }
        }

        return sections;
    }

    processSectionLabel(label) {
        // Determine how to render the section label
        // Rules: If mixed case, render mixed case. If upper/lower only, render upper case.

        const hasUpper = /[A-Z]/.test(label);
        const hasLower = /[a-z]/.test(label);

        let displayLabel = label;
        if (hasUpper && hasLower) {
            // Mixed case - keep as is
            displayLabel = label;
        } else {
            // All upper or all lower - render as upper case
            displayLabel = label.toUpperCase();
        }

        return {
            abbr: displayLabel,
            original: label
        };
    }

    isKnownSection(label) {
        // This is now less restrictive since we accept any 1-4 character label followed by colon
        return true;
    }

    expandSectionLabel(label) {
        const labels = {
            'V': { abbr: 'V', full: 'Verse' },
            'C': { abbr: 'C', full: 'Chorus' },
            'B': { abbr: 'B', full: 'Bridge' },
            'I': { abbr: 'I', full: 'Intro' },
            'O': { abbr: 'O', full: 'Outro' },
            'TA': { abbr: 'TA', full: 'Turn Around' },
            'PC': { abbr: 'PC', full: 'Pre-Chorus' },
            'S': { abbr: 'S', full: 'Solo' },
            'T': { abbr: 'T', full: 'Tag' },
            'INT': { abbr: 'INT', full: 'Interlude' }
        };

        // Handle numbered sections (V1, C2, etc.)
        if (/^[A-Z]+\d+$/.test(label.toUpperCase())) {
            const baseLetter = label.charAt(0).toUpperCase();
            const number = label.substring(1);
            const baseName = labels[baseLetter]?.full || baseLetter;
            return { abbr: label.toUpperCase(), full: `${baseName} ${number}` };
        }

        const upperLabel = label.toUpperCase();
        return labels[upperLabel] || { abbr: label, full: label };
    }

    parseChordNotation(chordStr) {
        // Parse a chord string to extract components
        // Returns: { base, seventh, suspended, diminished, inversion, push, staccato, ticks }

        let remaining = chordStr;
        let seventh = false;
        let suspended = null; // 's', 'sus', 'sus2', or 'sus4'
        let diminished = false;
        let inversion = null; // bass note for slash chords
        let push = null; // 'early' (<) or 'late' (>)
        let staccato = false; // ^ for staccato accent
        let ticks = 0; // number of tick marks (') for beat count

        // Check for tick marks at the end (e.g., 1', 4'', 5''')
        const tickMatch = remaining.match(/'+$/);
        if (tickMatch) {
            ticks = tickMatch[0].length;
            remaining = remaining.slice(0, -ticks);
        }

        // Check for staccato accent at the end (^)
        if (remaining.endsWith('^')) {
            staccato = true;
            remaining = remaining.slice(0, -1);
        }

        // Check for push notation
        // Early push: < at the START (e.g., <4)
        // Late push: > at the END (e.g., 5>)
        if (remaining.startsWith('<')) {
            push = 'early';
            remaining = remaining.slice(1);
        } else if (remaining.endsWith('>')) {
            push = 'late';
            remaining = remaining.slice(0, -1);
        }

        // Check for inversion (slash chord like "5/1")
        if (remaining.includes('/')) {
            const parts = remaining.split('/');
            remaining = parts[0];
            inversion = parts[1];
        }

        // Check for suspended (sus2, sus4, sus, or just s)
        if (remaining.endsWith('sus2')) {
            suspended = 'sus2';
            remaining = remaining.slice(0, -4);
        } else if (remaining.endsWith('sus4')) {
            suspended = 'sus4';
            remaining = remaining.slice(0, -4);
        } else if (remaining.endsWith('sus')) {
            suspended = 'sus';
            remaining = remaining.slice(0, -3);
        } else if (remaining.endsWith('s')) {
            suspended = 's';
            remaining = remaining.slice(0, -1);
        }

        // Check for seventh
        if (remaining.endsWith('7')) {
            seventh = true;
            remaining = remaining.slice(0, -1);
        }

        // Check for diminished (ends with 'o')
        if (remaining.endsWith('o')) {
            diminished = true;
            remaining = remaining.slice(0, -1);
        }

        return {
            base: remaining,
            seventh,
            suspended,
            diminished,
            inversion,
            push,
            staccato,
            ticks
        };
    }

    parseBars(barText) {
        // Parse all beats from the text
        const parts = barText.split(/\s+/).filter(p => p);
        if (parts.length === 0) return [];

        // Convert parts to beat objects
        const allBeats = [];
        for (const part of parts) {
            // Check for diamond chord with push notation
            // Early push diamond: <<5> (push symbol before diamond)
            // Late push diamond: <5>> (push symbol after diamond)
            const earlyPushDiamondMatch = part.match(/^<<(.+)>$/);
            const latePushDiamondMatch = part.match(/^<(.+)>>$/);
            // Regular held chord: <number>
            const heldMatch = part.match(/^<(.+)>$/);
            
            if (earlyPushDiamondMatch) {
                // Early push diamond chord
                const chordNotation = this.parseChordNotation(earlyPushDiamondMatch[1]);
                chordNotation.push = 'early';
                allBeats.push({
                    value: earlyPushDiamondMatch[1],
                    held: true,
                    tied: false,
                    notation: chordNotation
                });
            }
            else if (latePushDiamondMatch) {
                // Late push diamond chord
                const chordNotation = this.parseChordNotation(latePushDiamondMatch[1]);
                chordNotation.push = 'late';
                allBeats.push({
                    value: latePushDiamondMatch[1],
                    held: true,
                    tied: false,
                    notation: chordNotation
                });
            }
            else if (heldMatch) {
                // Regular held chord in diamond (no push)
                const chordNotation = this.parseChordNotation(heldMatch[1]);
                allBeats.push({
                    value: heldMatch[1],
                    held: true,
                    tied: false,
                    notation: chordNotation
                });
            }
            // Check if this is a tied chord (contains underscores)
            else if (part.includes('_')) {
                // Parse each tied chord for push notation
                const tiedParts = part.split('_');
                const parsedTiedParts = tiedParts.map(p => this.parseChordNotation(p));
                allBeats.push({
                    value: part,
                    held: false,
                    tied: true,
                    notation: null,
                    tiedNotations: parsedTiedParts
                });
            }
            else {
                const chordNotation = this.parseChordNotation(part);
                allBeats.push({
                    value: part,
                    held: false,
                    tied: false,
                    notation: chordNotation
                });
            }
        }

        // Group beats into bars of 4
        const bars = [];
        for (let i = 0; i < allBeats.length; i += 4) {
            const beats = [];
            for (let j = 0; j < 4; j++) {
                if (i + j < allBeats.length) {
                    beats.push(allBeats[i + j]);
                } else {
                    // Fill remaining slots with empty beats
                    beats.push({ value: '', held: false });
                }
            }
            bars.push({ type: 'bar', beats });
        }

        return bars;
    }

    renderChordWithNotation(notation, wrapWithPush = true) {
        // Render a chord with seventh, suspended, and/or inversion notation
        if (!notation) return '';

        let chordHtml = '';

        // Check if it's an inversion (slash chord)
        if (notation.inversion) {
            // Render as a fraction
            chordHtml += '<span class="chord-inversion">';
            chordHtml += `<span class="inversion-top">${this.escapeHtml(notation.base)}</span>`;
            chordHtml += '<span class="inversion-slash">/</span>';
            chordHtml += `<span class="inversion-bottom">${this.escapeHtml(notation.inversion)}</span>`;
            chordHtml += '</span>';
        } else {
            // Regular chord
            chordHtml += this.escapeHtml(notation.base);
        }

        // Add diminished if present
        if (notation.diminished) {
            chordHtml += '<sup class="chord-diminished">o</sup>';
        }

        // Add seventh if present
        if (notation.seventh) {
            chordHtml += '<sup class="chord-seventh">7</sup>';
        }

        // Add suspended if present
        if (notation.suspended) {
            chordHtml += `<sup class="chord-suspended">${this.escapeHtml(notation.suspended)}</sup>`;
        }

        // Wrap with ticks, staccato and/or push notation if present
        if (notation.ticks || notation.staccato || (wrapWithPush && notation.push)) {
            let result = chordHtml;
            
            // Add tick marks above chord
            if (notation.ticks) {
                const ticksStr = "'".repeat(notation.ticks);
                const ticksHtml = `<span class="tick-marks">${ticksStr}</span>`;
                result = `<span class="chord-with-ticks">${ticksHtml}${result}</span>`;
            }
            
            // Add staccato symbol above chord
            if (notation.staccato) {
                const staccatoHtml = '<span class="staccato-symbol">^</span>';
                result = `<span class="chord-with-staccato">${staccatoHtml}${result}</span>`;
            }
            
            // Wrap with push notation if present
            if (wrapWithPush && notation.push) {
                const pushSymbol = notation.push === 'early' ? '&lt;' : '&gt;';
                const pushClass = notation.push === 'early' ? 'push-early' : 'push-late';
                result = `<span class="chord-with-push"><span class="push-symbol ${pushClass}">${pushSymbol}</span>${result}</span>`;
            }
            
            return result;
        }

        return chordHtml;
    }

    renderTiedChordPart(notation) {
        // Render a chord part for use within a tied chord group
        // Uses inline styling to keep push symbol above chord without breaking the underline
        if (!notation) return '';

        let chordHtml = '';

        // Check if it's an inversion (slash chord)
        if (notation.inversion) {
            chordHtml += '<span class="chord-inversion">';
            chordHtml += `<span class="inversion-top">${this.escapeHtml(notation.base)}</span>`;
            chordHtml += '<span class="inversion-slash">/</span>';
            chordHtml += `<span class="inversion-bottom">${this.escapeHtml(notation.inversion)}</span>`;
            chordHtml += '</span>';
        } else {
            chordHtml += this.escapeHtml(notation.base);
        }

        // Add diminished if present
        if (notation.diminished) {
            chordHtml += '<sup class="chord-diminished">o</sup>';
        }

        // Add seventh if present
        if (notation.seventh) {
            chordHtml += '<sup class="chord-seventh">7</sup>';
        }

        // Add suspended if present
        if (notation.suspended) {
            chordHtml += `<sup class="chord-suspended">${this.escapeHtml(notation.suspended)}</sup>`;
        }

        // For tied chords, wrap with ticks, staccato and/or push notation using inline display
        // This preserves the underline across all tied chords
        if (notation.ticks || notation.staccato || notation.push) {
            let result = chordHtml;
            
            // Add tick marks above chord
            if (notation.ticks) {
                const ticksStr = "'".repeat(notation.ticks);
                const ticksHtml = `<span class="tick-marks">${ticksStr}</span>`;
                result = `<span class="tied-chord-ticks">${ticksHtml}${result}</span>`;
            }
            
            // Add staccato symbol above chord
            if (notation.staccato) {
                const staccatoHtml = '<span class="staccato-symbol">^</span>';
                result = `<span class="tied-chord-staccato">${staccatoHtml}${result}</span>`;
            }
            
            // Wrap with push notation if present
            if (notation.push) {
                const pushSymbol = notation.push === 'early' ? '&lt;' : '&gt;';
                const pushClass = notation.push === 'early' ? 'push-early' : 'push-late';
                result = `<span class="tied-chord-part"><span class="push-symbol ${pushClass}">${pushSymbol}</span>${result}</span>`;
            } else if (notation.ticks || notation.staccato) {
                // If only ticks or staccato (no push), still need the tied-chord-part wrapper for proper inline display
                result = `<span class="tied-chord-part">${result}</span>`;
            }
            
            return result;
        }

        return chordHtml;
    }

    renderTimeSig(time) {
        // Render time signature as diagonal fraction like chord inversions
        if (!time) return '';
        
        if (time.includes('/')) {
            const parts = time.split('/');
            return `<span class="time-sig-fraction"><span class="time-top">${this.escapeHtml(parts[0])}</span><span class="time-slash">/</span><span class="time-bottom">${this.escapeHtml(parts[1])}</span></span>`;
        }
        return this.escapeHtml(time);
    }

    renderRepeatSymbol(type) {
        // Render authentic music notation repeat symbols
        // Start repeat: thick bar, thin bar, dots (reading left to right)
        // End repeat: dots, thin bar, thick bar (reading left to right)
        
        const dotsHtml = `<span class="repeat-dots"><span class="repeat-dot"></span><span class="repeat-dot"></span></span>`;
        
        if (type === 'start') {
            return `<span class="repeat-start repeat-symbol">
                <span class="repeat-bars">
                    <span class="repeat-bar-thick"></span>
                    <span class="repeat-bar-thin"></span>
                </span>
                ${dotsHtml}
            </span>`;
        } else {
            return `<span class="repeat-end repeat-symbol">
                ${dotsHtml}
                <span class="repeat-bars">
                    <span class="repeat-bar-thin"></span>
                    <span class="repeat-bar-thick"></span>
                </span>
            </span>`;
        }
    }

    renderChart(sections, metadata, twoColumn = false) {
        let html = '';

        // Render header with title centered and tempo/key on right
        html += '<div class="chart-header">';

        // Left spacer for centering
        html += '<div class="header-left"></div>';

        // Center title
        if (metadata.title) {
            html += `<div class="chart-title">${this.escapeHtml(metadata.title)}</div>`;
        } else {
            html += '<div class="chart-title"></div>';
        }

        // Right info (key, tempo and time)
        html += '<div class="header-right">';
        const headerParts = [];
        if (metadata.key) {
            headerParts.push(`<span class="key-display">${this.escapeHtml(metadata.key)}</span>`);
        }
        if (metadata.tempo) {
            headerParts.push(`<span class="tempo-display">${this.escapeHtml(metadata.tempo)} bpm</span>`);
        }
        if (metadata.time) {
            headerParts.push(`<span class="time-display">${this.renderTimeSig(metadata.time)}</span>`);
        }
        html += headerParts.join('<span class="separator"> • </span>');
        html += '</div>';

        html += '</div>';

        // Render chart content
        const columnClass = twoColumn ? 'two-column' : '';
        html += `<div class="chart-content ${columnClass}">`;

        for (const section of sections) {
            html += '<div class="chart-section">';

            // Section wrapper with label and bars
            html += '<div class="section-wrapper">';

            // Add section label if exists
            if (section.name) {
                const abbr = section.name.abbr || section.name;
                html += `<div class="section-label"><span class="section-box">${this.escapeHtml(abbr)}</span></div>`;
            } else {
                // Empty placeholder to maintain grid structure
                html += '<div class="section-label"></div>';
            }

            // Bars container
            html += '<div class="chart-bars">';
            for (const bar of section.bars) {
                if (bar.type === 'repeat') {
                    // Legacy repeat marker - shouldn't happen with new parsing
                    html += `<div class="repeat-marker">${this.escapeHtml(bar.marker)}</div>`;
                } else {
                    // Each beat becomes a grid cell
                    for (let beatIndex = 0; beatIndex < bar.beats.length; beatIndex++) {
                        const beat = bar.beats[beatIndex];
                        const isFirstBeat = beatIndex === 0;
                        const isLastBeat = beatIndex === bar.beats.length - 1;
                        
                        // Beat is now an object with value, held, tied, and notation properties
                        const displayBeat = beat.value || '';

                        // Build the chord content
                        let chordHtml = '';
                        if (beat.held && beat.value) {
                            // Held chord in diamond
                            // Render chord content without push wrapper (we'll wrap the diamond)
                            const chordContent = beat.notation ? this.renderChordWithNotation(beat.notation, false) : this.escapeHtml(displayBeat);
                            let diamondHtml = `<span class="diamond"><span class="diamond-text">${chordContent}</span></span>`;
                            
                            // Wrap diamond with push notation if present
                            if (beat.notation && beat.notation.push) {
                                const pushSymbol = beat.notation.push === 'early' ? '&lt;' : '&gt;';
                                const pushClass = beat.notation.push === 'early' ? 'push-early' : 'push-late';
                                chordHtml = `<span class="chord-with-push"><span class="push-symbol ${pushClass}">${pushSymbol}</span>${diamondHtml}</span>`;
                            } else {
                                chordHtml = diamondHtml;
                            }
                        } else if (beat.tied && beat.value) {
                            // Tied chords are underlined and grouped tightly
                            // Each tied chord can have its own push notation displayed above it
                            if (beat.tiedNotations) {
                                chordHtml = beat.tiedNotations.map(notation => this.renderTiedChordPart(notation)).join('');
                            } else {
                                const tiedParts = beat.value.split('_').map(p => this.escapeHtml(p)).join('');
                                chordHtml = tiedParts;
                            }
                        } else if (displayBeat) {
                            // Regular chord with potential notation
                            chordHtml = beat.notation ? this.renderChordWithNotation(beat.notation) : this.escapeHtml(displayBeat);
                        }

                        // Determine beat classes
                        let beatClasses = 'beat';
                        if (beat.held && beat.value) beatClasses += ' held-chord';
                        if (beat.tied && beat.value) beatClasses += ' tied-chord';

                        // Add start repeat symbol before first beat if needed
                        let startRepeatHtml = '';
                        if (isFirstBeat && bar.startRepeat) {
                            startRepeatHtml = this.renderRepeatSymbol('start');
                        }

                        // Add end repeat symbol after last beat if needed
                        let endRepeatHtml = '';
                        if (isLastBeat && bar.endRepeat) {
                            endRepeatHtml = this.renderRepeatSymbol('end');
                        }

                        // Wrap beat with repeat symbols if needed
                        if (startRepeatHtml || endRepeatHtml) {
                            html += `<span class="${beatClasses} beat-with-repeat">${startRepeatHtml}${chordHtml}${endRepeatHtml}</span>`;
                        } else {
                            html += `<span class="${beatClasses}">${chordHtml}</span>`;
                        }
                    }

                    // Add comment if this bar has one
                    if (bar.comment) {
                        html += `<div class="bar-comment">${this.escapeHtml(bar.comment)}</div>`;
                    }
                }
            }
            html += '</div>'; // Close chart-bars

            html += '</div>'; // Close section-wrapper
            html += '</div>'; // Close chart-section
        }

        html += '</div>';

        // Render footer with songwriter and charted by at bottom right
        html += '<div class="chart-footer">';
        if (metadata.songwriter) {
            html += `<div class="songwriter-credit">artist: ${this.escapeHtml(metadata.songwriter)}</div>`;
        }
        if (metadata.chartedBy) {
            html += `<div class="charted-by-credit">chart by: ${this.escapeHtml(metadata.chartedBy)}</div>`;
        }
        html += '</div>';

        return html;
    }

    updatePreview() {
        const metadata = {
            title: this.titleInput.value,
            key: this.keyInput.value,
            tempo: this.tempoInput.value,
            time: this.timeInput.value,
            songwriter: this.songwriterInput.value,
            chartedBy: this.chartedByInput.value
        };

        const chartText = this.chartInput.value;
        const sections = this.parseChart(chartText);
        const twoColumn = this.twoColumnToggle.checked;
        const selectedFont = this.fontSelect.value;
        const selectedSize = this.fontSizeSelect.value;

        const html = this.renderChart(sections, metadata, twoColumn);
        this.chartPreview.innerHTML = html;
        this.printView.innerHTML = html;

        // Apply font and size classes
        this.chartPreview.className = `chart-preview font-${selectedFont} size-${selectedSize}`;
        this.printView.className = `print-only font-${selectedFont} size-${selectedSize}`;

        // Auto-save to localStorage on any change
        this.autoSave();
    }

    autoSave() {
        const currentData = {
            title: this.titleInput.value,
            key: this.keyInput.value,
            tempo: this.tempoInput.value,
            time: this.timeInput.value,
            songwriter: this.songwriterInput.value,
            chartedBy: this.chartedByInput.value,
            chart: this.chartInput.value,
            twoColumn: this.twoColumnToggle.checked,
            font: this.fontSelect.value,
            fontSize: this.fontSizeSelect.value
        };
        localStorage.setItem('nns_current_chart', JSON.stringify(currentData));
    }

    loadAutoSave() {
        const saved = localStorage.getItem('nns_current_chart');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.titleInput.value = data.title || '';
                this.keyInput.value = data.key || '';
                this.tempoInput.value = data.tempo || '';
                this.timeInput.value = data.time || '';
                this.songwriterInput.value = data.songwriter || '';
                this.chartedByInput.value = data.chartedBy || 'John Hayden';
                this.chartInput.value = data.chart || '';
                this.twoColumnToggle.checked = data.twoColumn !== undefined ? data.twoColumn : true;
                this.fontSelect.value = data.font || 'handwriting';
                this.fontSizeSelect.value = data.fontSize || 'medium';
            } catch (e) {
                console.error('Failed to load auto-save:', e);
            }
        }
    }

    saveChart() {
        const title = this.titleInput.value.trim() || 'Untitled Chart';
        const key = this.keyInput.value.trim();
        const tempo = this.tempoInput.value.trim();
        const time = this.timeInput.value.trim();
        const songwriter = this.songwriterInput.value.trim();
        const chartedBy = this.chartedByInput.value.trim();
        const chart = this.chartInput.value;

        const chartData = {
            id: this.currentChartId || Date.now().toString(),
            title,
            key,
            tempo,
            time,
            songwriter,
            chartedBy,
            chart,
            savedAt: new Date().toISOString()
        };

        // Update or add chart
        const existingIndex = this.charts.findIndex(c => c.id === chartData.id);
        if (existingIndex >= 0) {
            this.charts[existingIndex] = chartData;
        } else {
            this.charts.push(chartData);
        }

        this.currentChartId = chartData.id;
        this.saveChartsToStorage();
        this.renderSavedCharts();

        alert(`Chart "${title}" saved successfully!`);
    }

    newChart() {
        if (this.chartInput.value.trim() && !confirm('Start a new chart? Any unsaved changes will be lost.')) {
            return;
        }

        this.currentChartId = null;
        this.titleInput.value = '';
        this.keyInput.value = '';
        this.tempoInput.value = '';
        this.timeInput.value = '';
        this.songwriterInput.value = '';
        this.chartedByInput.value = 'John Hayden';
        this.chartInput.value = '';
        this.twoColumnToggle.checked = true;
        this.fontSelect.value = 'handwriting';
        this.fontSizeSelect.value = 'medium';
        this.updatePreview();
    }

    loadChart(chartId) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        this.currentChartId = chartId;
        this.titleInput.value = chart.title || '';
        this.songwriterInput.value = chart.songwriter || '';
        this.chartedByInput.value = chart.chartedBy || 'John Hayden';
        this.keyInput.value = chart.key || '';
        this.tempoInput.value = chart.tempo || '';
        this.timeInput.value = chart.time || '';
        this.chartInput.value = chart.chart || '';
        this.updatePreview();
    }

    deleteChart(chartId) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        if (!confirm(`Delete chart "${chart.title}"?`)) return;

        this.charts = this.charts.filter(c => c.id !== chartId);
        if (this.currentChartId === chartId) {
            this.currentChartId = null;
        }
        this.saveChartsToStorage();
        this.renderSavedCharts();
    }

    renderSavedCharts() {
        if (this.charts.length === 0) {
            this.savedChartsList.innerHTML = '<p style="color: #999; font-size: 13px;">No saved charts yet</p>';
            return;
        }

        this.savedChartsList.innerHTML = this.charts
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
            .map(chart => {
                const metaParts = [];
                if (chart.key) metaParts.push(`Key: ${chart.key}`);
                if (chart.tempo) metaParts.push(`${chart.tempo} BPM`);
                const meta = metaParts.join(' • ');

                return `
                    <div class="saved-chart-item" data-id="${chart.id}">
                        <div class="saved-chart-info">
                            <div class="saved-chart-title">${this.escapeHtml(chart.title)}</div>
                            ${meta ? `<div class="saved-chart-meta">${this.escapeHtml(meta)}</div>` : ''}
                        </div>
                        <button class="delete-chart-btn" data-id="${chart.id}">Delete</button>
                    </div>
                `;
            })
            .join('');

        // Attach event listeners
        this.savedChartsList.querySelectorAll('.saved-chart-item').forEach(item => {
            const chartId = item.getAttribute('data-id');
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-chart-btn')) {
                    this.loadChart(chartId);
                }
            });
        });

        this.savedChartsList.querySelectorAll('.delete-chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chartId = btn.getAttribute('data-id');
                this.deleteChart(chartId);
            });
        });
    }

    loadChartsFromStorage() {
        const saved = localStorage.getItem('nns_saved_charts');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load charts:', e);
                return [];
            }
        }
        return [];
    }

    saveChartsToStorage() {
        localStorage.setItem('nns_saved_charts', JSON.stringify(this.charts));
    }

    printChart() {
        window.print();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NNSChartApp();
    app.loadAutoSave();
});
