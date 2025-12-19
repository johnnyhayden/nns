// Nashville Number System Chart Maker

class NNSChartApp {
    constructor() {
        this.currentChartId = null;
        this.supportsFileSystemAccess = 'showDirectoryPicker' in window;
        this.directoryHandle = null;
        this.useFileSystem = false;
        this.indexedDB = null;
        this.charts = [];

        this.initializeElements();
        this.attachEventListeners();

        // Async initialization
        this.initAsync();
    }

    async initAsync() {
        if (this.supportsFileSystemAccess) {
            try {
                await this.initIndexedDB();
                await this.loadDirectoryHandleFromDB();
            } catch (error) {
                console.error('Failed to initialize file system:', error);
            }
        }

        await this.loadCharts();
        this.renderSavedCharts();
        this.loadAutoSave();
        this.updatePreview();
        this.updateDirectoryUI();
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

        // Storage toggle button
        const storageToggleBtn = document.getElementById('storage-toggle-btn');
        if (storageToggleBtn) {
            storageToggleBtn.addEventListener('click', () => this.toggleStorageMode());
        }
    }

    loadDemo() {
        this.titleInput.value = 'My Demo Song';
        this.keyInput.value = 'C';
        this.tempoInput.value = '120';
        this.timeInput.value = '4/4';
        this.songwriterInput.value = 'Larry Laffer';
        this.chartedByInput.value = 'John Hayden';

        const demoChart = `#This is a demonstration chart showing various notation features
I: 1 5 6- 4
I: 1 5 6- 4

v1: 1 4 5 1
#Diamond and tied chords
<1> 4 5 1
1_4_5_1 2- 5 1

C: 17 5 6- 4
||:
1 5 6- 4
:||

v2: 1^ 4^ 5^ 1^
#Staccato accent and push notation
1 4< 5> 1

v3: 1* 4* 5* 1*
#Staccato dots
1_4*_5* 1

B: 4sus 5/1 7o 1
#Suspended, inversion, diminished

Solo: 5 5 4 4
5 5 4 4
3- 3- 2- 2-
1 1 1 1

C: 1 5 6- 4

Tag: 1'_4''' 1''_4'_5' <1>
#Beat tick marks, ending on diamond`;

        this.chartInput.value = demoChart;
        this.twoColumnToggle.checked = true;
        this.fontSelect.value = 'handwriting';
        this.fontSizeSelect.value = 'large';
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

                // Check if we just started a new line with a number (auto-indent)
                if (charBefore === '\n' || (cursorPos === 1 && beforeCursor === justTyped)) {
                    // Find the previous line
                    const lines = beforeCursor.split('\n');
                    if (lines.length >= 2) {
                        const previousLine = lines[lines.length - 2];

                        // Find where the first chord starts in the previous line
                        // Skip section labels (format: "X:" or "XX:" etc.)
                        const sectionMatch = previousLine.match(/^([A-Za-z0-9]{1,4}):+\s*/);
                        let firstChordPos = 0;

                        if (sectionMatch) {
                            // Previous line has a section label, find first chord after it
                            const afterLabel = previousLine.substring(sectionMatch[0].length);
                            const firstChordMatch = afterLabel.match(/\d/);
                            if (firstChordMatch) {
                                firstChordPos = sectionMatch[0].length + firstChordMatch.index;
                            }
                        } else {
                            // No section label, find first number
                            const firstChordMatch = previousLine.match(/\d/);
                            if (firstChordMatch) {
                                firstChordPos = firstChordMatch.index;
                            }
                        }

                        // Add spaces to align with the first chord position
                        if (firstChordPos > 0) {
                            const spaces = ' '.repeat(firstChordPos);
                            const newText = text.substring(0, cursorPos - 1) + spaces + justTyped + text.substring(cursorPos);
                            textarea.value = newText;
                            textarea.selectionStart = textarea.selectionEnd = cursorPos + firstChordPos;
                            this.updatePreview();
                            return;
                        }
                    }
                }

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
        let headerComment = null;
        let isFirstLine = true;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check if this is a comment line
            if (trimmed.startsWith('#')) {
                const comment = trimmed.substring(1).trim();

                // If this is the first line, treat it as a header comment
                if (isFirstLine) {
                    headerComment = comment;
                    isFirstLine = false;
                    continue;
                }

                // Otherwise, attach comment to the last bar in current section
                if (currentSection && currentSection.bars.length > 0) {
                    const lastBar = currentSection.bars[currentSection.bars.length - 1];
                    lastBar.comment = comment;
                }
                continue;
            }

            isFirstLine = false;

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
                    // Always create a new section when label has content on same line
                    currentSection = { name: sectionName, bars: [] };
                    sections.push(currentSection);
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

        return { sections, headerComment };
    }

    processSectionLabel(label) {
        // Determine how to render the section label
        // Rules:
        // - 3+ letters: preserve original case
        // - 1-2 letters: If mixed case, render mixed case. If upper/lower only, render upper case.

        let displayLabel = label;

        if (label.length >= 3) {
            // 3 or more letters - preserve original case
            displayLabel = label;
        } else {
            // 1-2 letters - apply case rules
            const hasUpper = /[A-Z]/.test(label);
            const hasLower = /[a-z]/.test(label);

            if (hasUpper && hasLower) {
                // Mixed case - keep as is
                displayLabel = label;
            } else {
                // All upper or all lower - render as upper case
                displayLabel = label.toUpperCase();
            }
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
        // Returns: { base, seventh, suspended, diminished, inversion, push, staccato, staccatoDot, ticks }

        let remaining = chordStr;
        let seventh = false;
        let suspended = null; // 's', 'sus', 'sus2', or 'sus4'
        let diminished = false;
        let inversion = null; // bass note for slash chords
        let push = null; // 'early' (<) or 'late' (>)
        let staccato = false; // ^ for staccato accent
        let staccatoDot = false; // * for staccato dot
        let ticks = 0; // number of tick marks (') for beat count

        // Check for tick marks at the end (e.g., 1', 4'', 5''')
        const tickMatch = remaining.match(/'+$/);
        if (tickMatch) {
            ticks = tickMatch[0].length;
            remaining = remaining.slice(0, -ticks);
        }

        // Check for staccato dot at the end (*)
        if (remaining.endsWith('*')) {
            staccatoDot = true;
            remaining = remaining.slice(0, -1);
        }

        // Check for staccato accent at the end (^)
        if (remaining.endsWith('^')) {
            staccato = true;
            remaining = remaining.slice(0, -1);
        }

        // Check for push notation
        // Early push: < at the END (e.g., 4<)
        // Late push: > at the END (e.g., 5>)
        if (remaining.endsWith('<')) {
            push = 'early';
            remaining = remaining.slice(0, -1);
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
            staccatoDot,
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
            // Early push diamond: <5<> (push symbol < at end before closing >)
            // Late push diamond: <5>> (push symbol > at end before closing >)
            const earlyPushDiamondMatch = part.match(/^<(.+)<>$/);
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
                // Parse each tied chord, checking for diamonds and push notation
                const tiedParts = part.split('_');
                const parsedTiedParts = tiedParts.map(p => {
                    // Check if this tied part is a diamond (held chord)
                    const heldMatch = p.match(/^<(.+)>$/);
                    if (heldMatch) {
                        // It's a held chord within tied notation
                        return {
                            held: true,
                            notation: this.parseChordNotation(heldMatch[1])
                        };
                    }
                    // Regular tied part with potential push notation
                    return {
                        held: false,
                        notation: this.parseChordNotation(p)
                    };
                });

                // Validate that total tick marks don't exceed 4 within this beat
                const totalTicks = parsedTiedParts.reduce((sum, part) => {
                    return sum + (part.notation?.ticks || 0);
                }, 0);

                if (totalTicks > 4) {
                    // Cap tick marks at 4 total - reduce from right to left
                    let remaining = 4;
                    for (let i = 0; i < parsedTiedParts.length; i++) {
                        const part = parsedTiedParts[i];
                        if (part.notation && part.notation.ticks > 0) {
                            const allowedTicks = Math.min(part.notation.ticks, remaining);
                            part.notation.ticks = allowedTicks;
                            remaining -= allowedTicks;
                        }
                    }
                }

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

        // Wrap with ticks, staccato, staccato dot and/or push notation if present
        if (notation.ticks || notation.staccato || notation.staccatoDot || (wrapWithPush && notation.push)) {
            let result = chordHtml;

            // Add tick marks above chord
            if (notation.ticks) {
                const ticksStr = "'".repeat(notation.ticks);
                const ticksHtml = `<span class="tick-marks">${ticksStr}</span>`;
                result = `<span class="chord-with-ticks">${ticksHtml}${result}</span>`;
            }

            // Add staccato dot above chord
            if (notation.staccatoDot) {
                const staccatoDotHtml = '<span class="staccato-dot-symbol">•</span>';
                result = `<span class="chord-with-staccato-dot">${staccatoDotHtml}${result}</span>`;
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

        // For tied chords, wrap with ticks, staccato, staccato dot and/or push notation using inline display
        // This preserves the underline across all tied chords
        if (notation.ticks || notation.staccato || notation.staccatoDot || notation.push) {
            let result = chordHtml;

            // Add tick marks above chord
            if (notation.ticks) {
                const ticksStr = "'".repeat(notation.ticks);
                const ticksHtml = `<span class="tick-marks">${ticksStr}</span>`;
                result = `<span class="tied-chord-ticks">${ticksHtml}${result}</span>`;
            }

            // Add staccato dot above chord
            if (notation.staccatoDot) {
                const staccatoDotHtml = '<span class="staccato-dot-symbol">•</span>';
                result = `<span class="tied-chord-staccato-dot">${staccatoDotHtml}${result}</span>`;
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
            } else if (notation.ticks || notation.staccato || notation.staccatoDot) {
                // If only ticks, staccato, or staccato dot (no push), still need the tied-chord-part wrapper for proper inline display
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

    renderChart(sections, metadata, twoColumn = false, headerComment = null) {
        let html = '';

        // Render header with key/time on left, title centered, tempo on right
        html += '<div class="chart-header">';

        // Left info (key and time)
        html += '<div class="header-left">';
        const leftParts = [];
        if (metadata.key) {
            leftParts.push(`<span class="key-display"><span class="key-circle">${this.escapeHtml(metadata.key)}</span></span>`);
        }
        if (metadata.time) {
            leftParts.push(`<span class="time-display">${this.renderTimeSig(metadata.time)}</span>`);
        }
        html += leftParts.join('<span class="separator"> </span>');
        html += '</div>';

        // Center title
        if (metadata.title) {
            html += `<div class="chart-title">${this.escapeHtml(metadata.title)}</div>`;
        } else {
            html += '<div class="chart-title"></div>';
        }

        // Right info (tempo)
        html += '<div class="header-right">';
        if (metadata.tempo) {
            html += `<span class="tempo-display">${this.escapeHtml(metadata.tempo)} bpm</span>`;
        }
        html += '</div>';

        html += '</div>';

        // Render header comment if present
        if (headerComment) {
            html += `<div class="chart-header-comment">${this.escapeHtml(headerComment)}</div>`;
        }

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
                    // Render repeat markers
                    const markerClass = bar.marker === 'start' ? 'repeat-start-marker' : 'repeat-end-marker';
                    const markerSymbol = bar.marker === 'start' ? '||:' : ':||';
                    html += `<div class="${markerClass}">${this.escapeHtml(markerSymbol)}</div>`;
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
                                chordHtml = beat.tiedNotations.map(tiedPart => {
                                    if (tiedPart.held) {
                                        // Render as diamond within tied notation
                                        const chordContent = this.renderChordWithNotation(tiedPart.notation, false);
                                        let diamondHtml = `<span class="diamond"><span class="diamond-text">${chordContent}</span></span>`;
                                        // Wrap diamond with push notation if present
                                        if (tiedPart.notation && tiedPart.notation.push) {
                                            const pushSymbol = tiedPart.notation.push === 'early' ? '&lt;' : '&gt;';
                                            const pushClass = tiedPart.notation.push === 'early' ? 'push-early' : 'push-late';
                                            return `<span class="chord-with-push"><span class="push-symbol ${pushClass}">${pushSymbol}</span>${diamondHtml}</span>`;
                                        }
                                        return diamondHtml;
                                    }
                                    // Regular tied part
                                    return this.renderTiedChordPart(tiedPart.notation);
                                }).join(' ');
                            } else {
                                const tiedParts = beat.value.split('_').map(p => this.escapeHtml(p)).join(' ');
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
            html += `<div class="songwriter-credit">${this.escapeHtml(metadata.songwriter)}</div>`;
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
        const { sections, headerComment } = this.parseChart(chartText);
        const twoColumn = this.twoColumnToggle.checked;
        const selectedFont = this.fontSelect.value;
        const selectedSize = this.fontSizeSelect.value;

        const html = this.renderChart(sections, metadata, twoColumn, headerComment);
        this.chartPreview.innerHTML = html;
        this.printView.innerHTML = html;

        // Apply font and size classes
        this.chartPreview.className = `chart-preview font-${selectedFont} size-${selectedSize}`;
        this.printView.className = `print-only font-${selectedFont} size-${selectedSize}`;

        // Update document title for PDF filename
        if (metadata.title && metadata.title.trim()) {
            let pdfTitle = metadata.title.trim();
            if (metadata.songwriter && metadata.songwriter.trim()) {
                pdfTitle += ' - ' + metadata.songwriter.trim();
            }
            document.title = pdfTitle;
        } else {
            document.title = 'Nashville Number System Chart Maker';
        }

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
                this.chartedByInput.value = data.chartedBy || '';
                this.chartInput.value = data.chart || '';
                this.twoColumnToggle.checked = data.twoColumn !== undefined ? data.twoColumn : true;
                this.fontSelect.value = data.font || 'handwriting';
                this.fontSizeSelect.value = data.fontSize || 'large';
            } catch (e) {
                console.error('Failed to load auto-save:', e);
            }
        }
    }

    async saveChart() {
        // Check if we should prompt for directory
        if (this.supportsFileSystemAccess && !this.useFileSystem && !this.directoryHandle) {
            const shouldUseFS = confirm(
                'Save charts to a folder on your computer?\n\n' +
                'Benefits:\n' +
                '• Easy backup and sharing\n' +
                '• Access charts outside browser\n' +
                '\n' +
                'Choose "Cancel" to use browser storage instead.'
            );

            if (shouldUseFS) {
                const success = await this.promptForDirectory();
                if (!success) {
                    // User cancelled, fall back to localStorage
                    this.saveChartToLocalStorage();
                    return;
                }
            } else {
                // User chose localStorage
                this.saveChartToLocalStorage();
                return;
            }
        }

        const chartData = {
            id: this.currentChartId || Date.now().toString(),
            title: this.titleInput.value.trim() || 'Untitled Chart',
            key: this.keyInput.value.trim(),
            tempo: this.tempoInput.value.trim(),
            time: this.timeInput.value.trim(),
            songwriter: this.songwriterInput.value.trim(),
            chartedBy: this.chartedByInput.value.trim(),
            chart: this.chartInput.value,
            savedAt: new Date().toISOString()
        };

        try {
            if (this.useFileSystem) {
                await this.saveChartToFile(chartData);
            } else {
                this.saveChartToLocalStorage(chartData);
            }

            this.currentChartId = null;
            await this.loadCharts();
            this.renderSavedCharts();
            this.flashSaveButton();

        } catch (error) {
            console.error('Failed to save chart:', error);
            this.flashSaveButton(true); // Pass true to indicate error
        }
    }

    saveChartToLocalStorage(chartData) {
        if (!chartData) {
            chartData = {
                id: this.currentChartId || Date.now().toString(),
                title: this.titleInput.value.trim() || 'Untitled Chart',
                key: this.keyInput.value.trim(),
                tempo: this.tempoInput.value.trim(),
                time: this.timeInput.value.trim(),
                songwriter: this.songwriterInput.value.trim(),
                chartedBy: this.chartedByInput.value.trim(),
                chart: this.chartInput.value,
                savedAt: new Date().toISOString()
            };
        }

        const charts = this.loadChartsFromLocalStorage();
        const existingIndex = charts.findIndex(c => c.id === chartData.id);

        if (existingIndex >= 0) {
            charts[existingIndex] = chartData;
        } else {
            charts.push(chartData);
        }

        localStorage.setItem('nns_saved_charts', JSON.stringify(charts));
        this.charts = charts;
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
        this.chartedByInput.value = '';
        this.chartInput.value = '';
        this.twoColumnToggle.checked = true;
        this.fontSelect.value = 'handwriting';
        this.fontSizeSelect.value = 'large';
        this.updatePreview();
    }

    loadChart(chartId) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        this.currentChartId = chartId;
        this.titleInput.value = chart.title || '';
        this.songwriterInput.value = chart.songwriter || '';
        this.chartedByInput.value = chart.chartedBy || '';
        this.keyInput.value = chart.key || '';
        this.tempoInput.value = chart.tempo || '';
        this.timeInput.value = chart.time || '';
        this.chartInput.value = chart.chart || '';
        this.updatePreview();
    }

    async deleteChart(chartId) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        if (!confirm(`Delete chart "${chart.title}"?`)) return;

        try {
            if (this.useFileSystem) {
                const filename = this.sanitizeFilename(chart.title, chart.songwriter) + '.nns';
                await this.deleteChartFile(filename);
            } else {
                const charts = this.loadChartsFromLocalStorage();
                const filtered = charts.filter(c => c.id !== chartId);
                localStorage.setItem('nns_saved_charts', JSON.stringify(filtered));
            }

            if (this.currentChartId === chartId) {
                this.currentChartId = null;
            }

            await this.loadCharts();
            this.renderSavedCharts();

        } catch (error) {
            console.error('Failed to delete chart:', error);
            alert(`Failed to delete chart: ${error.message}`);
        }
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

    flashSaveButton(isError = false) {
        const originalText = this.saveBtn.textContent;
        const originalClass = this.saveBtn.className;

        // Lock the width to prevent resize
        const currentWidth = this.saveBtn.offsetWidth;
        this.saveBtn.style.width = `${currentWidth}px`;

        if (isError) {
            this.saveBtn.textContent = 'Error!';
            this.saveBtn.classList.add('btn-error');
        } else {
            this.saveBtn.textContent = 'Saved';
            this.saveBtn.classList.add('btn-saved');
        }

        // Fade back after 1.5 seconds
        setTimeout(() => {
            this.saveBtn.classList.add('btn-fade');

            setTimeout(() => {
                this.saveBtn.textContent = originalText;
                this.saveBtn.className = originalClass;
                this.saveBtn.style.width = ''; // Remove fixed width
            }, 300); // Match CSS transition duration
        }, 1500);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // IndexedDB methods for directory handle persistence
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('nns_db', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.indexedDB = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            };
        });
    }

    async saveDirectoryHandle(handle) {
        return new Promise((resolve, reject) => {
            const tx = this.indexedDB.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            const request = store.put(handle, 'directory_handle');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadDirectoryHandleFromDB() {
        if (!this.indexedDB) return;

        return new Promise((resolve, reject) => {
            const tx = this.indexedDB.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get('directory_handle');
            request.onsuccess = async () => {
                const handle = request.result;
                if (handle) {
                    const permission = await this.verifyDirectoryPermission(handle);
                    if (permission) {
                        this.directoryHandle = handle;
                        this.useFileSystem = true;
                    }
                }
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearDirectoryHandle() {
        if (!this.indexedDB) return;

        return new Promise((resolve, reject) => {
            const tx = this.indexedDB.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            const request = store.delete('directory_handle');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async verifyDirectoryPermission(handle) {
        const options = { mode: 'readwrite' };
        const permission = await handle.queryPermission(options);

        if (permission === 'granted') return true;
        if (permission === 'prompt') {
            const result = await handle.requestPermission(options);
            return result === 'granted';
        }
        return false;
    }

    // File system operations
    async promptForDirectory() {
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });

            await this.saveDirectoryHandle(handle);
            this.directoryHandle = handle;
            this.useFileSystem = true;
            this.updateDirectoryUI();

            // Offer to migrate existing charts
            await this.offerMigration();

            return true;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to select directory:', error);
            }
            return false;
        }
    }

    sanitizeFilename(title, artist) {
        let filename = '';

        if (title && title.trim()) {
            filename = title.trim();
        } else {
            filename = 'Untitled Chart';
        }

        if (artist && artist.trim()) {
            filename += ' - ' + artist.trim();
        }

        return filename.replace(/[/\\:*?"<>|]/g, '_');
    }

    formatNNSFile(chartData) {
        const metadata = [
            '---',
            `title: ${chartData.title || 'Untitled Chart'}`,
            `key: ${chartData.key || ''}`,
            `tempo: ${chartData.tempo || ''}`,
            `time: ${chartData.time || ''}`,
            `songwriter: ${chartData.songwriter || ''}`,
            `chartedBy: ${chartData.chartedBy || ''}`,
            `savedAt: ${chartData.savedAt || new Date().toISOString()}`,
            '---'
        ];

        return metadata.join('\n') + '\n' + (chartData.chart || '');
    }

    parseNNSFile(fileContent) {
        const parts = fileContent.split('\n---\n');
        if (parts.length < 2 || !fileContent.startsWith('---')) {
            throw new Error('Invalid .nns file format');
        }

        const metadataSection = parts[0].replace(/^---\n/, '');
        const metadata = {};

        for (const line of metadataSection.split('\n')) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                metadata[key] = value;
            }
        }

        const chart = parts.slice(1).join('\n---\n').trim();

        return {
            id: metadata.savedAt || Date.now().toString(),
            title: metadata.title || 'Untitled Chart',
            key: metadata.key || '',
            tempo: metadata.tempo || '',
            time: metadata.time || '',
            songwriter: metadata.songwriter || '',
            chartedBy: metadata.chartedBy || '',
            chart: chart,
            savedAt: metadata.savedAt || new Date().toISOString()
        };
    }

    async writeNNSFile(directoryHandle, filename, content) {
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async readNNSFile(fileHandle) {
        const file = await fileHandle.getFile();
        const content = await file.text();
        return this.parseNNSFile(content);
    }

    async deleteChartFile(filename) {
        if (!this.directoryHandle) return;
        await this.directoryHandle.removeEntry(filename);
    }

    async loadChartsFromDirectory() {
        if (!this.directoryHandle) return [];

        const permission = await this.verifyDirectoryPermission(this.directoryHandle);
        if (!permission) {
            throw new Error('Permission denied');
        }

        const charts = [];

        for await (const entry of this.directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.nns')) {
                try {
                    const chartData = await this.readNNSFile(entry);
                    charts.push(chartData);
                } catch (error) {
                    console.error(`Failed to read ${entry.name}:`, error);
                }
            }
        }

        return charts;
    }

    async saveChartToFile(chartData) {
        if (!this.directoryHandle) return;

        const filename = this.sanitizeFilename(chartData.title, chartData.songwriter) + '.nns';
        const content = this.formatNNSFile(chartData);

        await this.writeNNSFile(this.directoryHandle, filename, content);
    }

    async offerMigration() {
        const localCharts = this.loadChartsFromLocalStorage();

        if (localCharts.length === 0) return;

        const shouldMigrate = confirm(
            `Migrate ${localCharts.length} existing chart(s) from browser storage to this folder?`
        );

        if (!shouldMigrate) return;

        let migrated = 0;

        for (const chart of localCharts) {
            try {
                await this.saveChartToFile(chart);
                migrated++;
            } catch (error) {
                console.error(`Failed to migrate "${chart.title}":`, error);
            }
        }

        alert(`Migration complete! ${migrated} chart(s) saved to folder.`);

        await this.loadCharts();
        this.renderSavedCharts();
    }

    loadChartsFromLocalStorage() {
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

    async loadCharts() {
        try {
            if (this.useFileSystem && this.directoryHandle) {
                this.charts = await this.loadChartsFromDirectory();
            } else {
                this.charts = this.loadChartsFromLocalStorage();
            }
        } catch (error) {
            console.error('Failed to load charts:', error);
            this.charts = [];
        }
    }

    // Directory UI methods
    updateDirectoryUI() {
        const storageText = document.getElementById('storage-mode-text');
        const toggleBtn = document.getElementById('storage-toggle-btn');

        if (!storageText || !toggleBtn) return;

        if (this.useFileSystem && this.directoryHandle) {
            // Using filesystem storage
            storageText.textContent = `saving to folder ${this.directoryHandle.name}`;
            toggleBtn.textContent = '×';
            toggleBtn.title = 'Use browser storage instead';
        } else {
            // Using browser storage
            storageText.textContent = 'saving to browser storage';
            if (this.supportsFileSystemAccess) {
                toggleBtn.textContent = '+';
                toggleBtn.title = 'Use filesystem storage instead';
                toggleBtn.style.display = 'flex';
            } else {
                // Hide the toggle button if File System API is not supported
                toggleBtn.style.display = 'none';
            }
        }
    }

    async toggleStorageMode() {
        if (this.useFileSystem && this.directoryHandle) {
            // Currently using filesystem, switch to browser storage
            await this.clearDirectory();
        } else {
            // Currently using browser storage, switch to filesystem
            await this.promptForDirectory();
            if (this.useFileSystem) {
                // Successfully switched to filesystem
                await this.loadCharts();
                this.renderSavedCharts();
            }
        }
    }

    async clearDirectory() {
        if (!confirm('Clear saved directory?\n\nCharts will be loaded from browser storage instead.')) {
            return;
        }

        await this.clearDirectoryHandle();
        this.useFileSystem = false;
        this.directoryHandle = null;
        this.updateDirectoryUI();
        await this.loadCharts();
        this.renderSavedCharts();
    }

    async openDirectoryInFinder() {
        // File System Access API doesn't support opening in OS file manager
        // Show helpful message instead
        alert(
            'To open this folder:\n\n' +
            `1. Open Finder\n` +
            `2. Navigate to: ${this.directoryHandle.name}\n\n` +
            'Tip: You can bookmark this location in Finder for quick access.'
        );
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new NNSChartApp();
    app.loadAutoSave();
});
