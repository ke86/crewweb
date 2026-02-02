// VR CrewWeb - Anställddata functionality
(function() {
    'use strict';

    var VR = window.VR;

    // ===== CACHE SETTINGS =====
    VR.ANSTALLD_CACHE_KEY = 'vr_anstalld_cache';
    VR.ANSTALLD_CACHE_DAYS = 7; // Auto-update after 7 days

    // ===== CACHE FUNCTIONS =====
    VR.getAnstalldCache = function() {
        try {
            var cached = localStorage.getItem(VR.ANSTALLD_CACHE_KEY);
            if (!cached) return null;
            return JSON.parse(cached);
        } catch (e) {
            console.log('VR: Cache read error', e);
            return null;
        }
    };

    VR.saveAnstalldCache = function(kvalifikationer) {
        try {
            var cacheData = {
                kvalifikationer: kvalifikationer,
                savedAt: Date.now()
            };
            localStorage.setItem(VR.ANSTALLD_CACHE_KEY, JSON.stringify(cacheData));
            console.log('VR: Anställddata cached');
        } catch (e) {
            console.log('VR: Cache save error', e);
        }
    };

    VR.isCacheValid = function(cache) {
        if (!cache || !cache.savedAt) return false;
        var ageMs = Date.now() - cache.savedAt;
        var ageDays = ageMs / (1000 * 60 * 60 * 24);
        return ageDays < VR.ANSTALLD_CACHE_DAYS;
    };

    VR.formatCacheDate = function(timestamp) {
        var d = new Date(timestamp);
        return d.getDate() + ' ' + VR.MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    };

    // ===== ANSTÄLLDDATA FUNCTIONALITY =====
    VR.doAnstallddata = function(forceRefresh) {
        VR.stopTimer();
        VR.closeOverlay();

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            var cache = VR.getAnstalldCache();
            if (cache && VR.isCacheValid(cache) && cache.kvalifikationer && cache.kvalifikationer.length > 0) {
                console.log('VR: Using cached anställddata');
                var html = VR.buildAnstalldataView({}, cache.kvalifikationer, cache.savedAt);
                VR.showView('', '', html);
                return;
            }
        }

        VR.showLoader('Laddar Anställddata');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on Anställddata page
        var empData = document.getElementById('EmployeeData');
        if (empData) {
            VR.updateLoader(40, 'Sidan redan laddad...');
            VR.parseAndShowAnstallddata();
            return;
        }

        // ALWAYS open folder menu first, then find Anställddata
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Anställddata...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Anställddata');
                if (el) {
                    VR.stopTimer();
                    VR.updateLoader(20, 'Klickar på Anställddata...');
                    el.click();
                    VR.waitForAnstallddata();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    VR.waitForAnstallddata = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var empData = document.getElementById('EmployeeData');

            if (empData || n > 15) {
                VR.stopTimer();
                VR.updateLoader(70, 'Läser data...');
                setTimeout(VR.parseAndShowAnstallddata, 500);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    VR.parseAndShowAnstallddata = function() {
        VR.updateLoader(80, 'Analyserar data...');

        var kvalifikationer = [];
        var data = {};

        // Look for Kvalifikationer table (3 columns: Namn, Giltig från, Giltig till)
        var tables = document.querySelectorAll('table');
        for (var t = 0; t < tables.length; t++) {
            var table = tables[t];
            var headerRow = table.querySelector('tr');
            if (!headerRow) continue;

            var headers = headerRow.querySelectorAll('th, td');
            var hasNamn = false;
            var hasGiltigFran = false;
            var hasGiltigTill = false;

            for (var h = 0; h < headers.length; h++) {
                var headerText = headers[h].textContent.trim().toLowerCase();
                if (headerText === 'namn') hasNamn = true;
                if (headerText.indexOf('giltig från') > -1 || headerText === 'giltig från') hasGiltigFran = true;
                if (headerText.indexOf('giltig till') > -1 || headerText === 'giltig till') hasGiltigTill = true;
            }

            // If this looks like the Kvalifikationer table
            if (hasNamn && hasGiltigFran) {
                var rows = table.querySelectorAll('tr');
                for (var r = 1; r < rows.length; r++) { // Skip header row
                    var cells = rows[r].querySelectorAll('td');
                    if (cells.length >= 2) {
                        var namn = cells[0] ? cells[0].textContent.trim() : '';
                        var giltigFran = cells[1] ? cells[1].textContent.trim() : '';
                        var giltigTill = cells[2] ? cells[2].textContent.trim() : '';

                        // Skip empty rows or header-like rows
                        if (!namn || namn.toLowerCase() === 'namn') continue;
                        if (namn.toLowerCase() === 'lokförare') continue; // Skip category header

                        // Skip single letters that are category markers
                        if (namn.length === 1 && /^[A-Z]$/.test(namn)) continue;

                        kvalifikationer.push({
                            namn: namn,
                            giltigFran: giltigFran,
                            giltigTill: giltigTill
                        });
                    }
                }
            }
        }

        // Also look for employee info
        var inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var value = input.value ? input.value.trim() : '';
            if (!value) continue;

            var label = '';
            var parent = input.parentElement;

            if (parent) {
                var prev = input.previousElementSibling;
                if (prev && prev.textContent) {
                    label = prev.textContent.trim();
                }
                if (!label) {
                    var parentText = '';
                    for (var j = 0; j < parent.childNodes.length; j++) {
                        if (parent.childNodes[j].nodeType === 3) {
                            parentText += parent.childNodes[j].textContent;
                        }
                    }
                    label = parentText.trim();
                }
            }

            if (label && value) {
                data[label] = value;
            }
        }

        VR.updateLoader(95, 'Bygger vy...');

        // Save to cache
        if (kvalifikationer.length > 0) {
            VR.saveAnstalldCache(kvalifikationer);
        }

        var html = VR.buildAnstalldataView(data, kvalifikationer, Date.now());

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', html);
        }, 300);
    };

    VR.buildAnstalldataView = function(data, kvalifikationer, savedAt) {
        kvalifikationer = kvalifikationer || [];

        if (kvalifikationer.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen data hittades</div>\
                    <div style="font-size:22px;color:#888">Navigera till Anställddata-sidan i CrewWeb först</div>\
                </div>';
        }

        // Update bar with refresh button and "Senast uppdaterad" text
        var savedDateStr = savedAt ? VR.formatCacheDate(savedAt) : 'Okänt';
        var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 8px">';
        html += '<div style="font-size:22px;color:#8E8E93">Senast uppdaterad: ' + savedDateStr + '</div>';
        html += '<button id="vrRefreshAnstalld" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:12px;border:none;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);color:#fff;font-size:18px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15)">';
        html += '<span style="font-size:20px">🔄</span> Uppdatera</button>';
        html += '</div>';

        // Kvalifikationer table with 3 columns
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Header
        html += '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;padding:20px 24px;background:#1C1C1E">';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Namn</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff;text-align:center">Giltig från</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff;text-align:center">Giltig till</div>';
        html += '</div>';

        // Rows
        for (var i = 0; i < kvalifikationer.length; i++) {
            var kval = kvalifikationer[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';

            // Check if expiring soon (within 3 months)
            var isExpiringSoon = false;
            var isExpired = false;
            if (kval.giltigTill) {
                var tillParts = kval.giltigTill.match(/(\d{2})-(\d{2})-(\d{4})/);
                if (tillParts) {
                    var tillDate = new Date(parseInt(tillParts[3]), parseInt(tillParts[2]) - 1, parseInt(tillParts[1]));
                    var now = new Date();
                    var threeMonths = new Date();
                    threeMonths.setMonth(threeMonths.getMonth() + 3);

                    if (tillDate < now) {
                        isExpired = true;
                    } else if (tillDate < threeMonths) {
                        isExpiringSoon = true;
                    }
                }
            }

            var tillColor = '#333';
            if (isExpired) tillColor = '#FF3B30';
            else if (isExpiringSoon) tillColor = '#FF9500';

            html += '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;padding:18px 24px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:30px;color:#333;font-weight:500">' + kval.namn + '</div>';
            html += '<div style="font-size:30px;color:#666;text-align:center">' + (kval.giltigFran || '-') + '</div>';
            html += '<div style="font-size:30px;color:' + tillColor + ';text-align:center;font-weight:' + (isExpired || isExpiringSoon ? '600' : '400') + '">' + (kval.giltigTill || '-') + '</div>';
            html += '</div>';
        }

        html += '</div>';

        // Summary
        html += '<div style="margin-top:16px;padding:12px 20px;text-align:center;color:#8E8E93;font-size:28px">';
        html += kvalifikationer.length + ' kvalifikationer';
        html += '</div>';

        // Add script to bind refresh button after DOM is ready
        setTimeout(function() {
            var refreshBtn = document.getElementById('vrRefreshAnstalld');
            if (refreshBtn) {
                refreshBtn.onclick = function() {
                    VR.doAnstallddata(true); // Force refresh
                };
            }
        }, 100);

        return html;
    };

    console.log('VR: Anstalld loaded');
})();
