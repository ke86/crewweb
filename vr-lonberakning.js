// VR CrewWeb - Lönberäkning V.1.46
(function() {
    'use strict';

    var VR = window.VR;

    // ===== SALARY CONSTANTS =====
    VR.SALARIES = {
        'Lokförare': 46188,
        'Tågvärd': 36050
    };

    VR.AVG_WORK_HOURS_WEEK = 38;

    // ===== MONTH OFFSET FOR NAVIGATION =====
    VR.lonMonthOffset = 0;

    // ===== MAIN ENTRY POINT =====
    VR.doLon = function() {
        VR.stopTimer();
        VR.closeOverlay();

        // Load saved role from settings
        if (!VR.userRole) {
            var savedRole = VR.getSetting ? VR.getSetting('role') : null;
            if (savedRole) {
                VR.userRole = savedRole;
            }
        }

        // Check if we have ALL data needed
        var hasOB = VR.obData && VR.obData.length > 0;
        var hasSR = VR.srData && Object.keys(VR.srData).length > 0;
        var hasOvertid = VR.overtidData && VR.overtidData.length > 0;
        var hasFranvaro = VR.franvaroData !== undefined; // can be empty array

        // Check role
        if (!VR.userRole) {
            VR.fetchRoleForLon();
        }

        // If all data loaded, show salary directly
        if (hasOB && hasSR && hasFranvaro) {
            VR.showLoader('Lönberäkning');
            VR.updateLoader(90, 'Beräknar...');
            VR.collectLonData();
            return;
        }

        // Show "Hämta allt" landing page
        VR.showLonLanding();
    };

    // ===== LANDING PAGE WITH "HÄMTA ALLT" BUTTON =====
    VR.showLonLanding = function() {
        var role = VR.userRole || 'Lokförare';
        var salary = VR.SALARIES[role] || 46188;
        var payoutInfo = VR.getPayoutMonthInfo(VR.lonMonthOffset);

        var hasOB = VR.obData && VR.obData.length > 0;
        var hasSR = VR.srData && Object.keys(VR.srData).length > 0;
        var hasOvertid = VR.overtidData && VR.overtidData.length > 0;
        var hasFranvaro = VR.franvaroData && VR.franvaroData.length > 0;

        var html = '<style>\
.vr-lon-landing{width:100%;padding:0 16px;box-sizing:border-box}\
.vr-lon-header{background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:36px 24px;margin-bottom:20px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)}\
.vr-lon-header-title{font-size:36px;font-weight:700;color:#fff;margin-bottom:8px}\
.vr-lon-header-sub{font-size:18px;color:rgba(255,255,255,0.6)}\
.vr-lon-role-box{background:#fff;border-radius:18px;padding:22px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between}\
.vr-lon-role-label{font-size:18px;color:#666}\
.vr-lon-role-value{font-size:22px;font-weight:700;color:#1a1a2e}\
.vr-lon-status-list{background:#fff;border-radius:18px;padding:24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}\
.vr-lon-status-item{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f0f0f0}\
.vr-lon-status-item:last-child{border-bottom:none}\
.vr-lon-status-icon{font-size:28px;width:36px;text-align:center}\
.vr-lon-status-text{flex:1;font-size:18px;color:#333}\
.vr-lon-status-badge{font-size:15px;font-weight:600;padding:6px 14px;border-radius:20px}\
.vr-lon-status-badge.ok{background:#E8F5E9;color:#2E7D32}\
.vr-lon-status-badge.missing{background:#FFF3E0;color:#E65100}\
.vr-lon-fetch-btn{width:100%;padding:22px;border:none;border-radius:16px;font-size:22px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:12px;background:linear-gradient(135deg,#007AFF 0%,#5856D6 100%);color:#fff;box-shadow:0 4px 16px rgba(0,122,255,0.3);margin-bottom:16px}\
.vr-lon-fetch-btn:active{transform:scale(0.97)}\
.vr-lon-progress{background:#fff;border-radius:18px;padding:28px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-align:center;display:none}\
.vr-lon-progress-bar{width:100%;height:8px;background:#E5E5EA;border-radius:4px;overflow:hidden;margin:20px 0}\
.vr-lon-progress-fill{height:100%;background:linear-gradient(90deg,#007AFF,#5856D6);border-radius:4px;transition:width 0.4s ease;width:0%}\
.vr-lon-progress-step{font-size:18px;color:#333;font-weight:600;margin-bottom:8px}\
.vr-lon-progress-detail{font-size:16px;color:#888}\
.vr-lon-step-list{text-align:left;margin-top:20px}\
.vr-lon-step{display:flex;align-items:center;gap:12px;padding:10px 0;font-size:17px;color:#999}\
.vr-lon-step.active{color:#007AFF;font-weight:600}\
.vr-lon-step.done{color:#34C759}\
.vr-lon-step.error{color:#FF3B30}\
.vr-lon-info{background:#E3F2FD;border-radius:14px;padding:18px;font-size:16px;color:#1565C0;line-height:1.5}\
</style>';

        html += '<div class="vr-lon-landing">';

        // Header
        html += '<div class="vr-lon-header">';
        html += '<div class="vr-lon-header-title">💰 Lönberäkning</div>';
        html += '<div class="vr-lon-header-sub">Utbetalning ' + payoutInfo.payoutName + '</div>';
        html += '</div>';

        // Role box with selector
        html += '<div class="vr-lon-role-box">';
        html += '<div class="vr-lon-role-label">Roll</div>';
        html += '<div style="display:flex;align-items:center;gap:12px">';
        html += '<select id="vrLonRole" style="font-size:20px;font-weight:700;color:#1a1a2e;padding:8px 14px;border:2px solid #E5E5E5;border-radius:12px;background:#F8F8F8;-webkit-appearance:auto">';
        html += '<option value="Lokförare"' + (role === 'Lokförare' ? ' selected' : '') + '>Lokförare</option>';
        html += '<option value="Tågvärd"' + (role === 'Tågvärd' ? ' selected' : '') + '>Tågvärd</option>';
        html += '</select>';
        html += '<span style="font-size:17px;color:#666" id="vrLonSalaryLabel">' + VR.formatKr(salary) + '/mån</span>';
        html += '</div>';
        html += '</div>';

        // Data status
        html += '<div class="vr-lon-status-list">';
        html += '<div style="font-size:20px;font-weight:700;color:#333;margin-bottom:12px">Dataunderlag</div>';

        html += VR.buildStatusItem('🌙', 'OB-tillägg', hasOB);
        html += VR.buildStatusItem('🇩🇰', 'SR-tillägg (Danmark)', hasSR);
        html += VR.buildStatusItem('⏱️', 'Övertid', hasOvertid);
        html += VR.buildStatusItem('🏥', 'Frånvaroavdrag', hasFranvaro);

        html += '</div>';

        // Fetch button
        html += '<button class="vr-lon-fetch-btn" id="vrLonFetchBtn" onclick="VR.fetchAllLonData()">';
        html += '<span>📊</span> Hämta all data & beräkna</button>';

        // Progress panel (hidden initially)
        html += '<div class="vr-lon-progress" id="vrLonProgress">';
        html += '<div class="vr-lon-progress-step" id="vrLonProgressStep">Förbereder...</div>';
        html += '<div class="vr-lon-progress-bar"><div class="vr-lon-progress-fill" id="vrLonProgressFill"></div></div>';
        html += '<div class="vr-lon-progress-detail" id="vrLonProgressDetail"></div>';
        html += '<div class="vr-lon-step-list" id="vrLonStepList">';
        html += '<div class="vr-lon-step" id="vrStep1">⬜ Steg 1: Hämta OB, Övertid & Frånvaro</div>';
        html += '<div class="vr-lon-step" id="vrStep2">⬜ Steg 2: Hämta SR-tillägg (Danmark)</div>';
        html += '<div class="vr-lon-step" id="vrStep3">⬜ Steg 3: Beräkna lön</div>';
        html += '</div>';
        html += '</div>';

        // Info box
        html += '<div class="vr-lon-info">';
        html += '<strong>💡 Obs:</strong> Arbete i t.ex. januari → tillägg/avdrag på <strong>februari-lönen</strong>. ';
        html += 'Hämtningen tar ca 20-30 sekunder.';
        html += '</div>';

        html += '</div>';

        VR.showView('', '', html);

        // Setup role selector listener
        setTimeout(function() {
            var roleSelect = document.getElementById('vrLonRole');
            if (roleSelect) {
                roleSelect.addEventListener('change', function() {
                    VR.userRole = this.value;
                    var sal = VR.SALARIES[this.value] || 46188;
                    var label = document.getElementById('vrLonSalaryLabel');
                    if (label) label.textContent = VR.formatKr(sal) + '/mån';
                    // Save to localStorage
                    if (VR.saveSettings) VR.saveSettings({ role: this.value });
                });
            }
        }, 100);
    };

    // ===== STATUS ITEM BUILDER =====
    VR.buildStatusItem = function(icon, label, hasData) {
        var badge = hasData
            ? '<span class="vr-lon-status-badge ok">✓ Hämtad</span>'
            : '<span class="vr-lon-status-badge missing">Ej hämtad</span>';
        return '<div class="vr-lon-status-item">' +
            '<div class="vr-lon-status-icon">' + icon + '</div>' +
            '<div class="vr-lon-status-text">' + label + '</div>' +
            badge + '</div>';
    };

    // ===== HIDE/SHOW VR OVERLAY DURING NAVIGATION =====
    VR.hideOverlayForNav = function() {
        var vrView = document.getElementById(VR.ID.view || 'vrView');
        if (vrView) {
            vrView.style.display = 'none';
            console.log('VR: Overlay hidden for navigation');
        }
    };

    VR.showOverlayAfterNav = function() {
        var vrView = document.getElementById(VR.ID.view || 'vrView');
        if (vrView) {
            vrView.style.display = '';
            console.log('VR: Overlay restored');
        }
    };

    // ===== FETCH ALL DATA SEQUENTIALLY =====
    VR.fetchAllLonData = function() {
        // Hide button, show progress
        var btn = document.getElementById('vrLonFetchBtn');
        var progress = document.getElementById('vrLonProgress');
        if (btn) btn.style.display = 'none';
        if (progress) progress.style.display = 'block';

        VR.updateLonProgress('Startar...', 5, 'Navigerar till löneredovisningar...');
        VR.setLonStep(1, 'active');

        // IMPORTANT: Hide VR overlay so CrewWeb menu is accessible
        VR.hideOverlayForNav();

        // Step 1: Navigate to Löneredovisningar and parse OB + Övertid + Frånvaro
        VR.navigateToLoneredovisningar(function() {
            VR.updateLonProgress('Steg 1/3: Löneredovisningar', 15, 'Ställer in datum och hämtar...');
            VR.setupLonePageAndFetch(function() {
                VR.updateLonProgress('Steg 1/3: Parsar data...', 30, 'OB, Övertid, Frånvaro...');
                VR.parseAllLoneData();

                VR.setLonStep(1, 'done');
                VR.setLonStep(2, 'active');

                // Step 2: Fetch SR-tillägg (from Arbetsdag page)
                VR.updateLonProgress('Steg 2/3: SR-tillägg', 45, 'Laddar Danmark-resor...');

                // Check if SR data already exists
                var hasSR = VR.srData && Object.keys(VR.srData).length > 0;
                if (hasSR) {
                    VR.updateLonProgress('Steg 2/3: SR redan hämtad', 65, VR.srData ? Object.keys(VR.srData).length + ' dagar' : '');
                    VR.setLonStep(2, 'done');
                    VR.finalizeLonCalculation();
                } else {
                    VR.fetchSRForLon(function() {
                        VR.setLonStep(2, 'done');
                        VR.finalizeLonCalculation();
                    });
                }
            });
        });
    };

    // ===== PARSE ALL LÖNE DATA (OB + Övertid + Frånvaro in one pass) =====
    VR.parseAllLoneData = function() {
        var obData = [];
        var overtidData = [];
        var franvaroData = [];

        var OB_RATES = {
            'L.Hb': { name: 'Kvalificerad OB', rate: 54.69 },
            'L.Storhelgstillägg': { name: 'Storhelgs OB', rate: 122.88 }
        };

        var OVERTIME_TYPES = VR.OVERTIME_TYPES || {
            'L.Övertid kvalificerad': { name: 'Kval. övertid', divisor: 72 },
            'L.Förseningsövertid Kval': { name: 'Kval. försening', divisor: 72 },
            'L.Övertid enkel': { name: 'Enkel övertid', divisor: 92 },
            'L.Förseningsövertid enkel': { name: 'Enkel försening', divisor: 92 }
        };

        var salary = VR.SALARIES[VR.userRole] || 46188;

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            // Detect date headers like "6-02-2026 - Fredag"
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

                    var timeMatch = col2.match(/(\d+):(\d+)/);
                    var hours = 0;
                    var minutes = 0;
                    if (timeMatch) {
                        hours = parseInt(timeMatch[1], 10);
                        minutes = parseInt(timeMatch[2], 10);
                    }
                    var totalHours = hours + (minutes / 60);

                    // --- OB ---
                    if (OB_RATES[col1]) {
                        var obRate = OB_RATES[col1].rate;
                        obData.push({
                            date: currentDate,
                            type: col1,
                            typeName: OB_RATES[col1].name,
                            time: col2,
                            hours: totalHours,
                            rate: obRate,
                            kronor: totalHours * obRate
                        });
                    }

                    // --- ÖVERTID ---
                    if (OVERTIME_TYPES[col1]) {
                        var otInfo = OVERTIME_TYPES[col1];
                        var otRate = salary / otInfo.divisor;
                        overtidData.push({
                            date: currentDate,
                            type: col1,
                            typeName: otInfo.name,
                            time: col2,
                            hours: totalHours,
                            rate: otRate,
                            divisor: otInfo.divisor,
                            kronor: totalHours * otRate
                        });
                    }

                    // --- FRÅNVARO ---
                    var franvaroInfo = null;
                    if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('>5') > -1) {
                        franvaroInfo = { name: 'Föräldraledig, lång', icon: '👶' };
                    } else if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('<5') > -1) {
                        franvaroInfo = { name: 'Föräldraledig, kort', icon: '👶' };
                    } else if (col1.indexOf('Vård av barn') > -1) {
                        franvaroInfo = { name: 'VAB', icon: '🏥' };
                    }

                    if (franvaroInfo) {
                        franvaroData.push({
                            date: currentDate,
                            originalType: col1,
                            typeName: franvaroInfo.name,
                            icon: franvaroInfo.icon,
                            time: col2,
                            minutes: hours * 60 + minutes
                        });
                    }
                }
            }
        }

        // Store globally
        VR.obData = obData;
        VR.overtidData = overtidData;
        VR.franvaroData = franvaroData;

        console.log('VR Lön: Parsed OB:', obData.length, 'Övertid:', overtidData.length, 'Frånvaro:', franvaroData.length);
    };

    // ===== FETCH SR FOR LÖN (Arbetsdag → Danmark-resor) =====
    VR.fetchSRForLon = function(callback) {
        // SR data comes from doSRTillagg which loads Arbetsdag page
        // We reuse the SR loading logic
        if (VR.loadBothMonths) {
            VR.updateLonProgress('Steg 2/3: SR-tillägg', 50, 'Öppnar Arbetsdag...');

            // Navigate to Arbetsdag
            VR.clickFolder();
            setTimeout(function() {
                var n = 0;
                var findTimer = setInterval(function() {
                    n++;
                    var el = VR.findMenuItem('Arbetsdag');
                    if (el) {
                        clearInterval(findTimer);
                        VR.updateLonProgress('Steg 2/3: SR-tillägg', 55, 'Laddar Arbetsdag...');
                        el.click();

                        // Wait for workdays table
                        var w = 0;
                        var waitTimer = setInterval(function() {
                            w++;
                            var tbl = document.querySelector('#workdays table');
                            if (tbl || w > 30) {
                                clearInterval(waitTimer);
                                VR.updateLonProgress('Steg 2/3: SR-tillägg', 60, 'Söker Danmark-resor...');

                                // Use SR-tillägg loading
                                VR.loadBothMonths(function() {
                                    VR.updateLonProgress('Steg 2/3: SR klar', 70,
                                        VR.srData ? Object.keys(VR.srData).length + ' Danmark-dagar' : 'Inga dagar');
                                    if (callback) callback();
                                });
                            }
                        }, 400);
                    } else if (n > 20) {
                        clearInterval(findTimer);
                        console.log('VR Lön: Could not find Arbetsdag menu for SR');
                        VR.updateLonProgress('Steg 2/3: SR', 70, 'Kunde ej hämta SR');
                        if (callback) callback();
                    }
                }, 400);
            }, 600);
        } else {
            console.log('VR Lön: SR loading function not available');
            if (callback) callback();
        }
    };

    // ===== FINALIZE CALCULATION =====
    VR.finalizeLonCalculation = function() {
        // Restore VR overlay before showing results
        VR.showOverlayAfterNav();

        VR.setLonStep(3, 'active');
        VR.updateLonProgress('Steg 3/3: Beräknar', 85, 'Sammanställer lön...');

        // Detect role if not set
        if (!VR.userRole) {
            VR.fetchRoleForLon();
        }

        setTimeout(function() {
            VR.updateLonProgress('Klar!', 100, '');
            VR.setLonStep(3, 'done');

            setTimeout(function() {
                VR.collectLonData();
            }, 500);
        }, 300);
    };

    // ===== PROGRESS UI HELPERS =====
    VR.updateLonProgress = function(step, percent, detail) {
        var stepEl = document.getElementById('vrLonProgressStep');
        var fillEl = document.getElementById('vrLonProgressFill');
        var detailEl = document.getElementById('vrLonProgressDetail');

        if (stepEl) stepEl.textContent = step;
        if (fillEl) fillEl.style.width = percent + '%';
        if (detailEl) detailEl.textContent = detail || '';
    };

    VR.setLonStep = function(num, state) {
        var el = document.getElementById('vrStep' + num);
        if (!el) return;

        el.className = 'vr-lon-step ' + state;

        var icons = { active: '🔄', done: '✅', error: '❌' };
        var text = el.textContent.substring(2); // Remove old icon
        el.textContent = (icons[state] || '⬜') + ' ' + text;
    };

    // ===== FETCH ROLE =====
    VR.fetchRoleForLon = function() {
        // Priority 1: Saved settings
        var savedRole = VR.getSetting ? VR.getSetting('role') : null;
        if (savedRole) {
            VR.userRole = savedRole;
            return;
        }

        // Priority 2: Cached anställddata
        var cachedRole = VR.getRoleFromCache ? VR.getRoleFromCache() : null;
        if (cachedRole) {
            VR.userRole = cachedRole;
            if (VR.saveSettings) VR.saveSettings({ role: cachedRole });
            return;
        }

        // Priority 3: Tour number from schema
        if (VR.allSchemaData) {
            var dates = Object.keys(VR.allSchemaData);
            for (var i = 0; i < dates.length; i++) {
                var entries = VR.allSchemaData[dates[i]];
                for (var j = 0; j < entries.length; j++) {
                    var tn = entries[j].tn;
                    if (tn && tn.length >= 3) {
                        var role = VR.getRoleFromTour(tn);
                        if (role) {
                            VR.userRole = role;
                            if (VR.saveSettings) VR.saveSettings({ role: role });
                            return;
                        }
                    }
                }
            }
        }

        // Default
        VR.userRole = 'Lokförare';
    };

    // ===== COLLECT DATA =====
    VR.collectLonData = function() {
        // Get payout info with offset
        var payoutInfo = VR.getPayoutMonthInfo(VR.lonMonthOffset);

        VR.lonData = {
            role: VR.userRole || 'Lokförare',
            baseSalary: VR.SALARIES[VR.userRole] || 46188,
            payoutInfo: payoutInfo,
            targetMonth: payoutInfo.workMonth,
            targetYear: payoutInfo.workYear,
            ob: { total: 0, details: [] },
            sr: { total: 0, details: [] },
            overtime: { kvalificerad: 0, enkel: 0, totalKr: 0, details: [] },
            deductions: { total: 0, details: [], totalMinutes: 0, totalHours: 0, hourlyRate: 0 }
        };

        if (VR.obData && VR.obData.length > 0) VR.calculateOBForMonth();
        if (VR.srData && Object.keys(VR.srData).length > 0) VR.calculateSRForMonth();
        if (VR.overtidData && VR.overtidData.length > 0) VR.calculateOvertimeForMonth();
        if (VR.franvaroData && VR.franvaroData.length > 0) VR.calculateFranvaroForMonth();

        VR.renderLon();
    };

    // ===== GET PAYOUT MONTH INFO =====
    VR.getPayoutMonthInfo = function(offset) {
        offset = offset || 0;
        var now = new Date();
        var workMonth = now.getMonth() + offset;
        var workYear = now.getFullYear();

        while (workMonth < 0) { workMonth += 12; workYear--; }
        while (workMonth > 11) { workMonth -= 12; workYear++; }

        var payoutMonth = workMonth + 1;
        var payoutYear = workYear;
        if (payoutMonth > 11) { payoutMonth = 0; payoutYear++; }

        return {
            workMonth: workMonth,
            workYear: workYear,
            payoutMonth: payoutMonth,
            payoutYear: payoutYear,
            payoutName: VR.MONTHS[payoutMonth] + ' ' + payoutYear,
            workName: VR.MONTHS[workMonth] + ' ' + workYear,
            offset: offset
        };
    };

    // ===== NAVIGATE MONTH =====
    VR.navigateLonMonth = function(direction) {
        VR.lonMonthOffset += direction;
        if (VR.lonMonthOffset > 0) VR.lonMonthOffset = 0;
        if (VR.lonMonthOffset < -12) VR.lonMonthOffset = -12;
        VR.collectLonData();
    };

    // ===== CALCULATE OB FOR MONTH =====
    VR.calculateOBForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var total = 0;

        for (var i = 0; i < VR.obData.length; i++) {
            var entry = VR.obData[i];
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    total += entry.kronor || 0;
                    VR.lonData.ob.details.push(entry);
                }
            }
        }
        VR.lonData.ob.total = total;
    };

    // ===== CALCULATE SR FOR MONTH =====
    VR.calculateSRForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var total = 0;
        var rate = VR.detectedSRRate || VR.SR_RATE || 75;

        var keys = Object.keys(VR.srData);
        for (var i = 0; i < keys.length; i++) {
            var entry = VR.srData[keys[i]];
            var dateKey = entry.date || keys[i];
            var parts = dateKey.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    total += rate;
                    VR.lonData.sr.details.push({ date: dateKey, amount: rate });
                }
            }
        }
        VR.lonData.sr.total = total;
    };

    // ===== CALCULATE OVERTIME =====
    VR.calculateOvertimeForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var salary = VR.lonData.baseSalary;
        var total = 0;

        VR.lonData.overtime.kvalRate = salary / 72;
        VR.lonData.overtime.enkelRate = salary / 92;

        for (var i = 0; i < VR.overtidData.length; i++) {
            var entry = VR.overtidData[i];
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    total += entry.kronor || 0;
                    VR.lonData.overtime.details.push(entry);
                }
            }
        }
        VR.lonData.overtime.totalKr = total;
    };

    // ===== CALCULATE FRÅNVARO =====
    VR.calculateFranvaroForMonth = function() {
        var targetMonth = VR.lonData.targetMonth;
        var targetYear = VR.lonData.targetYear;
        var salary = VR.lonData.baseSalary;
        var hourlyDeduction = salary / 175;
        var totalMinutes = 0;

        for (var i = 0; i < VR.franvaroData.length; i++) {
            var entry = VR.franvaroData[i];
            var parts = entry.date.split('-');
            if (parts.length === 3) {
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);
                if (month === targetMonth && year === targetYear) {
                    totalMinutes += entry.minutes || 0;
                    VR.lonData.deductions.details.push({
                        date: entry.date, type: entry.typeName,
                        time: entry.time, minutes: entry.minutes
                    });
                }
            }
        }

        var totalHours = totalMinutes / 60;
        VR.lonData.deductions.total = hourlyDeduction * totalHours;
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

        var grossTotal = salary + data.ob.total + data.sr.total + data.overtime.totalKr;
        var netTotal = grossTotal - data.deductions.total;
        var taxRate = VR.getTotalTaxRate();
        var taxAmount = netTotal * (taxRate / 100);
        var netAfterTax = netTotal - taxAmount;

        var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
        var payoutMonthShort = shortMonths[data.payoutInfo.payoutMonth] + ' ' + data.payoutInfo.payoutYear;

        var html = '<div style="width:100%;padding:0 16px;box-sizing:border-box">';

        // Month info banner
        html += '<div style="background:#E3F2FD;border-radius:14px;padding:14px 18px;margin-bottom:16px;text-align:center">';
        html += '<div style="font-size:15px;color:#1565C0">Arbete i <strong>' + data.payoutInfo.workName + '</strong> → Utbetalning <strong>' + data.payoutInfo.payoutName + '</strong></div>';
        html += '</div>';

        // Two-column: Tax + Salary
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';

        // LEFT: Tax
        html += '<div style="background:#fff;border-radius:24px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:18px;font-weight:700;color:#333;margin-bottom:16px">💼 Skatt</div>';

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

        var churchChecked = VR.taxSettings.churchTax ? ' checked' : '';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:10px;background:#F8F8F8;border-radius:12px">';
        html += '<div style="font-size:15px;color:#333">⛪ Kyrka (' + VR.CHURCH_TAX.toFixed(1) + '%)</div>';
        html += '<label style="position:relative;width:50px;height:28px">';
        html += '<input type="checkbox" id="vrChurchTax"' + churchChecked + ' style="opacity:0;width:0;height:0">';
        html += '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (VR.taxSettings.churchTax ? '#34C759' : '#ccc') + ';border-radius:28px;transition:0.3s"></span>';
        html += '<span style="position:absolute;height:22px;width:22px;left:' + (VR.taxSettings.churchTax ? '25px' : '3px') + ';bottom:3px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></span>';
        html += '</label>';
        html += '</div>';

        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#F0F0F5;border-radius:12px;margin-bottom:12px">';
        html += '<div style="font-size:15px;color:#666">⚱️ Begravning</div>';
        html += '<div style="font-size:15px;color:#666">' + VR.BURIAL_FEE.toFixed(2) + '%</div>';
        html += '</div>';

        html += '<div style="text-align:center;padding:12px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:12px">';
        html += '<div style="font-size:14px;color:rgba(255,255,255,0.7)">Total skattesats</div>';
        html += '<div id="vrTaxRateDisplay" style="font-size:28px;font-weight:700;color:#fff">' + taxRate.toFixed(2) + '%</div>';
        html += '</div>';
        html += '</div>';

        // RIGHT: Salary
        html += '<div style="background:#fff;border-radius:24px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.08);text-align:center;display:flex;flex-direction:column;justify-content:center">';

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

        // Breakdown
        html += '<div style="background:#fff;border-radius:24px;padding:24px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;font-weight:700;color:#333;margin-bottom:20px">Specifikation</div>';

        html += VR.buildLonRow('💰', 'Månadslön', VR.formatKr(salary), '#007AFF');

        if (data.ob.total > 0) {
            html += VR.buildLonRow('🌙', 'OB-tillägg (' + data.ob.details.length + ')', '+' + VR.formatKr(data.ob.total), '#34C759');
        } else {
            html += VR.buildLonRow('🌙', 'OB-tillägg', '0 kr', '#999');
        }

        if (data.sr.total > 0) {
            html += VR.buildLonRow('🇩🇰', 'SR-tillägg (' + data.sr.details.length + 'd)', '+' + VR.formatKr(data.sr.total), '#34C759');
        } else {
            html += VR.buildLonRow('🇩🇰', 'SR-tillägg', '0 kr', '#999');
        }

        if (data.overtime.totalKr > 0) {
            html += VR.buildLonRow('⏱️', 'Övertid (' + data.overtime.details.length + ')', '+' + VR.formatKr(data.overtime.totalKr), '#FF9500');
        } else {
            html += VR.buildLonRow('⏱️', 'Övertid', '0 kr', '#999');
        }

        if (data.deductions.total > 0) {
            html += VR.buildLonRow('🏥', 'Frånvaro (' + data.deductions.details.length + 'd)', '-' + VR.formatKr(data.deductions.total), '#FF3B30');
        } else {
            html += VR.buildLonRow('🏥', 'Frånvaroavdrag', '0 kr', '#999');
        }

        html += '<div style="border-top:2px solid #E5E5E5;margin:20px 0"></div>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">';
        html += '<div style="font-size:28px;font-weight:700;color:#333">Summa</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#34C759">' + VR.formatKr(netTotal) + '</div>';
        html += '</div>';
        html += '</div>';

        // Hourly rates
        html += '<div style="background:#E3F2FD;border-radius:16px;padding:20px;margin-top:12px">';
        html += '<div style="font-size:18px;color:#1565C0;font-weight:600;margin-bottom:12px">📊 Timpriser</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
        html += '<div style="text-align:center"><div style="font-size:14px;color:#666">Kval. övertid</div><div style="font-size:22px;font-weight:600;color:#1565C0">' + VR.formatKr(salary / 72) + '/h</div></div>';
        html += '<div style="text-align:center"><div style="font-size:14px;color:#666">Enkel övertid</div><div style="font-size:22px;font-weight:600;color:#1565C0">' + VR.formatKr(salary / 92) + '/h</div></div>';
        html += '</div>';
        html += '</div>';

        // Refresh button
        html += '<div style="margin-top:16px;text-align:center">';
        html += '<button onclick="VR.showLonLanding()" style="padding:14px 28px;border:none;border-radius:14px;font-size:17px;font-weight:600;background:#f0f0f0;color:#666;cursor:pointer">🔄 Hämta ny data</button>';
        html += '</div>';

        html += '</div>';

        VR.lonData.netTotal = netTotal;
        VR.hideLoader();
        VR.showView('', '', html);

        VR.setupTaxListeners();
        VR.setupMonthNavListeners();
    };

    // ===== SETUP MONTH NAV =====
    VR.setupMonthNavListeners = function() {
        var prevBtn = document.getElementById('vrLonPrev');
        var nextBtn = document.getElementById('vrLonNext');
        if (prevBtn) prevBtn.addEventListener('click', function() { if (VR.lonMonthOffset > -12) VR.navigateLonMonth(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function() { if (VR.lonMonthOffset < 0) VR.navigateLonMonth(1); });
    };

    // ===== SETUP TAX LISTENERS =====
    VR.setupTaxListeners = function() {
        var muniSelect = document.getElementById('vrMunicipality');
        var churchCheck = document.getElementById('vrChurchTax');

        if (muniSelect) {
            muniSelect.addEventListener('change', function() {
                VR.taxSettings.municipality = this.value;
                VR.updateTaxDisplay();
                // Save to localStorage
                if (VR.saveSettings) VR.saveSettings({ municipality: this.value });
            });
        }

        if (churchCheck) {
            churchCheck.addEventListener('change', function() {
                VR.taxSettings.churchTax = this.checked;
                VR.updateTaxDisplay();
                var toggle = this.parentElement;
                var bg = toggle.querySelector('span:first-of-type');
                var knob = toggle.querySelector('span:last-of-type');
                if (bg) bg.style.background = this.checked ? '#34C759' : '#ccc';
                if (knob) knob.style.left = this.checked ? '25px' : '3px';
                // Save to localStorage
                if (VR.saveSettings) VR.saveSettings({ churchTax: this.checked });
            });
        }
    };

    // ===== UPDATE TAX DISPLAY =====
    VR.updateTaxDisplay = function() {
        var netTotal = VR.lonData.netTotal || 0;
        var taxRate = VR.getTotalTaxRate();
        var taxAmount = netTotal * (taxRate / 100);
        var netAfterTax = netTotal - taxAmount;

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

    // ===== PRELOAD (for caching) =====
    VR.calculateLonForPreload = function(offset) {
        var payoutInfo = VR.getPayoutMonthInfo(offset);
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

        if (VR.obData && VR.obData.length > 0) {
            var obTotal = 0;
            for (var i = 0; i < VR.obData.length; i++) {
                var entry = VR.obData[i];
                var parts = (entry.date || '').split('-');
                if (parts.length === 3) {
                    var entryMonth = parseInt(parts[1], 10) - 1;
                    var entryYear = parseInt(parts[2], 10);
                    if (entryMonth === lonData.targetMonth && entryYear === lonData.targetYear) {
                        obTotal += entry.kronor || 0;
                    }
                }
            }
            lonData.ob.total = obTotal;
        }

        var grossTotal = lonData.baseSalary + lonData.ob.total + lonData.sr.total;
        lonData.netTotal = grossTotal - lonData.deductions.total;
    };

    console.log('VR: Lönberäkning loaded (V.1.47)');
})();
