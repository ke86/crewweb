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

    // ===== LÖN CACHE =====
    VR.LON_CACHE_KEY = 'vr_lon_cache';

    VR.getLonCacheKey = function(year, month) {
        return year + '-' + ('0' + (month + 1)).slice(-2);
    };

    VR.getLonFromCache = function(year, month) {
        try {
            var cached = localStorage.getItem(VR.LON_CACHE_KEY);
            if (!cached) return null;
            var data = JSON.parse(cached);
            var key = VR.getLonCacheKey(year, month);
            return data[key] || null;
        } catch (e) {
            return null;
        }
    };

    VR.saveLonToCache = function(year, month, lonData) {
        try {
            var cached = localStorage.getItem(VR.LON_CACHE_KEY);
            var data = cached ? JSON.parse(cached) : {};
            var key = VR.getLonCacheKey(year, month);
            data[key] = {
                lonData: lonData,
                savedAt: Date.now()
            };
            localStorage.setItem(VR.LON_CACHE_KEY, JSON.stringify(data));
            console.log('VR: Lön cached for', key);
        } catch (e) {
            console.log('VR: Lön cache save error', e);
        }
    };

    VR.isLonMonthInPast = function(offset) {
        // offset 0 = current month (don't cache)
        // offset -1 = previous month (cache it)
        return offset < 0;
    };

    // ===== SILENT CALCULATION FOR PRELOAD =====
    // Calculates lön for a given month offset without rendering UI
    VR.calculateLonForPreload = function(offset) {
        console.log('VR: Calculating lön for preload, offset:', offset);

        var payoutInfo = VR.getPayoutMonthInfo(offset);

        // Initialize lon data object
        var lonData = {
            role: VR.userRole || 'Lokförare',
            baseSalary: VR.SALARIES[VR.userRole] || 46188,
            payoutInfo: payoutInfo,
            targetMonth: payoutInfo.workMonth,
            targetYear: payoutInfo.workYear,
            ob: { total: 0, details: [] },
            sr: { total: 0, details: [] },
            overtime: { kvalificerad: 0, enkel: 0, totalKr: 0 },
            deductions: { total: 0, details: [] }
        };

        // Calculate OB for month
        if (VR.obData && VR.obData.length > 0) {
            var obTotal = 0;
            for (var i = 0; i < VR.obData.length; i++) {
                var entry = VR.obData[i];
                var parts = (entry.date || '').split('-');
                if (parts.length === 3) {
                    var entryMonth = parseInt(parts[1], 10) - 1;
                    var entryYear = parseInt(parts[2], 10);
                    if (entryMonth === lonData.targetMonth && entryYear === lonData.targetYear) {
                        obTotal += entry.amount || 0;
                    }
                }
            }
            lonData.ob.total = obTotal;
        }

        // Calculate SR for month
        if (VR.srData) {
            var srTotal = 0;
            for (var dateKey in VR.srData) {
                if (VR.srData.hasOwnProperty(dateKey)) {
                    var srEntry = VR.srData[dateKey];
                    var srParts = dateKey.split('-');
                    if (srParts.length === 3) {
                        var srMonth = parseInt(srParts[1], 10) - 1;
                        var srYear = parseInt(srParts[2], 10);
                        if (srMonth === lonData.targetMonth && srYear === lonData.targetYear) {
                            srTotal += srEntry.amount || 0;
                        }
                    }
                }
            }
            lonData.sr.total = srTotal;
        }

        // Calculate totals
        var grossTotal = lonData.baseSalary + lonData.ob.total + lonData.sr.total + lonData.overtime.totalKr;
        var netTotal = grossTotal - lonData.deductions.total;
        lonData.netTotal = netTotal;

        // Save to cache
        VR.saveLonToCache(payoutInfo.workYear, payoutInfo.workMonth, lonData);

        console.log('VR: Preload lön cached for', payoutInfo.workYear, payoutInfo.workMonth);
    };

    // ===== MAIN ENTRY POINT =====
    VR.doLon = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Lönberäkning');
        VR.updateLoader(5, 'Kontrollerar data...');

        // Check if we're viewing a past month and have it cached
        if (VR.isLonMonthInPast(VR.lonMonthOffset)) {
            var payoutInfo = VR.getPayoutMonthInfo(VR.lonMonthOffset);
            var cachedLon = VR.getLonFromCache(payoutInfo.workYear, payoutInfo.workMonth);
            if (cachedLon && cachedLon.lonData) {
                console.log('VR: Lön from cache for', payoutInfo.workYear, payoutInfo.workMonth);
                VR.lonData = cachedLon.lonData;
                VR.updateLoader(90, 'Från cache...');
                setTimeout(VR.renderLon, 200);
                return;
            }
        }

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
        // Priority 1: Try to get role from cached anställddata
        var cachedRole = VR.getRoleFromCache ? VR.getRoleFromCache() : null;
        if (cachedRole) {
            console.log('VR: Role from cache:', cachedRole);
            VR.userRole = cachedRole;
            VR.collectLonData();
            return;
        }

        // Priority 2: Try to get role from schema data (tour number)
        if (VR.allSchemaData) {
            var dates = Object.keys(VR.allSchemaData);
            for (var i = 0; i < dates.length; i++) {
                var entries = VR.allSchemaData[dates[i]];
                for (var j = 0; j < entries.length; j++) {
                    var tn = entries[j].tn;
                    if (tn && tn.length >= 3) {
                        var role = VR.getRoleFromTour(tn);
                        if (role) {
                            console.log('VR: Role from tour number:', role);
                            VR.userRole = role;
                            VR.collectLonData();
                            return;
                        }
                    }
                }
            }
        }

        // Default to Lokförare if can't detect
        console.log('VR: Role defaulting to Lokförare');
        VR.userRole = 'Lokförare';
        VR.collectLonData();
    };

    // ===== MONTH OFFSET FOR NAVIGATION =====
    VR.lonMonthOffset = 0; // 0 = current month, -1 = previous month, etc.

    // ===== COLLECT DATA =====
    VR.collectLonData = function() {
        VR.updateLoader(20, 'Samlar data...');

        // Get payout info with offset
        var payoutInfo = VR.getPayoutMonthInfo(VR.lonMonthOffset);

        // Initialize lon data object
        VR.lonData = {
            role: VR.userRole,
            baseSalary: VR.SALARIES[VR.userRole] || 46188,
            payoutInfo: payoutInfo,
            // For calculations, use WORK month
            targetMonth: payoutInfo.workMonth,
            targetYear: payoutInfo.workYear,
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

        // Calculate overtime from overtidData if available
        if (VR.overtidData && VR.overtidData.length > 0) {
            VR.calculateOvertimeForMonth();
        }

        // Calculate frånvaro deductions
        if (VR.franvaroData && VR.franvaroData.length > 0) {
            VR.calculateFranvaroForMonth();
        }

        VR.updateLoader(80, 'Bygger vy...');
        setTimeout(VR.renderLon, 300);
    };

    // ===== GET PAYOUT MONTH INFO =====
    // Lön som betalas ut nästa månad är för arbete DENNA månad
    // Ex: Det är januari 29 → Februari-lönen är för januari-arbete
    // offset: 0 = current, -1 = previous month, etc.
    VR.getPayoutMonthInfo = function(offset) {
        offset = offset || 0;
        var now = new Date();
        var workMonth = now.getMonth() + offset; // Månaden vi arbetar
        var workYear = now.getFullYear();

        // Handle year wrapping for negative months
        while (workMonth < 0) {
            workMonth += 12;
            workYear--;
        }
        while (workMonth > 11) {
            workMonth -= 12;
            workYear++;
        }

        var payoutMonth = workMonth + 1; // Månaden lönen betalas ut
        var payoutYear = workYear;
        if (payoutMonth > 11) {
            payoutMonth = 0;
            payoutYear++;
        }
        return {
            workMonth: workMonth,        // Månaden arbetet utförs (0-11)
            workYear: workYear,
            payoutMonth: payoutMonth,    // Månaden lönen betalas ut (0-11)
            payoutYear: payoutYear,
            payoutName: VR.MONTHS[payoutMonth] + ' ' + payoutYear,
            workName: VR.MONTHS[workMonth] + ' ' + workYear,
            offset: offset
        };
    };

    // ===== NAVIGATE MONTH =====
    VR.navigateLonMonth = function(direction) {
        VR.lonMonthOffset += direction;
        // Limit to max 12 months back, and not future
        if (VR.lonMonthOffset > 0) VR.lonMonthOffset = 0;
        if (VR.lonMonthOffset < -12) VR.lonMonthOffset = -12;

        // Recalculate without showing loader
        VR.recalculateLonData();
    };

    // ===== RECALCULATE DATA (for month navigation) =====
    VR.recalculateLonData = function() {
        var payoutInfo = VR.getPayoutMonthInfo(VR.lonMonthOffset);

        VR.lonData = {
            role: VR.userRole,
            baseSalary: VR.SALARIES[VR.userRole] || 46188,
            payoutInfo: payoutInfo,
            targetMonth: payoutInfo.workMonth,
            targetYear: payoutInfo.workYear,
            ob: { total: 0, details: [] },
            sr: { total: 0, details: [] },
            overtime: { kvalificerad: 0, enkel: 0, totalKr: 0 },
            deductions: { total: 0, details: [] }
        };

        if (VR.obData && VR.obData.length > 0) VR.calculateOBForMonth();
        if (VR.srData && Object.keys(VR.srData).length > 0) VR.calculateSRForMonth();
        if (VR.overtidData && VR.overtidData.length > 0) VR.calculateOvertimeForMonth();
        if (VR.franvaroData && VR.franvaroData.length > 0) VR.calculateFranvaroForMonth();

        VR.renderLon();
    };

    // ===== CALCULATE OB FOR MONTH =====
    VR.calculateOBForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var total = 0;

        console.log('VR: Calculating OB for', VR.MONTHS[targetMonth], targetYear);

        for (var i = 0; i < VR.obData.length; i++) {
            var entry = VR.obData[i];
            // Parse date (dd-mm-yyyy)
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    // Use kronor field from OB data
                    total += entry.kronor || entry.amount || 0;
                    VR.lonData.ob.details.push(entry);
                }
            }
        }

        console.log('VR: OB total for', VR.MONTHS[targetMonth], ':', total, 'kr');
        VR.lonData.ob.total = total;
    };

    // ===== CALCULATE SR FOR MONTH =====
    VR.calculateSRForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var total = 0;
        var rate = VR.detectedSRRate || VR.SR_RATE || 75; // Use detected rate first

        console.log('VR: Calculating SR for', VR.MONTHS[targetMonth], targetYear, 'rate:', rate);
        console.log('VR: srData keys:', Object.keys(VR.srData));

        // VR.srData is an object with dateKey as keys
        var keys = Object.keys(VR.srData);
        for (var i = 0; i < keys.length; i++) {
            var entry = VR.srData[keys[i]];
            var dateKey = entry.date || keys[i];
            var parts = dateKey.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    var amount = rate; // kr per trip
                    total += amount;
                    VR.lonData.sr.details.push({ date: dateKey, amount: amount });
                }
            }
        }

        console.log('VR: SR total for', VR.MONTHS[targetMonth], ':', total, 'kr,', VR.lonData.sr.details.length, 'dagar');
        VR.lonData.sr.total = total;
    };

    // ===== CALCULATE OVERTIME =====
    VR.calculateOvertimeForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var salary = VR.lonData.baseSalary;

        // Calculate hourly rates
        var kvalRate = salary / 72;
        var enkelRate = salary / 92;
        VR.lonData.overtime.kvalRate = kvalRate;
        VR.lonData.overtime.enkelRate = enkelRate;

        var total = 0;
        var details = [];

        console.log('VR: Calculating Övertid for', VR.MONTHS[targetMonth], targetYear);

        for (var i = 0; i < VR.overtidData.length; i++) {
            var entry = VR.overtidData[i];
            // Parse date (dd-mm-yyyy)
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    total += entry.kronor || 0;
                    details.push(entry);
                }
            }
        }

        console.log('VR: Övertid total for', VR.MONTHS[targetMonth], ':', Math.round(total), 'kr,', details.length, 'poster');
        VR.lonData.overtime.totalKr = total;
        VR.lonData.overtime.details = details;
    };

    // ===== CALCULATE FRÅNVARO (DEDUCTIONS) =====
    VR.calculateFranvaroForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var salary = VR.lonData.baseSalary;

        // Frånvaroavdrag = månadslön / 175 * frånvarotimmar
        var hourlyDeduction = salary / 175;

        var totalMinutes = 0;
        var details = [];

        console.log('VR: Calculating Frånvaro for', VR.MONTHS[targetMonth], targetYear);
        console.log('VR: franvaroData entries:', VR.franvaroData.length);

        for (var i = 0; i < VR.franvaroData.length; i++) {
            var entry = VR.franvaroData[i];
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    totalMinutes += entry.minutes || 0;
                    details.push({
                        date: entry.date,
                        type: entry.typeName,
                        time: entry.time,
                        minutes: entry.minutes
                    });
                }
            }
        }

        var totalHours = totalMinutes / 60;
        var totalDeduction = hourlyDeduction * totalHours;

        console.log('VR: Frånvaro total:', totalMinutes, 'min =', totalHours.toFixed(2), 'h =', Math.round(totalDeduction), 'kr');

        VR.lonData.deductions.total = totalDeduction;
        VR.lonData.deductions.details = details;
        VR.lonData.deductions.totalMinutes = totalMinutes;
        VR.lonData.deductions.totalHours = totalHours;
        VR.lonData.deductions.hourlyRate = hourlyDeduction;
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

        // Calculate tax
        var taxRate = VR.getTotalTaxRate();
        var taxAmount = netTotal * (taxRate / 100);
        var netAfterTax = netTotal - taxAmount;

        // Format short month name (e.g. "Feb 2025")
        var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
        var payoutMonthShort = shortMonths[data.payoutInfo.payoutMonth] + ' ' + data.payoutInfo.payoutYear;

        var html = '';

        // Two-column layout: Tax settings + Salary box
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';

        // LEFT: Tax settings box
        html += '<div style="background:#fff;border-radius:24px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:16px">💼 Skatt</div>';

        // Municipality dropdown
        html += '<div style="margin-bottom:12px">';
        html += '<div style="font-size:14px;color:#666;margin-bottom:6px">Kommun</div>';
        html += '<select id="vrMunicipality" style="width:100%;padding:10px;font-size:16px;border:2px solid #E5E5E5;border-radius:12px;background:#F8F8F8;color:#333">';
        for (var i = 0; i < VR.MUNICIPALITIES.length; i++) {
            var m = VR.MUNICIPALITIES[i];
            var selected = m.name === VR.taxSettings.municipality ? ' selected' : '';
            html += '<option value="' + m.name + '"' + selected + '>' + m.name + ' (' + m.tax.toFixed(2) + '%)</option>';
        }
        html += '</select>';
        html += '</div>';

        // Church tax toggle
        var churchChecked = VR.taxSettings.churchTax ? ' checked' : '';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:10px;background:#F8F8F8;border-radius:12px">';
        html += '<div style="font-size:15px;color:#333">⛪ Kyrkskatt (' + VR.CHURCH_TAX.toFixed(1) + '%)</div>';
        html += '<label style="position:relative;width:50px;height:28px">';
        html += '<input type="checkbox" id="vrChurchTax"' + churchChecked + ' style="opacity:0;width:0;height:0">';
        html += '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (VR.taxSettings.churchTax ? '#34C759' : '#ccc') + ';border-radius:28px;transition:0.3s"></span>';
        html += '<span style="position:absolute;height:22px;width:22px;left:' + (VR.taxSettings.churchTax ? '25px' : '3px') + ';bottom:3px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></span>';
        html += '</label>';
        html += '</div>';

        // Burial fee (always on)
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#F0F0F5;border-radius:12px;margin-bottom:12px">';
        html += '<div style="font-size:15px;color:#666">⚱️ Begravningsavgift</div>';
        html += '<div style="font-size:15px;color:#666">' + VR.BURIAL_FEE.toFixed(2) + '%</div>';
        html += '</div>';

        // Total tax rate (app theme colors - dark blue like menu)
        html += '<div style="text-align:center;padding:12px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:12px">';
        html += '<div style="font-size:14px;color:rgba(255,255,255,0.7)">Total skattesats</div>';
        html += '<div id="vrTaxRateDisplay" style="font-size:28px;font-weight:700;color:#fff">' + taxRate.toFixed(2) + '%</div>';
        html += '</div>';

        html += '</div>';

        // RIGHT: Salary box
        html += '<div style="background:#fff;border-radius:24px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08);text-align:center;display:flex;flex-direction:column;justify-content:center">';

        // Month navigation header
        var canGoBack = VR.lonMonthOffset > -12;
        var canGoForward = VR.lonMonthOffset < 0;
        var prevStyle = canGoBack ? 'cursor:pointer;color:#007AFF' : 'cursor:default;color:#ccc';
        var nextStyle = canGoForward ? 'cursor:pointer;color:#007AFF' : 'cursor:default;color:#ccc';

        html += '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px">';
        html += '<span id="vrLonPrev" style="font-size:28px;' + prevStyle + '">◀</span>';
        html += '<div style="font-size:28px;font-weight:700;color:#007AFF">' + payoutMonthShort + '</div>';
        html += '<span id="vrLonNext" style="font-size:28px;' + nextStyle + '">▶</span>';
        html += '</div>';

        html += '<div style="font-size:14px;color:#666;margin-bottom:4px">Bruttolön</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#333;margin-bottom:8px">' + VR.formatKr(netTotal) + '</div>';
        html += '<div style="font-size:14px;color:#FF3B30;margin-bottom:8px">Skatt: -' + VR.formatKr(taxAmount) + '</div>';
        html += '<div style="border-top:2px solid #E5E5E5;padding-top:12px;margin-top:4px">';
        html += '<div style="font-size:14px;color:#666">Nettolön</div>';
        html += '<div id="vrNetSalary" style="font-size:36px;font-weight:700;color:#34C759">' + VR.formatKr(netAfterTax) + '</div>';
        html += '</div>';
        html += '</div>';

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
        if (data.overtime.totalKr > 0) {
            var otLabel = 'Övertid (' + data.overtime.details.length + ')';
            html += VR.buildLonRow('⏱️', otLabel, '+' + VR.formatKr(data.overtime.totalKr), '#FF9500');
        } else {
            html += VR.buildLonRow('⏱️', 'Övertid', 'Ingen data', '#999');
        }

        // Deductions (Frånvaro)
        if (data.deductions.total > 0) {
            var dedLabel = 'Frånvaroavdrag (' + data.deductions.details.length + 'd)';
            html += VR.buildLonRow('🏥', dedLabel, '-' + VR.formatKr(data.deductions.total), '#FF3B30');
        } else {
            html += VR.buildLonRow('🏥', 'Frånvaroavdrag', 'Ingen data', '#999');
        }

        // Divider
        html += '<div style="border-top:2px solid #E5E5E5;margin:20px 0"></div>';

        // Total
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">';
        html += '<div style="font-size:28px;font-weight:700;color:#333">Summa</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#34C759">' + VR.formatKr(netTotal) + '</div>';
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

        // Store netTotal for recalculation
        VR.lonData.netTotal = netTotal;

        // Cache this month's data if it's a past month
        if (VR.isLonMonthInPast(VR.lonMonthOffset)) {
            VR.saveLonToCache(data.payoutInfo.workYear, data.payoutInfo.workMonth, VR.lonData);
        }

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', html);

            // Add event listeners for tax settings and navigation
            VR.setupTaxListeners();
            VR.setupMonthNavListeners();
        }, 300);
    };

    // ===== SETUP MONTH NAVIGATION LISTENERS =====
    VR.setupMonthNavListeners = function() {
        var prevBtn = document.getElementById('vrLonPrev');
        var nextBtn = document.getElementById('vrLonNext');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (VR.lonMonthOffset > -12) {
                    VR.navigateLonMonth(-1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (VR.lonMonthOffset < 0) {
                    VR.navigateLonMonth(1);
                }
            });
        }
    };

    // ===== SETUP TAX LISTENERS =====
    VR.setupTaxListeners = function() {
        var muniSelect = document.getElementById('vrMunicipality');
        var churchCheck = document.getElementById('vrChurchTax');

        if (muniSelect) {
            muniSelect.addEventListener('change', function() {
                VR.taxSettings.municipality = this.value;
                VR.updateTaxDisplay();
            });
        }

        if (churchCheck) {
            churchCheck.addEventListener('change', function() {
                VR.taxSettings.churchTax = this.checked;
                VR.updateTaxDisplay();

                // Update toggle visual
                var toggle = this.parentElement;
                var bg = toggle.querySelector('span:first-of-type');
                var knob = toggle.querySelector('span:last-of-type');
                if (bg) bg.style.background = this.checked ? '#34C759' : '#ccc';
                if (knob) knob.style.left = this.checked ? '25px' : '3px';
            });
        }
    };

    // ===== UPDATE TAX DISPLAY =====
    VR.updateTaxDisplay = function() {
        var netTotal = VR.lonData.netTotal || 0;
        var taxRate = VR.getTotalTaxRate();
        var taxAmount = netTotal * (taxRate / 100);
        var netAfterTax = netTotal - taxAmount;

        // Update displays
        var rateEl = document.getElementById('vrTaxRateDisplay');
        var netEl = document.getElementById('vrNetSalary');

        if (rateEl) rateEl.textContent = taxRate.toFixed(2) + '%';
        if (netEl) netEl.textContent = VR.formatKr(netAfterTax);
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
