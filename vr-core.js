// VR CrewWeb - Core utilities
(function() {
    'use strict';

    var VR = window.VR;

    // ===== CONSTANTS =====
    VR.MONTHS = ['januari','februari','mars','april','maj','juni',
                 'juli','augusti','september','oktober','november','december'];
    VR.MONTHS_SHORT = ['jan','feb','mar','apr','maj','jun',
                       'jul','aug','sep','okt','nov','dec'];
    VR.WEEKDAYS = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
    VR.WEEKDAYS_SHORT = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];

    // ===== MUNICIPALITY TAX RATES (Skåne) =====
    VR.MUNICIPALITIES = [
        { name: 'Bjuv', tax: 32.17 },
        { name: 'Bromölla', tax: 33.74 },
        { name: 'Burlöv', tax: 31.27 },
        { name: 'Båstad', tax: 31.41 },
        { name: 'Eslöv', tax: 31.72 },
        { name: 'Helsingborg', tax: 31.39 },
        { name: 'Hässleholm', tax: 32.38 },
        { name: 'Höganäs', tax: 30.91 },
        { name: 'Hörby', tax: 32.26 },
        { name: 'Höör', tax: 32.63 },
        { name: 'Klippan', tax: 31.93 },
        { name: 'Kristianstad', tax: 32.64 },
        { name: 'Kävlinge', tax: 29.59 },
        { name: 'Landskrona', tax: 32.42 },
        { name: 'Lomma', tax: 30.82 },
        { name: 'Lund', tax: 32.42 },
        { name: 'Malmö', tax: 32.42 },
        { name: 'Osby', tax: 33.32 },
        { name: 'Perstorp', tax: 32.87 },
        { name: 'Simrishamn', tax: 31.70 },
        { name: 'Sjöbo', tax: 31.52 },
        { name: 'Skurup', tax: 31.87 },
        { name: 'Staffanstorp', tax: 30.12 },
        { name: 'Svalöv', tax: 31.67 },
        { name: 'Svedala', tax: 31.42 },
        { name: 'Tomelilla', tax: 31.97 },
        { name: 'Trelleborg', tax: 31.77 },
        { name: 'Vellinge', tax: 29.68 },
        { name: 'Ystad', tax: 31.47 },
        { name: 'Åstorp', tax: 31.92 },
        { name: 'Ängelholm', tax: 31.17 },
        { name: 'Örkelljunga', tax: 30.24 },
        { name: 'Östra Göinge', tax: 32.97 }
    ];

    // Tax constants
    VR.CHURCH_TAX = 1.0;        // Kyrkskatt %
    VR.BURIAL_FEE = 0.29;       // Begravningsavgift %

    // Tax settings (defaults)
    VR.taxSettings = {
        municipality: 'Malmö',
        churchTax: true
    };

    // Get total tax rate
    VR.getTotalTaxRate = function() {
        var muni = VR.MUNICIPALITIES.find(function(m) {
            return m.name === VR.taxSettings.municipality;
        });
        var muniTax = muni ? muni.tax : 32.42;
        var churchTax = VR.taxSettings.churchTax ? VR.CHURCH_TAX : 0;
        return muniTax + churchTax + VR.BURIAL_FEE;
    };

    // ===== SCHEMA RELEASE DATE LOGIC =====
    // Schema for next month is released on the 15th (or last weekday before if weekend/holiday)
    VR.getSchemaReleaseDate = function(year, month) {
        var date = new Date(year, month, 15);

        // Go backwards until we find a weekday that's not a holiday
        while (VR.isWeekend(date) || VR.isSwedishHoliday(date)) {
            date.setDate(date.getDate() - 1);
        }

        return date;
    };

    VR.isWeekend = function(date) {
        var day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    };

    VR.isSwedishHoliday = function(date) {
        var d = date.getDate();
        var m = date.getMonth(); // 0-11
        var y = date.getFullYear();

        // Fixed holidays
        if (m === 0 && d === 1) return true;   // Nyårsdagen
        if (m === 0 && d === 6) return true;   // Trettondag
        if (m === 4 && d === 1) return true;   // 1 maj
        if (m === 5 && d === 6) return true;   // Nationaldagen
        if (m === 11 && d === 24) return true; // Julafton
        if (m === 11 && d === 25) return true; // Juldagen
        if (m === 11 && d === 26) return true; // Annandag jul
        if (m === 11 && d === 31) return true; // Nyårsafton

        // Easter-based holidays (simplified calculation)
        var easter = VR.getEasterDate(y);
        var easterMs = easter.getTime();
        var dateMs = date.getTime();
        var dayMs = 86400000;

        // Långfredagen (Easter - 2 days)
        if (dateMs === easterMs - 2 * dayMs) return true;
        // Påskdagen
        if (dateMs === easterMs) return true;
        // Annandag påsk (Easter + 1 day)
        if (dateMs === easterMs + dayMs) return true;
        // Kristi himmelsfärd (Easter + 39 days)
        if (dateMs === easterMs + 39 * dayMs) return true;

        // Midsommar (Saturday between June 20-26)
        if (m === 5 && d >= 20 && d <= 26 && date.getDay() === 6) return true;
        // Midsommarafton (Friday before midsommar)
        if (m === 5 && d >= 19 && d <= 25 && date.getDay() === 5) return true;

        // Alla helgons dag (Saturday between Oct 31 - Nov 6)
        if ((m === 9 && d === 31 && date.getDay() === 6) ||
            (m === 10 && d <= 6 && date.getDay() === 6)) return true;

        return false;
    };

    // Easter calculation (Anonymous Gregorian algorithm)
    VR.getEasterDate = function(year) {
        var a = year % 19;
        var b = Math.floor(year / 100);
        var c = year % 100;
        var d = Math.floor(b / 4);
        var e = b % 4;
        var f = Math.floor((b + 8) / 25);
        var g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4);
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        var day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month, day);
    };

    VR.canNavigateToNextMonth = function(currentViewMonth, currentViewYear) {
        var today = new Date();
        var todayYear = today.getFullYear();
        var todayMonth = today.getMonth();

        // If viewing a past month, can always go forward
        if (currentViewYear < todayYear) return true;
        if (currentViewYear === todayYear && currentViewMonth < todayMonth) return true;

        // If viewing current month, check if release date has passed
        if (currentViewYear === todayYear && currentViewMonth === todayMonth) {
            var releaseDate = VR.getSchemaReleaseDate(todayYear, todayMonth);
            return today >= releaseDate;
        }

        // Viewing future month - not allowed
        return false;
    };

    VR.getNextSchemaReleaseInfo = function() {
        var today = new Date();
        var releaseDate = VR.getSchemaReleaseDate(today.getFullYear(), today.getMonth());

        // Format the date nicely
        var day = releaseDate.getDate();
        var monthName = VR.MONTHS_SHORT[releaseDate.getMonth()];

        return {
            date: releaseDate,
            text: day + ' ' + monthName
        };
    };

    // ===== DATE HELPERS =====
    VR.formatDate = function(dateStr) {
        var p = dateStr.split('-');
        if (p.length !== 3) return { day: '', mon: '', wd: '', year: '', dateObj: null };
        var dayNum = parseInt(p[0]);
        var monIdx = parseInt(p[1]) - 1;
        var year = parseInt(p[2]);
        var dateObj = new Date(year, monIdx, dayNum);
        return {
            day: dayNum,
            mon: VR.MONTHS_SHORT[monIdx],
            wd: VR.WEEKDAYS_SHORT[dateObj.getDay()],
            year: year,
            dateObj: dateObj
        };
    };

    VR.getTodayStr = function() {
        var now = new Date();
        return ('0' + now.getDate()).slice(-2) + '-' +
               ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
               now.getFullYear();
    };

    VR.getTomorrowStr = function() {
        var tom = new Date(Date.now() + 86400000);
        return ('0' + tom.getDate()).slice(-2) + '-' +
               ('0' + (tom.getMonth() + 1)).slice(-2) + '-' +
               tom.getFullYear();
    };

    VR.parseTimeRange = function(pr) {
        if (!pr) return null;
        var m = pr.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return {
            startH: parseInt(m[1]),
            startM: parseInt(m[2]),
            endH: parseInt(m[3]),
            endM: parseInt(m[4]),
            startMins: parseInt(m[1]) * 60 + parseInt(m[2]),
            endMins: parseInt(m[3]) * 60 + parseInt(m[4])
        };
    };

    VR.calcMinutes = function(pr) {
        var t = VR.parseTimeRange(pr);
        if (!t) return 0;
        return t.endMins - t.startMins;
    };

    // ===== DOM HELPERS =====
    VR.findMenuItem = function(text) {
        var textLower = text.toLowerCase().trim();
        var best = null;
        var bestArea = Infinity;
        var viewportWidth = window.innerWidth;

        // Simple approach: find ALL elements, check for EXACT text match, pick smallest
        var all = document.querySelectorAll('*');

        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var elText = el.textContent.trim();

            // Must be exact match (case insensitive)
            if (elText.toLowerCase() !== textLower) continue;

            // Must be visible
            var rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            // Skip elements that are off-screen (like hidden VR menu)
            if (rect.right < 0 || rect.left > viewportWidth) continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

            // Skip elements inside VR menu (id starts with 'vr')
            var parent = el.closest('#vrMenu, #vrView, #vrLoader, #vrDetail');
            if (parent) continue;

            // Calculate area - prefer smallest element (most specific)
            var area = rect.width * rect.height;

            if (area < bestArea) {
                bestArea = area;
                best = el;
            }
        }

        if (best) {
            console.log('VR findMenuItem "' + text + '" found, area=' + bestArea);
        } else {
            console.log('VR findMenuItem "' + text + '" - not found');
        }

        return best;
    };

    // Debug: List all potential menu items - run VR.debugMenu() in console
    VR.debugMenu = function() {
        var items = [];
        var all = document.querySelectorAll('*');

        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var text = el.textContent.trim();

            // Skip empty or very long text
            if (!text || text.length > 50 || text.length < 3) continue;

            // Skip if contains newlines (likely container)
            if (text.indexOf('\n') > -1) continue;

            var rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            var area = rect.width * rect.height;

            // Only small-ish elements (likely menu items)
            if (area > 5000) continue;

            items.push({
                text: text,
                area: Math.round(area),
                tag: el.tagName,
                className: el.className || ''
            });
        }

        // Remove duplicates and sort by text
        var seen = {};
        var unique = [];
        for (var j = 0; j < items.length; j++) {
            var key = items[j].text;
            if (!seen[key]) {
                seen[key] = true;
                unique.push(items[j]);
            }
        }

        unique.sort(function(a, b) {
            return a.text.localeCompare(b.text);
        });

        console.log('=== VR DEBUG: Found ' + unique.length + ' menu items ===');
        console.table(unique);
        return unique;
    };

    VR.clickFolder = function() {
        // Try various menu triggers
        var selectors = [
            '.PopoutTrigger',
            '.MenuOpen',
            '.MainMenu',
            '.DockLeft',
            '.BaseMenu',
            '[id*="navbar_folder"]',
            '.folderico',
            '[class*="folder"]',
            '[class*="Folder"]',
            'img[src*="folder"]',
            '[title*="Mapp"]',
            '[title*="mapp"]',
            '[aria-label*="meny"]',
            '[aria-label*="Meny"]'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) {
                el.click();
                return true;
            }
        }

        // Fallback: find element with folder icon by looking at images
        var imgs = document.querySelectorAll('img');
        for (var j = 0; j < imgs.length; j++) {
            var src = imgs[j].src || '';
            if (src.indexOf('folder') > -1 || src.indexOf('mapp') > -1) {
                imgs[j].click();
                return true;
            }
        }

        return false;
    };

    VR.setDates = function(startDate, endDate) {
        console.log('VR: setDates called with', startDate, 'to', endDate);

        // Search ENTIRE page for date inputs
        var allInputs = document.querySelectorAll('input');
        console.log('VR: Found', allInputs.length, 'inputs on entire page');

        var dateInputs = [];

        // Look for inputs with date format value (dd-mm-yyyy)
        for (var i = 0; i < allInputs.length; i++) {
            var val = allInputs[i].value || '';
            var name = allInputs[i].name || allInputs[i].id || allInputs[i].placeholder || '';
            if (val.match(/\d{1,2}-\d{2}-\d{4}/)) {
                console.log('VR: Date input found by value:', name, '=', val);
                dateInputs.push(allInputs[i]);
            }
        }
        console.log('VR: Found', dateInputs.length, 'date inputs by value pattern');

        // If not found, look for inputs with date-related names/placeholders
        if (dateInputs.length < 2) {
            for (var j = 0; j < allInputs.length; j++) {
                var inp = allInputs[j];
                var identifier = (inp.name || '') + (inp.id || '') + (inp.placeholder || '') + (inp.className || '');
                identifier = identifier.toLowerCase();
                if (identifier.match(/date|datum|from|från|to|till|start|end|slut/)) {
                    console.log('VR: Date input found by name:', inp.name || inp.id, '=', inp.value);
                    if (dateInputs.indexOf(inp) === -1) {
                        dateInputs.push(inp);
                    }
                }
            }
            console.log('VR: Found', dateInputs.length, 'date inputs after name search');
        }

        // Last resort: look for visible text inputs
        if (dateInputs.length < 2) {
            dateInputs = [];
            for (var k = 0; k < allInputs.length; k++) {
                var input = allInputs[k];
                var type = input.type || 'text';
                if (type === 'text' || type === '') {
                    var rect = input.getBoundingClientRect();
                    if (rect.width > 60 && rect.height > 15) {
                        console.log('VR: Visible text input:', input.name || input.id, 'size:', rect.width, 'x', rect.height, 'value:', input.value);
                        dateInputs.push(input);
                    }
                }
            }
            console.log('VR: Found', dateInputs.length, 'visible text inputs');
        }

        if (dateInputs.length >= 2) {
            console.log('VR: Setting input 0 from', dateInputs[0].value, 'to', startDate);
            console.log('VR: Setting input 1 from', dateInputs[1].value, 'to', endDate);

            // Clear and set with focus to trigger any React/Angular handlers
            dateInputs[0].focus();
            dateInputs[0].value = startDate;
            dateInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            dateInputs[0].blur();

            dateInputs[1].focus();
            dateInputs[1].value = endDate;
            dateInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            dateInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            dateInputs[1].blur();

            console.log('VR: After setting - input 0:', dateInputs[0].value, 'input 1:', dateInputs[1].value);
            return true;
        }
        console.log('VR: Failed to find date inputs');
        return false;
    };

    VR.clickFetch = function() {
        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.trim() === 'Hämta') {
                btns[i].click();
                return true;
            }
        }
        return false;
    };

    // ===== TIMER/STATE HELPERS =====
    VR.stopTimer = function() {
        if (VR.timer) {
            clearInterval(VR.timer);
            VR.timer = null;
        }
    };

    VR.closeOverlay = function() {
        var v = document.getElementById(VR.ID.view);
        if (v) v.remove();
    };

    VR.closeDayDetail = function() {
        var d = document.getElementById(VR.ID.detail);
        if (d) d.remove();
    };

    // ===== BADGE/ICON HELPERS =====
    VR.isFriday = function(ps, cd) {
        var p = (ps || '').toUpperCase();
        var c = (cd || '').toUpperCase();
        var isFPV = p === 'FV' || p === 'FP2' || p === 'FP-V' ||
                    p.indexOf('FP-V') > -1 || p.indexOf('FP2') > -1;
        return c === 'FRIDAG' || p === 'FRI' || p === 'FP' || isFPV;
    };

    VR.getTurIcons = function(tn, hasDKKK) {
        if (!tn) return '';
        var tnU = tn.toUpperCase();
        var icons = '';

        // Check for "Ändrad Reserv" format: NNNNNN-NNNNNN (6 digits - 6 digits, may have more after)
        var isAndradReserv = /^\d{6}-\d{6}/.test(tn);

        if (isAndradReserv) {
            // Ändrad Reserv: R badge + Ändrad badge
            icons += '<span style="display:inline-block;background:#DC2626;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">R</span>';
            icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">Ändrad</span>';
            // If DK.KK present in day view, show Danish flag
            if (hasDKKK) {
                icons += '<span style="margin-left:9px;font-size:27px">🇩🇰</span>';
            }
            return icons;
        }

        // Reserv types (text starting with RESERV)
        if (tnU.indexOf('RESERV') === 0) {
            icons += '<span style="display:inline-block;background:#9333EA;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">xR</span>';
            // Check if also contains TP → add Ändrad badge
            if (tnU.indexOf('TP') > -1) {
                icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">Ändrad</span>';
            }
            return icons;
        }

        // Position 4 (index 3) = 8 or 9 → R badge
        var c4 = tn.length >= 4 ? tn.charAt(3) : '';
        if (c4 === '8' || c4 === '9') {
            icons += '<span style="display:inline-block;background:#DC2626;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">R</span>';
            // Check if also contains TP → add Ändrad badge
            if (tnU.indexOf('TP') > -1) {
                icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">Ändrad</span>';
            }
            return icons;
        }

        var c3 = tn.length >= 3 ? tn.charAt(2) : '';
        var c6 = tn.length >= 6 ? tn.charAt(5) : '';

        // Country flag based on 3rd character (1,3 = Sverige, 2,4 = Danmark)
        if (c3 === '1' || c3 === '3') {
            icons += '<span style="margin-left:9px;font-size:27px">🇸🇪</span>';
        } else if (c3 === '2' || c3 === '4') {
            icons += '<span style="margin-left:9px;font-size:27px">🇩🇰</span>';
        }

        // Shift indicator (A/B) - torn paper effect
        if (c6.toUpperCase() === 'A') {
            // 1 = white box with torn bottom
            icons += '<span style="display:inline-block;background:#fff;color:#222;font-size:23px;font-weight:700;padding:8px 14px 12px 14px;margin-left:9px;clip-path:polygon(0 0,100% 0,100% 75%,85% 100%,70% 75%,50% 100%,30% 75%,15% 100%,0 75%);box-shadow:0 2px 4px rgba(0,0,0,0.2)">1</span>';
        } else if (c6.toUpperCase() === 'B') {
            // 2 = white box with torn top
            icons += '<span style="display:inline-block;background:#fff;color:#222;font-size:23px;font-weight:700;padding:12px 14px 8px 14px;margin-left:9px;clip-path:polygon(0 25%,15% 0,30% 25%,50% 0,70% 25%,85% 0,100% 25%,100% 100%,0 100%);box-shadow:0 2px 4px rgba(0,0,0,0.2)">2</span>';
        }

        // Check if contains TP → add Ändrad badge (yellow)
        if (tnU.indexOf('TP') > -1) {
            icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">Ändrad</span>';
        }

        return icons;
    };

    VR.getFridagBadge = function(ps, cd) {
        var p = (ps || '').toUpperCase();
        if (p === 'FV' || p === 'FP2' || p === 'FP-V' ||
            p.indexOf('FP-V') > -1 || p.indexOf('FP2') > -1) {
            return '<span style="display:inline-block;background:#16A34A;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:14px">FP-V</span>';
        }
        return '<span style="display:inline-block;background:#16A34A;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:14px">FP</span>';
    };

    VR.getHeaderIcons = function(tn, hasDKKK) {
        if (!tn) return '';
        var tnU = tn.toUpperCase();
        var icons = '';

        // Check for "Ändrad Reserv" format: NNNNNN-NNNNNN (6 digits - 6 digits, may have more after)
        var isAndradReserv = /^\d{6}-\d{6}/.test(tn);

        if (isAndradReserv) {
            // Ändrad Reserv: R badge + Ändrad badge
            icons += '<span style="background:#DC2626;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">R</span>';
            icons += '<span style="background:#EAB308;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">Ändrad</span>';
            // If DK.KK present, show Danish flag
            if (hasDKKK) {
                icons += '🇩🇰';
            }
            return icons;
        }

        // Reserv types (text starting with RESERV)
        if (tnU.indexOf('RESERV') === 0) {
            icons += '<span style="background:#9333EA;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">xR</span>';
            if (tnU.indexOf('TP') > -1) {
                icons += '<span style="background:#EAB308;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">Ändrad</span>';
            }
            return icons;
        }

        // Position 4 (index 3) = 8 or 9 → R badge
        var c4 = tn.length >= 4 ? tn.charAt(3) : '';
        if (c4 === '8' || c4 === '9') {
            icons += '<span style="background:#DC2626;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">R</span>';
            if (tnU.indexOf('TP') > -1) {
                icons += '<span style="background:#EAB308;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">Ändrad</span>';
            }
            return icons;
        }

        var c3 = tn.length >= 3 ? tn.charAt(2) : '';

        // Country flag based on 3rd character (1,3 = Sverige, 2,4 = Danmark)
        if (c3 === '1' || c3 === '3') {
            icons += '🇸🇪';
        } else if (c3 === '2' || c3 === '4') {
            icons += '🇩🇰';
        }

        // Check if contains TP → add Ändrad badge (yellow)
        if (tnU.indexOf('TP') > -1) {
            icons += '<span style="background:#EAB308;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">Ändrad</span>';
        }

        return icons;
    };

    VR.getHeaderFridagBadge = function(ps, cd) {
        var p = (ps || '').toUpperCase();
        if (p === 'FV' || p === 'FP2' || p === 'FP-V' ||
            p.indexOf('FP-V') > -1 || p.indexOf('FP2') > -1) {
            return '<span style="background:#16A34A;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">FP-V</span>';
        }
        return '<span style="background:#16A34A;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">FP</span>';
    };

    // ===== TABLE HELPERS =====
    VR.findLargestTable = function() {
        var tables = document.querySelectorAll('table');
        var tbl = null;
        var maxRows = 0;
        for (var t = 0; t < tables.length; t++) {
            var r = tables[t].querySelectorAll('tr').length;
            if (r > maxRows) {
                maxRows = r;
                tbl = tables[t];
            }
        }
        return tbl;
    };

    // ===== RESERV CHECK =====
    // 4th character = 8 or 9 means Reserv (no flag, no SR-tillägg)
    VR.isReservTour = function(tn) {
        if (!tn || tn.length < 4) return false;
        var c4 = tn.charAt(3);
        return c4 === '8' || c4 === '9';
    };

    // ===== SR-TILLÄGG RATE FROM TOUR NUMBER =====
    // 3rd character: 1=LKF Sverige, 2=LKF Danmark (75kr), 3=TGV Sverige, 4=TGV Danmark (50kr)
    // 4th character: 8 or 9 = Reserv (no SR-tillägg)
    VR.getSRRateFromTour = function(tn) {
        if (!tn || tn.length < 4) return 0;
        // If 4th char is 8 or 9, no SR-tillägg
        if (VR.isReservTour(tn)) return 0;
        var c3 = tn.charAt(2);
        if (c3 === '2') return 75; // Lokförare Danmark
        if (c3 === '4') return 50; // Tågvärd Danmark
        return 0; // Sverige eller okänd
    };

    VR.getRoleFromTour = function(tn) {
        if (!tn || tn.length < 3) return null;
        var c3 = tn.charAt(2);
        if (c3 === '1' || c3 === '2') return 'Lokförare';
        if (c3 === '3' || c3 === '4') return 'Tågvärd';
        return null;
    };

    VR.isDenmarkTour = function(tn) {
        if (!tn || tn.length < 4) return false;
        // If 4th char is 8 or 9, it's Reserv - no Denmark flag
        if (VR.isReservTour(tn)) return false;
        var c3 = tn.charAt(2);
        return c3 === '2' || c3 === '4';
    };

    // ===== SR-TILLÄGG HELPERS =====
    VR.hasDanishFlag = function(tn) {
        // Check if tour number has Danish flag (3rd character = 2 or 4, and 4th != 8/9)
        return VR.isDenmarkTour(tn);
    };

    VR.isAndradReserv = function(tn) {
        // Check for NNNNNN-NNNNNN format (6 digits - 6 digits)
        return /^\d{6}-\d{6}/.test(tn);
    };

    console.log('VR: Core loaded');
})();
