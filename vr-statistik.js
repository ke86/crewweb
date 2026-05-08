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

    // Multiply time: arbetsdagar × 7:36
    // 7:36 = 7 hours 36 minutes = 456 minutes
    VR.calculateNormtid = function(arbetsdagar) {
        var normPerDay = 7 * 60 + 36; // 456 minutes
        return arbetsdagar * normPerDay;
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

            // Special cases
            var isAFD = psU.indexOf('AFD') > -1 || cdU.indexOf('AFD') > -1;
            var isSemesterBetald = psU.indexOf('SEMESTER BETALD') > -1 || cdU.indexOf('SEMESTER BETALD') > -1;

            // Regular free day checks
            var isFPV = psU === 'FV' || psU === 'FP2' || psU === 'FP-V' ||
                        psU.indexOf('FP-V') > -1 || psU.indexOf('FP2') > -1;
            var isFree = (cdU === 'FRIDAG') || (psU === 'FRIDAG') || isFPV;

            // Handle work days with priority: special cases → normal work days
            if (isAFD) {
                // AFD: counts as work day, 0 hours
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'AFD', minutes: 0 });
            } else if (isSemesterBetald) {
                // Semester Betald: counts as work day, exactly 7:36 (456 min)
                monthlyStats[monthKey].arbetsdagar++;
                monthlyStats[monthKey].arbetadTidMinutes += 456;
                monthlyStats[monthKey].days.push({ date: dateKey, type: 'Semester Betald', minutes: 456 });
            } else if (!isFree && mainEntry.pt) {
                // Normal work day with paid time
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

        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';

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

            html += '<div style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';

            // Month header
            html += '<div style="font-size:28px;font-weight:700;color:#333;margin-bottom:16px;text-align:center">' + monthNames[stats.month] + '</div>';

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
            html += '<div style="background:' + (diffMinutes >= 0 ? '#F0FDF4' : '#FEF2F2') + ';border-radius:12px;padding:14px;text-align:center;margin-top:12px">';
            html += '<div style="font-size:20px;color:#666">+/-</div>';
            html += '<div style="font-size:32px;font-weight:700;color:' + diffColor + '">' + diffStr + '</div>';
            html += '</div>';

            // Detaljer button with data attribute
            html += '<div style="margin-top:12px;text-align:center">';
            html += '<button class="vr-month-details-btn" data-month="' + mKey + '" style="background:#007AFF;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:18px;font-weight:600;cursor:pointer;width:100%">📊 Detaljer</button>';
            html += '</div>';

            html += '</div>';
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

            // Attach event listeners to detail buttons
            setTimeout(function() {
                var btns = document.querySelectorAll('.vr-month-details-btn');
                for (var b = 0; b < btns.length; b++) {
                    btns[b].addEventListener('click', function() {
                        var monthKey = this.getAttribute('data-month');
                        VR.showMonthDetails(monthKey);
                    });
                }
            }, 100);
        }, 300);
    };

    // ===== SHOW MONTH DETAILS =====
    VR.showMonthDetails = function(monthKey) {
        var stats = VR.currentMonthlyStats[monthKey];
        if (!stats) return;

        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        var monthName = monthNames[stats.month] + ' ' + stats.year;

        // Calculate stats
        var normtidMinutes = VR.calculateNormtid(stats.arbetsdagar);
        var diffMinutes = normtidMinutes - stats.arbetadTidMinutes;

        // Count by type
        var typeCounts = { 'Arbetsdag': 0, 'AFD': 0, 'Semester Betald': 0 };
        var typeMinutes = { 'Arbetsdag': 0, 'AFD': 0, 'Semester Betald': 0 };
        for (var i = 0; i < stats.days.length; i++) {
            var day = stats.days[i];
            typeCounts[day.type] = (typeCounts[day.type] || 0) + 1;
            typeMinutes[day.type] = (typeMinutes[day.type] || 0) + day.minutes;
        }

        // Build HTML
        var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px" onclick="if(event.target===this) this.remove()">';
        html += '<div style="background:#f8f8f8;border-radius:27px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.3)" onclick="event.stopPropagation()">';

        // Header
        html += '<div style="background:#fff;border-radius:27px 27px 0 0;padding:24px;position:sticky;top:0;z-index:1;box-shadow:0 2px 10px rgba(0,0,0,0.05)">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center">';
        html += '<div style="font-size:28px;font-weight:700;color:#333">📊 ' + monthName + '</div>';
        html += '<div onclick="this.closest(\'.fixed\').remove()" style="font-size:32px;cursor:pointer;color:#999;line-height:1;padding:0 8px" title="Stäng">×</div>';
        html += '</div></div>';

        html += '<div style="padding:24px">';

        // Category breakdown
        html += '<div style="background:#fff;border-radius:20px;padding:20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">';
        html += '<div style="font-size:22px;font-weight:700;color:#333;margin-bottom:16px">📋 Uppdelning</div>';

        for (var type in typeCounts) {
            if (typeCounts[type] > 0) {
                var typeH = Math.floor(typeMinutes[type] / 60);
                var typeM = typeMinutes[type] % 60;
                var typeStr = typeH + 'h' + (typeM > 0 ? ' ' + typeM + 'm' : '');
                var typeColor = type === 'AFD' ? '#9B59B6' : (type === 'Semester Betald' ? '#34C759' : '#007AFF');

                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#f5f5f5;border-radius:12px;margin-bottom:8px">';
                html += '<div style="font-size:18px;color:#666">' + type + '</div>';
                html += '<div style="font-size:20px;font-weight:600;color:' + typeColor + '">' + typeCounts[type] + ' (' + typeStr + ')</div>';
                html += '</div>';
            }
        }
        html += '</div>';

        // Calculation
        html += '<div style="background:#fff;border-radius:20px;padding:20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">';
        html += '<div style="font-size:22px;font-weight:700;color:#333;margin-bottom:16px">⚙️ Beräkning</div>';

        var normH = Math.floor(normtidMinutes / 60);
        var normM = normtidMinutes % 60;
        var normStr = normH + 'h' + (normM > 0 ? ' ' + normM + 'm' : '');

        var arbH = Math.floor(stats.arbetadTidMinutes / 60);
        var arbM = stats.arbetadTidMinutes % 60;
        var arbStr = arbH + 'h' + (arbM > 0 ? ' ' + arbM + 'm' : '');

        var displayDiff = -diffMinutes;
        var diffStr = VR.formatMinutesToTime(displayDiff);
        var diffColor = diffMinutes >= 0 ? '#34C759' : '#FF3B30';

        html += '<div style="font-size:16px;color:#666;margin-bottom:8px">• Arbetsdagar: <strong>' + stats.arbetsdagar + '</strong></div>';
        html += '<div style="font-size:16px;color:#666;margin-bottom:8px">• Normtid: ' + stats.arbetsdagar + ' × 7:36 = <strong>' + normStr + '</strong></div>';
        html += '<div style="font-size:16px;color:#666;margin-bottom:8px">• Arbetad tid: <strong>' + arbStr + '</strong></div>';
        html += '<div style="font-size:18px;font-weight:700;color:' + diffColor + ';margin-top:12px">Skillnad: ' + diffStr + '</div>';
        html += '</div>';

        // Day-by-day list
        html += '<div style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">';
        html += '<div style="font-size:22px;font-weight:700;color:#333;margin-bottom:16px">📅 Dag för dag</div>';

        var sortedDays = stats.days.slice().sort(function(a, b) {
            return a.date.localeCompare(b.date);
        });

        for (var d = 0; d < sortedDays.length; d++) {
            var day = sortedDays[d];
            var dayH = Math.floor(day.minutes / 60);
            var dayM = day.minutes % 60;
            var dayStr = dayH + 'h' + (dayM > 0 ? ' ' + dayM + 'm' : '');
            var dayColor = day.type === 'AFD' ? '#9B59B6' : (day.type === 'Semester Betald' ? '#34C759' : '#007AFF');

            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #f0f0f0">';
            html += '<div style="flex:1">';
            html += '<div style="font-size:16px;color:#333;font-weight:600">' + day.date + '</div>';
            html += '<div style="font-size:14px;color:' + dayColor + '">' + day.type + '</div>';
            html += '</div>';
            html += '<div style="font-size:18px;font-weight:700;color:#333">' + dayStr + '</div>';
            html += '</div>';
        }

        html += '</div>';

        html += '</div>'; // padding
        html += '</div>'; // modal content
        html += '</div>'; // overlay

        document.body.insertAdjacentHTML('beforeend', html);
    };

    console.log('VR: Statistik loaded');
})();
