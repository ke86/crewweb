// VR CrewWeb - Statistik
(function() {
    'use strict';

    var VR = window.VR;

    // ===== STATISTIK FUNCTIONALITY =====
    VR.doStatistik = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Statistik');
        VR.updateLoader(5, 'Kontrollerar data...');

        // Check if we have schema data
        if (!VR.allSchemaData || Object.keys(VR.allSchemaData).length === 0) {
            // Need to load schema first
            VR.updateLoader(10, 'Laddar schema...');
            VR.loadSchemaForStatistik();
            return;
        }

        // Check if FP/FPV data is cached (from prefetch)
        if (VR.statistikFPData && VR.statistikFPData.length > 0) {
            console.log('VR: Statistik - using cached FP/FPV data');
            VR.updateLoader(80, 'Data från cache...');
            VR.renderStatistik();
            return;
        }

        // Schema loaded, now get FP/FPV data
        VR.updateLoader(50, 'Hämtar FP/FPV...');
        VR.loadFPFPVForStatistik();
    };

    // ===== LOAD SCHEMA FOR STATISTIK =====
    VR.loadSchemaForStatistik = function() {
        // Navigate to schema page and load data
        var tbl = document.querySelector('#workdays table');
        if (tbl) {
            VR.updateLoader(30, 'Schema redan laddat...');
            VR.fetchSchemaForStatistik();
            return;
        }

        VR.clickFolder();
        setTimeout(function() {
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Arbetsdag');
                if (el) {
                    VR.stopTimer();
                    el.click();
                    VR.waitForSchemaStatistik();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.hideLoader();
                }
            }, 400);
        }, 600);
    };

    VR.waitForSchemaStatistik = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(20 + n, 'Väntar på schema...');
            var tbl = document.querySelector('#workdays table');
            if (tbl) {
                VR.stopTimer();
                setTimeout(VR.fetchSchemaForStatistik, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.hideLoader();
            }
        }, 400);
    };

    VR.fetchSchemaForStatistik = function() {
        var now = new Date();

        // Load from 14 Dec 2025 to end of current month
        var startDate = new Date(2025, 11, 14); // 14 Dec 2025
        var endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        var d1 = startDate.getDate() + '-' + ('0' + (startDate.getMonth() + 1)).slice(-2) + '-' + startDate.getFullYear();
        var d2 = endDate.getDate() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + endDate.getFullYear();

        VR.setDates(d1, d2);
        VR.updateLoader(35, 'Hämtar schema...');
        VR.clickFetch();

        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(35 + n, 'Laddar schema...');
            var rows = document.querySelectorAll('#workdays table tr');
            if (rows.length > 10 || n > 30) {
                VR.stopTimer();
                VR.parseSchemaForStatistik();
            }
        }, 400);
    };

    VR.parseSchemaForStatistik = function() {
        VR.updateLoader(50, 'Analyserar schema...');

        var tbl = VR.findLargestTable();
        if (!tbl) {
            VR.hideLoader();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var dd = {};
        var currentDate = '';

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) {
                currentDate = dt;
            }
            if (!currentDate) continue;

            var en = {
                dt: currentDate,
                ps: c[3] ? c[3].textContent.trim() : '',
                tn: c[9] ? c[9].textContent.trim() : '',
                pr: c[10] ? c[10].textContent.trim() : '',
                pt: c[11] ? c[11].textContent.trim() : '',
                cd: c[12] ? c[12].textContent.trim() : '',
                isHeader: dt && dt.indexOf('-') > -1
            };

            if (!dd[currentDate]) dd[currentDate] = [];
            dd[currentDate].push(en);
        }

        VR.allSchemaData = dd;
        VR.loadFPFPVForStatistik();
    };

    // ===== LOAD FP/FPV FOR STATISTIK =====
    VR.loadFPFPVForStatistik = function() {
        VR.updateLoader(60, 'Hämtar FP/FPV data...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseFPFPVForStatistik);
        });
    };

    VR.parseFPFPVForStatistik = function() {
        VR.updateLoader(80, 'Analyserar FP/FPV...');

        var fpData = [];
        var FP_TYPES = {
            'S.Frånvaro: FRIDAG': 'FP',
            'S.Frånvaro: FV/FP2/FP-V': 'FPV'
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';

                    var matchedType = null;
                    if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                        matchedType = 'FP';
                    } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                        matchedType = 'FPV';
                    }

                    if (matchedType) {
                        fpData.push({
                            date: currentDate,
                            type: matchedType
                        });
                    }
                }
            }
        }

        VR.statistikFPData = fpData;
        VR.renderStatistik();
    };

    // ===== TIME HELPERS =====
    // Parse time string "HH:MM" to total minutes
    VR.parseTimeToMinutes = function(timeStr) {
        if (!timeStr) return 0;
        var match = timeStr.match(/(\d+):(\d+)/);
        if (match) {
            return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        }
        return 0;
    };

    // Format minutes to "Xh Ym" string
    VR.formatMinutesToTime = function(totalMinutes) {
        var negative = totalMinutes < 0;
        totalMinutes = Math.abs(totalMinutes);
        var h = Math.floor(totalMinutes / 60);
        var m = totalMinutes % 60;
        var result = h + 'h';
        if (m > 0) result += ' ' + m + 'm';
        return (negative ? '-' : '+') + result;
    };

    // ===== SETTINGS HELPERS =====
    VR.getWeeklyHours = function() {
        return parseInt(localStorage.getItem('VR_weeklyHours') || '38', 10);
    };

    VR.setWeeklyHours = function(hours) {
        localStorage.setItem('VR_weeklyHours', hours);
        VR.doStatistik(); // Reload statistics
    };

    VR.getSpecialDaySettings = function() {
        return {
            countVAB: localStorage.getItem('VR_countVAB') === 'true',
            countSjuk: localStorage.getItem('VR_countSjuk') === 'true',
            countKarensdag: localStorage.getItem('VR_countKarensdag') === 'true',
            countForaldraledighet: localStorage.getItem('VR_countForaldraledighet') === 'true',
            countRAM: localStorage.getItem('VR_countRAM') !== 'false' // default true
        };
    };

    VR.toggleSpecialDay = function(key, enabled) {
        localStorage.setItem('VR_' + key, enabled.toString());
        VR.doStatistik(); // Reload statistics
    };

    // Calculate normtid using selected weekly hours
    VR.calculateNormtid = function(arbetsdagar) {
        var weeklyHours = VR.getWeeklyHours();
        var normPerDay = (weeklyHours / 5) * 60; // Convert to minutes per day
        return arbetsdagar * normPerDay;
    };

    // Get normtid per day in minutes
    VR.getNormPerDay = function() {
        var weeklyHours = VR.getWeeklyHours();
        return (weeklyHours / 5) * 60;
    };

    // ===== RENDER STATISTIK =====
    VR.renderStatistik = function() {
        VR.updateLoader(90, 'Bygger statistik...');

        var schemaData = VR.allSchemaData || {};
        var fpData = VR.statistikFPData || [];

        // Group data by month
        var monthlyStats = {};

        // Process schema data
        var dates = Object.keys(schemaData);
        for (var i = 0; i < dates.length; i++) {
            var dateKey = dates[i];
            var parts = dateKey.split('-');
            if (parts.length !== 3) continue;

            var month = parseInt(parts[1], 10) - 1; // 0-indexed
            var year = parseInt(parts[2], 10);
            var monthKey = year + '-' + ('0' + (month + 1)).slice(-2);

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    year: year,
                    month: month,
                    arbetsdagar: 0,
                    arbetadTidMinutes: 0,
                    fp: 0,
                    fpv: 0,
                    days: []
                };
            }

            var dayEntries = schemaData[dateKey];
            var mainEntry = null;
            for (var j = 0; j < dayEntries.length; j++) {
                if (dayEntries[j].isHeader) {
                    mainEntry = dayEntries[j];
                    break;
                }
            }
            if (!mainEntry) mainEntry = dayEntries[0];

            // Check if work day (not free) or special cases
            var psU = (mainEntry.ps || '').toUpperCase();
            var cdU = (mainEntry.cd || '').toUpperCase();
            var psRaw = mainEntry.ps || '';
            var cdRaw = mainEntry.cd || '';

            // Get settings
            var settings = VR.getSpecialDaySettings();
            var normPerDay = VR.getNormPerDay();

            // Identify special day types (always active)
            var isAFD = psU.indexOf('AFD') > -1 || cdU.indexOf('AFD') > -1;
            var isSemesterBetald = psU.indexOf('SEMESTER BETALD') > -1 || cdU.indexOf('SEMESTER BETALD') > -1;

            // Configurable special day types
            var isVAB = psU.indexOf('VÅRD AV SJUKT BARN') > -1 || psU.indexOf('VAB') > -1 || cdU.indexOf('VAB') > -1;
            var isSjuk = psU === 'SJUK' || cdU === 'SJUK' || psU.indexOf('SJUKFRÅNVARO') > -1;
            var isKarensdag = psU.indexOf('KARENSDAG') > -1 || cdU.indexOf('KARENSDAG') > -1;
            var isForaldraledighet = (psU.indexOf('FÖRÄLDRALEDIGHET') > -1 || cdU.indexOf('FÖRÄLDRALEDIGHET') > -1) &&
                                     (psU.match(/1-5|1 - 5/) || cdU.match(/1-5|1 - 5/));
            var isRAM = /RAM\d{4,}-\d{4,}/.test(psRaw) || /RAM\d{4,}-\d{4,}/.test(cdRaw);

            // Regular free day checks
            var isFPV = psU === 'FV' || psU === 'FP2' || psU === 'FP-V' ||
                        psU.indexOf('FP-V') > -1 || psU.indexOf('FP2') > -1;
            var isFree = (cdU === 'FRIDAG') || (psU === 'FRIDAG') || isFPV;

            // Handle work days with priority: hardcoded special → configurable special → normal work days
            if (isAFD) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'AFD', minutes: 0 });
            } else if (isSemesterBetald) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += normPerDay;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Semester Betald', minutes: normPerDay });
            } else if (isRAM && settings.countRAM) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'RAM', minutes: 0 });
            } else if (isVAB && settings.countVAB) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += normPerDay;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Vård av sjukt barn', minutes: normPerDay });
            } else if (isSjuk && settings.countSjuk) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += normPerDay;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Sjuk', minutes: normPerDay });
            } else if (isKarensdag && settings.countKarensdag) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += normPerDay;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Karensdag', minutes: normPerDay });
            } else if (isForaldraledighet && settings.countForaldraledighet) {
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += normPerDay;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Föräldraledighet', minutes: normPerDay });
            } else if (!isFree && mainEntry.pt) {
                var ptMin = VR.parseTimeToMinutes(mainEntry.pt);
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += ptMin;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Arbetsdag', minutes: ptMin });
            }
        }

        // Process FP/FPV data
        for (var f = 0; f < fpData.length; f++) {
            var fpEntry = fpData[f];
            var fpParts = fpEntry.date.split('-');
            if (fpParts.length !== 3) continue;

            var fpMonth = parseInt(fpParts[1], 10) - 1;
            var fpYear = parseInt(fpParts[2], 10);
            var fpMonthKey = fpYear + '-' + ('0' + (fpMonth + 1)).slice(-2);

            if (!monthlyStats[fpMonthKey]) {
                monthlyStats[fpMonthKey] = {
                    year: fpYear,
                    month: fpMonth,
                    arbetsdagar: 0,
                    arbetadTidMinutes: 0,
                    fp: 0,
                    fpv: 0,
                    days: []
                };
            }

            if (fpEntry.type === 'FP') {
                monthlyStats[fpMonthKey].fp++;
            } else if (fpEntry.type === 'FPV') {
                monthlyStats[fpMonthKey].fpv++;
            }
        }

        // Sort months chronologically (oldest first)
        var sortedMonths = Object.keys(monthlyStats).sort();

        // Build HTML
        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

        var settings = VR.getSpecialDaySettings();
        var weeklyHours = VR.getWeeklyHours();
        var normPerDay = VR.getNormPerDay();
        var normH = Math.floor(normPerDay / 60);
        var normM = normPerDay % 60;
        var normStr = normH + ':' + ('0' + normM).slice(-2);

        var html = '';

        // Settings UI at top - header (always visible)
        var settingsExpanded = localStorage.getItem('VR_settingsExpanded') === 'true';
        html += '<div style="background:#fff;border-radius:20px;padding:20px;margin-bottom:16px;box-shadow:0 4px 15px rgba(0,0,0,0.08);cursor:pointer" onclick="VR.toggleSettings()">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center">';
        html += '<div style="font-size:24px;font-weight:700;color:#333">⚙️ Inställningar</div>';
        html += '<div id="vr-settings-toggle" style="font-size:28px;color:#007AFF;user-select:none">' + (settingsExpanded ? '▲' : '▼') + '</div>';
        html += '</div>';
        html += '</div>';

        // Settings content (collapsed by default)
        html += '<div id="vr-settings-content" style="display:' + (settingsExpanded ? 'block' : 'none') + ';background:#fff;border-radius:20px;padding:20px;margin-bottom:16px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';

        // Weekly hours
        html += '<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #e0e0e0">';
        html += '<div style="font-size:18px;font-weight:600;color:#333;margin-bottom:8px">Normtid (veckoarbetstid):</div>';
        html += '<select onchange="VR.setWeeklyHours(this.value)" style="width:100%;padding:12px;font-size:16px;border-radius:8px;border:2px solid #007AFF;background:#fff">';
        html += '<option value="32"' + (weeklyHours === 32 ? ' selected' : '') + '>32h/vecka (6:24/dag)</option>';
        html += '<option value="33"' + (weeklyHours === 33 ? ' selected' : '') + '>33h/vecka (6:36/dag)</option>';
        html += '<option value="34"' + (weeklyHours === 34 ? ' selected' : '') + '>34h/vecka (6:48/dag)</option>';
        html += '<option value="36"' + (weeklyHours === 36 ? ' selected' : '') + '>36h/vecka (7:12/dag)</option>';
        html += '<option value="38"' + (weeklyHours === 38 ? ' selected' : '') + '>38h/vecka (7:36/dag)</option>';
        html += '<option value="40"' + (weeklyHours === 40 ? ' selected' : '') + '>40h/vecka (8:00/dag)</option>';
        html += '</select>';
        html += '<div style="font-size:14px;color:#666;margin-top:8px">Aktuell normtid: <strong>' + normStr + '</strong> per arbetsdag</div>';
        html += '</div>';

        // Special day types
        html += '<div>';
        html += '<div style="font-size:18px;font-weight:600;color:#333;margin-bottom:12px">Räkna som arbetsdag:</div>';

        html += '<label style="display:block;padding:12px;margin-bottom:8px;background:#f5f5f5;border-radius:8px;cursor:pointer;user-select:none">';
        html += '<input type="checkbox"' + (settings.countVAB ? ' checked' : '') + ' onchange="VR.toggleSpecialDay(\'countVAB\', this.checked)" style="margin-right:8px"> ';
        html += '<span style="font-size:16px">Vård av sjukt barn</span> <span style="color:#666;font-size:14px">(' + normStr + ')</span>';
        html += '</label>';

        html += '<label style="display:block;padding:12px;margin-bottom:8px;background:#f5f5f5;border-radius:8px;cursor:pointer;user-select:none">';
        html += '<input type="checkbox"' + (settings.countSjuk ? ' checked' : '') + ' onchange="VR.toggleSpecialDay(\'countSjuk\', this.checked)" style="margin-right:8px"> ';
        html += '<span style="font-size:16px">Sjuk</span> <span style="color:#666;font-size:14px">(' + normStr + ')</span>';
        html += '</label>';

        html += '<label style="display:block;padding:12px;margin-bottom:8px;background:#f5f5f5;border-radius:8px;cursor:pointer;user-select:none">';
        html += '<input type="checkbox"' + (settings.countKarensdag ? ' checked' : '') + ' onchange="VR.toggleSpecialDay(\'countKarensdag\', this.checked)" style="margin-right:8px"> ';
        html += '<span style="font-size:16px">Karensdag</span> <span style="color:#666;font-size:14px">(' + normStr + ')</span>';
        html += '</label>';

        html += '<label style="display:block;padding:12px;margin-bottom:8px;background:#f5f5f5;border-radius:8px;cursor:pointer;user-select:none">';
        html += '<input type="checkbox"' + (settings.countForaldraledighet ? ' checked' : '') + ' onchange="VR.toggleSpecialDay(\'countForaldraledighet\', this.checked)" style="margin-right:8px"> ';
        html += '<span style="font-size:16px">Föräldraledighet 1-5 dagar</span> <span style="color:#666;font-size:14px">(' + normStr + ')</span>';
        html += '</label>';

        html += '<label style="display:block;padding:12px;background:#f5f5f5;border-radius:8px;cursor:pointer;user-select:none">';
        html += '<input type="checkbox"' + (settings.countRAM ? ' checked' : '') + ' onchange="VR.toggleSpecialDay(\'countRAM\', this.checked)" style="margin-right:8px"> ';
        html += '<span style="font-size:16px">RAMNNNN-NNNN</span> <span style="color:#666;font-size:14px">(0h, som AFD)</span>';
        html += '</label>';

        html += '</div>'; // End special day types
        html += '</div>'; // End vr-settings-content

        // Month cards grid
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';

        // Store monthlyStats globally for expandable cards
        VR.currentMonthlyStats = monthlyStats;

        for (var m = 0; m < sortedMonths.length; m++) {
            var mKey = sortedMonths[m];
            var stats = monthlyStats[mKey];

            // Calculate normtid and difference
            var normtidMinutes = VR.calculateNormtid(stats.arbetsdagar);
            var diffMinutes = normtidMinutes - stats.arbetadTidMinutes;

            // Format arbetad tid
            var arbetadH = Math.floor(stats.arbetadTidMinutes / 60);
            var arbetadM = stats.arbetadTidMinutes % 60;
            var arbetadStr = arbetadH + 'h' + (arbetadM > 0 ? ' ' + arbetadM + 'm' : '');

            // Format difference - INVERT sign and color for display
            // diffMinutes positive (worked LESS) → display as MINUS, GREEN
            // diffMinutes negative (worked MORE) → display as PLUS, RED
            var displayDiff = -diffMinutes; // Invert for display
            var diffStr = VR.formatMinutesToTime(displayDiff);
            var diffColor = diffMinutes >= 0 ? '#34C759' : '#FF3B30';

            var cardId = 'vr-month-card-' + mKey.replace(/[^a-z0-9]/gi, '');
            html += '<div id="' + cardId + '" style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';

            // Month header with plus icon
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
            html += '<div style="font-size:28px;font-weight:700;color:#333">' + monthNames[stats.month] + '</div>';
            html += '<div id="vr-expand-' + cardId + '" ontouchstart="VR.toggleMonthExpand(\'' + cardId + '\', \'' + mKey + '\'); event.stopPropagation(); return false;" onclick="VR.toggleMonthExpand(\'' + cardId + '\', \'' + mKey + '\'); event.stopPropagation();" style="font-size:36px;font-weight:bold;color:#007AFF;cursor:pointer;padding:0 8px;user-select:none;line-height:1">+</div>';
            html += '</div>';

            // Stats grid
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';

            // FP
            html += '<div style="background:#F0FDF4;border-radius:12px;padding:12px;text-align:center">';
            html += '<div style="font-size:20px;color:#666">FP</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#34C759">' + stats.fp + '</div>';
            html += '</div>';

            // FPV
            html += '<div style="background:#EFF6FF;border-radius:12px;padding:12px;text-align:center">';
            html += '<div style="font-size:20px;color:#666">FPV</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#007AFF">' + stats.fpv + '</div>';
            html += '</div>';

            // Arbetad tid
            html += '<div style="background:#F5F5F5;border-radius:12px;padding:12px;text-align:center">';
            html += '<div style="font-size:20px;color:#666">Arb.tid</div>';
            html += '<div style="font-size:28px;font-weight:700;color:#333">' + arbetadStr + '</div>';
            html += '</div>';

            // Arbetsdagar
            html += '<div style="background:#F5F5F5;border-radius:12px;padding:12px;text-align:center">';
            html += '<div style="font-size:20px;color:#666">Arb.dagar</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#333">' + stats.arbetsdagar + '</div>';
            html += '</div>';

            html += '</div>';

            // +/- row (inverted: positive diff shows green, negative shows red)
            html += '<div style="background:' + (diffMinutes >= 0 ? '#F0FDF4' : '#FEF2F2') + ';border-radius:12px;padding:14px;text-align:center;margin-top:12px;pointer-events:none">';
            html += '<div style="font-size:20px;color:#666">+/-</div>';
            html += '<div style="font-size:32px;font-weight:700;color:' + diffColor + '">' + diffStr + '</div>';
            html += '</div>';

            // Expandable details section (hidden by default)
            var detailsId = 'vr-details-' + mKey.replace(/[^a-z0-9]/gi, '');
            html += '<div id="' + detailsId + '" style="display:none;margin-top:16px;padding-top:16px;border-top:2px solid #e0e0e0;pointer-events:none">';

            // Count by type for breakdown
            var typeCounts = {};
            var typeMinutes = {};
            for (var d = 0; d < stats.days.length; d++) {
                var day = stats.days[d];
                typeCounts[day.type] = (typeCounts[day.type] || 0) + 1;
                typeMinutes[day.type] = (typeMinutes[day.type] || 0) + day.minutes;
            }

            // Category breakdown
            html += '<div style="margin-bottom:16px">';
            html += '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:10px">📋 Uppdelning</div>';
            for (var type in typeCounts) {
                if (typeCounts[type] > 0) {
                    var typeH = Math.floor(typeMinutes[type] / 60);
                    var typeM = typeMinutes[type] % 60;
                    var typeStr = typeH + 'h' + (typeM > 0 ? ' ' + typeM + 'm' : '');
                    var typeColor = type === 'AFD' || type === 'RAM' ? '#9B59B6' :
                                   (type === 'Semester Betald' ? '#34C759' :
                                   (type === 'Arbetsdag' ? '#007AFF' : '#FF9500'));

                    html += '<div style="display:flex;justify-content:space-between;padding:8px;background:#f8f8f8;border-radius:8px;margin-bottom:6px">';
                    html += '<div style="font-size:14px;color:#666">' + type + '</div>';
                    html += '<div style="font-size:15px;font-weight:600;color:' + typeColor + '">' + typeCounts[type] + ' (' + typeStr + ')</div>';
                    html += '</div>';
                }
            }
            html += '</div>';

            // Calculation breakdown
            var normH2 = Math.floor(normtidMinutes / 60);
            var normM2 = normtidMinutes % 60;
            var normStr2 = normH2 + 'h' + (normM2 > 0 ? ' ' + normM2 + 'm' : '');

            html += '<div style="margin-bottom:16px">';
            html += '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:10px">⚙️ Beräkning</div>';
            html += '<div style="font-size:14px;color:#666;margin-bottom:4px">Arbetsdagar: <strong>' + stats.arbetsdagar + '</strong></div>';
            html += '<div style="font-size:14px;color:#666;margin-bottom:4px">Normtid: ' + stats.arbetsdagar + ' × ' + normStr + ' = <strong>' + normStr2 + '</strong></div>';
            html += '<div style="font-size:14px;color:#666;margin-bottom:4px">Arbetad tid: <strong>' + arbetadStr + '</strong></div>';
            html += '<div style="font-size:16px;font-weight:700;color:' + diffColor + ';margin-top:8px">Skillnad: ' + diffStr + '</div>';
            html += '</div>';

            // Day-by-day list
            html += '<div>';
            html += '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:10px">📅 Dag för dag</div>';
            var sortedDays = stats.days.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
            for (var dd = 0; dd < Math.min(sortedDays.length, 10); dd++) {
                var dayInfo = sortedDays[dd];
                var dayH = Math.floor(dayInfo.minutes / 60);
                var dayM = dayInfo.minutes % 60;
                var dayStr = dayH + 'h' + (dayM > 0 ? ' ' + dayM + 'm' : '');
                var dayColor = dayInfo.type === 'AFD' || dayInfo.type === 'RAM' ? '#9B59B6' :
                              (dayInfo.type === 'Semester Betald' ? '#34C759' :
                              (dayInfo.type === 'Arbetsdag' ? '#007AFF' : '#FF9500'));

                html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0">';
                html += '<div style="flex:1"><div style="font-size:13px;color:#333;font-weight:600">' + dayInfo.date + '</div>';
                html += '<div style="font-size:12px;color:' + dayColor + '">' + dayInfo.type + '</div></div>';
                html += '<div style="font-size:14px;font-weight:700;color:#333">' + dayStr + '</div>';
                html += '</div>';
            }
            if (sortedDays.length > 10) {
                html += '<div style="font-size:14px;color:#999;margin-top:8px;text-align:center">... och ' + (sortedDays.length - 10) + ' dagar till</div>';
            }
            html += '</div>';

            html += '</div>'; // End details section

            html += '</div>'; // End card
        }

        // Store monthlyStats globally for details view
        VR.currentMonthlyStats = monthlyStats;

        html += '</div>';

        if (sortedMonths.length === 0) {
            html = '<div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
            html += '<div style="font-size:80px;margin-bottom:24px">📊</div>';
            html += '<div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen statistik</div>';
            html += '<div style="font-size:22px;color:#888">Ingen data hittades</div>';
            html += '</div>';
        }

        VR.updateLoader(100, 'Klar!');

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', html);
        }, 300);
    };

    // ===== TOGGLE SETTINGS =====
    VR.toggleSettings = function() {
        var content = document.getElementById('vr-settings-content');
        var toggle = document.getElementById('vr-settings-toggle');
        if (!content || !toggle) return;

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
            localStorage.setItem('VR_settingsExpanded', 'true');
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
            localStorage.setItem('VR_settingsExpanded', 'false');
        }
    };

    // ===== TOGGLE MONTH EXPAND =====
    VR.toggleMonthExpand = function(cardId, monthKey) {
        var detailsId = 'vr-details-' + monthKey.replace(/[^a-z0-9]/gi, '');
        var expandBtn = document.getElementById('vr-expand-' + cardId);
        var detailsEl = document.getElementById(detailsId);
        if (!detailsEl || !expandBtn) return;

        if (detailsEl.style.display === 'none') {
            detailsEl.style.display = 'block';
            expandBtn.textContent = '−'; // Minus sign
        } else {
            detailsEl.style.display = 'none';
            expandBtn.textContent = '+';
        }
    };

    console.log('VR: Statistik loaded');
})();
