// VR CrewWeb - Lönberäkning
(function() {
    'use strict';

    var VR = window.VR;

    // ===== SALARY CONSTANTS =====
    VR.SALARIES = {
        'Lokförare': 46188,
        'Tågvärd': 36050
    };

    // Average work hours per week (holiday-free)
    VR.AVG_WORK_HOURS_WEEK = 38;

    // ===== MAIN ENTRY POINT =====
    VR.doLon = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Lönberäkning');
        VR.updateLoader(5, 'Kontrollerar data...');

        // Check if we have role
        if (!VR.userRole) {
            VR.updateLoader(10, 'Hämtar roll...');
            VR.fetchRoleForLon();
            return;
        }

        // Check if we need to fetch OB/SR data
        var hasOB = VR.obData && VR.obData.length > 0;
        var hasSR = VR.srData && Object.keys(VR.srData).length > 0;

        if (hasOB && hasSR) {
            // Data is cached, proceed immediately
            console.log('VR: Lön - using cached OB/SR data');
            VR.updateLoader(50, 'Data från cache...');
            VR.collectLonData();
            return;
        }

        // Need to fetch data
        VR.updateLoader(15, 'Hämtar tillägg...');
        VR.fetchTillaggForLon();
    };

    // ===== FETCH TILLAGG (OB + SR) =====
    VR.fetchTillaggForLon = function() {
        VR.updateLoader(20, 'Navigerar till löneredovisningar...');

        VR.navigateToLoneredovisningar(function() {
            VR.updateLoader(40, 'Laddar löneredovisningar...');
            VR.setupLonePageAndFetch(VR.parseTillaggForLon);
        });
    };

    VR.parseTillaggForLon = function() {
        VR.updateLoader(60, 'Analyserar OB-data...');

        // Parse OB data (same logic as vr-ob.js)
        var obData = [];
        var OB_RATES = {
            'L.Hb': { name: 'Kvalificerad OB', rate: 54.69 },
            'L.Storhelgstillägg': { name: 'Storhelgs OB', rate: 122.88 }
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';
                    var col2 = cells[1] ? cells[1].textContent.trim() : '';

                    if (col1.toLowerCase() === 'löneslag') continue;

                    if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                        var timeMatch = col2.match(/(\d+):(\d+)/);
                        var hours = 0;
                        var minutes = 0;
                        if (timeMatch) {
                            hours = parseInt(timeMatch[1], 10);
                            minutes = parseInt(timeMatch[2], 10);
                        }
                        var totalHours = hours + (minutes / 60);
                        var rate = OB_RATES[col1] ? OB_RATES[col1].rate : 0;
                        var kronor = totalHours * rate;

                        obData.push({
                            date: currentDate,
                            type: col1,
                            typeName: OB_RATES[col1] ? OB_RATES[col1].name : col1,
                            time: col2,
                            hours: totalHours,
                            rate: rate,
                            kronor: kronor
                        });
                    }

                    // Also parse SR-tillägg (Denmark trips)
                    if (col1.indexOf('S.Resa') > -1 && col1.indexOf('Danmark') > -1) {
                        var dateKey = currentDate;
                        if (!VR.srData[dateKey]) {
                            // Detect role from train number if possible
                            var c3 = '2'; // Default to Lokförare
                            VR.srData[dateKey] = {
                                date: dateKey,
                                type: 'SR',
                                amount: VR.SR_RATE || 75
                            };
                        }
                    }
                }
            }
        }

        // Store OB data globally
        VR.obData = obData;

        VR.updateLoader(80, 'Data hämtad!');

        // Now proceed to collect and render
        setTimeout(VR.collectLonData, 300);
    };

    // ===== FETCH ROLE =====
    VR.fetchRoleForLon = function() {
        // Try to get role from schema data first
        if (VR.allSchemaData) {
            var dates = Object.keys(VR.allSchemaData);
            for (var i = 0; i < dates.length; i++) {
                var entries = VR.allSchemaData[dates[i]];
                for (var j = 0; j < entries.length; j++) {
                    var tn = entries[j].tn;
                    if (tn && tn.length >= 3) {
                        var c3 = tn.charAt(2);
                        VR.userRole = VR.getRoleFromTrain(c3);
                        if (VR.userRole) {
                            VR.collectLonData();
                            return;
                        }
                    }
                }
            }
        }

        // Default to Lokförare if can't detect
        VR.userRole = 'Lokförare';
        VR.collectLonData();
    };

    // ===== COLLECT DATA =====
    VR.collectLonData = function() {
        VR.updateLoader(20, 'Samlar data...');

        // Initialize lon data object
        VR.lonData = {
            role: VR.userRole,
            baseSalary: VR.SALARIES[VR.userRole] || 46188,
            nextMonth: VR.getNextMonth(),
            ob: { total: 0, details: [] },
            sr: { total: 0, details: [] },
            overtime: { kvalificerad: 0, enkel: 0, totalKr: 0 },
            deductions: { total: 0, details: [] }
        };

        // Check if we have OB data cached (array)
        if (VR.obData && VR.obData.length > 0) {
            VR.calculateOBForMonth();
        }

        // Check if we have SR data cached (object with dateKey as keys)
        if (VR.srData && Object.keys(VR.srData).length > 0) {
            VR.calculateSRForMonth();
        }

        // Calculate overtime from schema if available
        if (VR.allSchemaData) {
            VR.calculateOvertimeForMonth();
        }

        VR.updateLoader(80, 'Bygger vy...');
        setTimeout(VR.renderLon, 300);
    };

    // ===== GET NEXT MONTH =====
    VR.getNextMonth = function() {
        var now = new Date();
        var nextMonth = now.getMonth() + 1;
        var nextYear = now.getFullYear();
        if (nextMonth > 11) {
            nextMonth = 0;
            nextYear++;
        }
        return {
            month: nextMonth,
            year: nextYear,
            name: VR.MONTHS[nextMonth] + ' ' + nextYear
        };
    };

    // ===== CALCULATE OB FOR MONTH =====
    VR.calculateOBForMonth = function() {
        var next = VR.lonData.nextMonth;
        var total = 0;

        for (var i = 0; i < VR.obData.length; i++) {
            var entry = VR.obData[i];
            // Parse date
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === next.month && year === next.year) {
                    // Use kronor field from OB data
                    total += entry.kronor || entry.amount || 0;
                    VR.lonData.ob.details.push(entry);
                }
            }
        }

        VR.lonData.ob.total = total;
    };

    // ===== CALCULATE SR FOR MONTH =====
    VR.calculateSRForMonth = function() {
        var next = VR.lonData.nextMonth;
        var total = 0;
        var rate = VR.SR_RATE || 75; // Use global rate

        // VR.srData is an object with dateKey as keys
        var keys = Object.keys(VR.srData);
        for (var i = 0; i < keys.length; i++) {
            var entry = VR.srData[keys[i]];
            var dateKey = entry.date || keys[i];
            var parts = dateKey.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === next.month && year === next.year) {
                    var amount = rate; // kr per trip
                    total += amount;
                    VR.lonData.sr.details.push({ date: dateKey, amount: amount });
                }
            }
        }

        VR.lonData.sr.total = total;
    };

    // ===== CALCULATE OVERTIME =====
    VR.calculateOvertimeForMonth = function() {
        var next = VR.lonData.nextMonth;
        var salary = VR.lonData.baseSalary;

        // Calculate hourly rates
        var kvalRate = salary / 72;
        var enkelRate = salary / 92;

        // For now, just placeholder - will implement when we have overtime data
        VR.lonData.overtime.kvalRate = kvalRate;
        VR.lonData.overtime.enkelRate = enkelRate;
    };

    // ===== FORMAT CURRENCY =====
    VR.formatKr = function(amount) {
        return Math.round(amount).toLocaleString('sv-SE') + ' kr';
    };

    // ===== RENDER LON =====
    VR.renderLon = function() {
        var data = VR.lonData;
        var salary = data.baseSalary;

        // Calculate totals
        var grossTotal = salary + data.ob.total + data.sr.total + data.overtime.totalKr;
        var netTotal = grossTotal - data.deductions.total;

        var html = '';

        // Header with role and month
        html += '<div style="background:linear-gradient(135deg,#34C759,#30D158);border-radius:24px;padding:28px;margin-bottom:16px;text-align:center;color:#fff;box-shadow:0 6px 20px rgba(52,199,89,0.3)">';
        html += '<div style="font-size:24px;opacity:0.9;margin-bottom:8px">Beräknad lön</div>';
        html += '<div style="font-size:36px;font-weight:700;margin-bottom:8px">' + data.nextMonth.name + '</div>';
        html += '<div style="font-size:20px;opacity:0.8">' + (data.role === 'Lokförare' ? '🚂' : '🎫') + ' ' + data.role + '</div>';
        html += '</div>';

        // Gross total box
        html += '<div style="background:#fff;border-radius:24px;padding:28px;margin-bottom:16px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:22px;color:#666;margin-bottom:8px">Bruttolön (uppskattad)</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#333">' + VR.formatKr(grossTotal) + '</div>';
        html += '</div>';

        // Breakdown list
        html += '<div style="background:#fff;border-radius:24px;padding:24px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;font-weight:700;color:#333;margin-bottom:20px">Specifikation</div>';

        // Base salary
        html += VR.buildLonRow('💰', 'Månadslön', VR.formatKr(salary), '#007AFF');

        // OB
        if (data.ob.total > 0) {
            html += VR.buildLonRow('🌙', 'OB-tillägg', '+' + VR.formatKr(data.ob.total), '#34C759');
        } else {
            html += VR.buildLonRow('🌙', 'OB-tillägg', 'Ingen data', '#999');
        }

        // SR
        if (data.sr.total > 0) {
            html += VR.buildLonRow('🇩🇰', 'SR-tillägg', '+' + VR.formatKr(data.sr.total), '#34C759');
        } else {
            html += VR.buildLonRow('🇩🇰', 'SR-tillägg', 'Ingen data', '#999');
        }

        // Overtime
        html += VR.buildLonRow('⏱️', 'Övertid', 'Kommer snart', '#999');

        // Deductions
        if (data.deductions.total > 0) {
            html += VR.buildLonRow('📉', 'Avdrag', '-' + VR.formatKr(data.deductions.total), '#FF3B30');
        } else {
            html += VR.buildLonRow('📉', 'Frånvaroavdrag', 'Ingen', '#999');
        }

        // Divider
        html += '<div style="border-top:2px solid #E5E5E5;margin:20px 0"></div>';

        // Total
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">';
        html += '<div style="font-size:28px;font-weight:700;color:#333">Summa</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#34C759">' + VR.formatKr(grossTotal) + '</div>';
        html += '</div>';

        html += '</div>';

        // Info box
        html += '<div style="background:#FFF3E0;border-radius:16px;padding:20px;margin-top:16px">';
        html += '<div style="font-size:18px;color:#E65100;font-weight:600;margin-bottom:8px">ℹ️ Information</div>';
        html += '<div style="font-size:16px;color:#F57C00;line-height:1.5">';
        html += 'Detta är en uppskattning. OB och SR-tillägg baseras på schemalagda turer. ';
        html += 'Övertid och avdrag kommer läggas till i framtida versioner.';
        html += '</div>';
        html += '</div>';

        // Hourly rates info
        html += '<div style="background:#E3F2FD;border-radius:16px;padding:20px;margin-top:12px">';
        html += '<div style="font-size:18px;color:#1565C0;font-weight:600;margin-bottom:12px">📊 Timpriser</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
        html += '<div style="text-align:center"><div style="font-size:14px;color:#666">Kval. övertid</div><div style="font-size:22px;font-weight:600;color:#1565C0">' + VR.formatKr(salary / 72) + '/h</div></div>';
        html += '<div style="text-align:center"><div style="font-size:14px;color:#666">Enkel övertid</div><div style="font-size:22px;font-weight:600;color:#1565C0">' + VR.formatKr(salary / 92) + '/h</div></div>';
        html += '</div>';
        html += '</div>';

        VR.updateLoader(100, 'Klar!');

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', html);
        }, 300);
    };

    // ===== BUILD LON ROW =====
    VR.buildLonRow = function(icon, label, value, color) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid #F0F0F0">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
            '<span style="font-size:28px">' + icon + '</span>' +
            '<span style="font-size:22px;color:#333">' + label + '</span>' +
            '</div>' +
            '<span style="font-size:24px;font-weight:600;color:' + color + '">' + value + '</span>' +
            '</div>';
    };

    console.log('VR: Lönberäkning loaded');
})();
