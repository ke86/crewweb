// VR CrewWeb - UI Components
(function() {
    'use strict';

    var VR = window.VR;

    // Add menu ID
    VR.ID.menu = 'vrMenu';
    VR.ID.menuOverlay = 'vrMenuOverlay';

    // ===== MOBILE DETECTION =====
    VR.isMobile = function() {
        return window.innerWidth < 768;
    };

    VR.getHeaderHeight = function() {
        return VR.isMobile() ? '180px' : '140px';
    };

    // ===== LOADER =====
    VR.showLoader = function(title) {
        VR.hideLoader();
        VR.pct = 0;

        var ld = document.createElement('div');
        ld.id = VR.ID.loader;
        ld.innerHTML = '\
<style>\
@keyframes vrPulse{0%,100%{opacity:1}50%{opacity:0.5}}\
#vrLoader{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.97);z-index:9999998;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif}\
#vrLoader .ring-wrap{position:relative;width:210px;height:210px}\
#vrLoader svg{transform:rotate(-90deg)}\
#vrLoader .ring-bg{fill:none;stroke:rgba(255,255,255,0.1);stroke-width:15}\
#vrLoader .ring-fill{fill:none;stroke:url(#vrGrad);stroke-width:15;stroke-linecap:round;stroke-dasharray:565;stroke-dashoffset:565;transition:stroke-dashoffset 0.3s ease}\
#vrLoader .pct{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:700;color:#fff}\
#vrLoader .title{color:#fff;font-size:30px;font-weight:600;margin-top:36px}\
#vrLoader .status{color:rgba(255,255,255,0.6);font-size:21px;margin-top:12px;animation:vrPulse 1.5s infinite}\
</style>\
<div class="ring-wrap">\
<svg width="210" height="210">\
<defs><linearGradient id="vrGrad" x1="0%" y1="0%" x2="100%" y2="0%">\
<stop offset="0%" stop-color="#e94560"/>\
<stop offset="100%" stop-color="#f39c12"/>\
</linearGradient></defs>\
<circle class="ring-bg" cx="105" cy="105" r="90"/>\
<circle class="ring-fill" cx="105" cy="105" r="90"/>\
</svg>\
<div class="pct">0%</div>\
</div>\
<div class="title">' + title + '</div>\
<div class="status">Förbereder...</div>';

        document.body.appendChild(ld);
    };

    VR.updateLoader = function(percent, statusText) {
        var ld = document.getElementById(VR.ID.loader);
        if (!ld) return;

        VR.pct = Math.min(100, Math.max(0, percent));

        var ring = ld.querySelector('.ring-fill');
        var pctEl = ld.querySelector('.pct');
        var statEl = ld.querySelector('.status');

        if (ring) {
            ring.style.strokeDashoffset = 565 - (565 * VR.pct / 100);
        }
        if (pctEl) {
            pctEl.textContent = Math.round(VR.pct) + '%';
        }
        if (statEl && statusText) {
            statEl.textContent = statusText;
        }
    };

    VR.hideLoader = function() {
        var ld = document.getElementById(VR.ID.loader);
        if (ld) {
            ld.style.opacity = '0';
            ld.style.transition = 'opacity 0.4s ease';
            setTimeout(function() {
                if (ld.parentNode) ld.remove();
            }, 400);
        }
    };

    // ===== MAIN VIEW =====
    VR.showView = function(title, subtitle, content) {
        var old = document.getElementById(VR.ID.view);
        if (old) old.remove();

        var v = document.createElement('div');
        v.id = VR.ID.view;
        v.innerHTML = '\
<style>\
#vrView{position:fixed;top:' + VR.getHeaderHeight() + ';left:0;right:0;bottom:0;background:#F2F2F7;z-index:999997;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;-webkit-overflow-scrolling:touch}\
</style>\
<div style="padding:45px 36px 180px">\
<div style="margin-bottom:36px">\
<div style="font-size:50px;font-weight:700;color:#000">' + title + '</div>\
<div style="font-size:32px;color:#666">' + subtitle + '</div>\
</div>' + content + '</div>';

        document.body.appendChild(v);
    };

    // ===== HAMBURGER MENU =====
    VR.createMenu = function() {
        // Menu overlay (dark background)
        var overlay = document.createElement('div');
        overlay.id = VR.ID.menuOverlay;
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999990;opacity:0;visibility:hidden;transition:opacity 0.3s ease,visibility 0.3s ease';
        overlay.onclick = function() { VR.closeMenu(); };
        document.body.appendChild(overlay);

        // Menu panel
        var menu = document.createElement('div');
        menu.id = VR.ID.menu;
        menu.style.cssText = 'position:fixed;top:0;left:-320px;width:300px;height:100%;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);z-index:99999991;transition:left 0.3s ease;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;flex-direction:column;box-shadow:5px 0 30px rgba(0,0,0,0.5)';

        var menuItems = [
            { icon: '📅', label: 'Schema', action: 'doSchema', color: '#007AFF' },
            { icon: '⏰', label: 'Komp', action: 'doKomp', color: '#34C759' },
            { icon: '🌙', label: 'OB', action: 'doOB', color: '#AF52DE' },
            { icon: '🏠', label: 'Frånvaro', action: 'doFranvaro', color: '#FF6B6B' },
            { icon: '📝', label: 'Önskemål', action: 'doOnskemål', color: '#FF9500' },
            { icon: '🏖️', label: 'FP/FPV', action: 'doFPFPV', color: '#FF2D55' },
            { icon: '👤', label: 'Anställddata', action: 'doAnstallddata', color: '#5AC8FA' }
        ];

        var menuHTML = '<div style="padding:30px 24px;border-bottom:1px solid rgba(255,255,255,0.1)">\
            <div style="font-size:28px;font-weight:700;color:#fff">CrewWeb</div>\
            <div style="font-size:16px;color:rgba(255,255,255,0.5);margin-top:4px">Schema & Verktyg</div>\
        </div>';

        menuHTML += '<div style="flex:1;padding:18px 0;overflow-y:auto">';

        for (var i = 0; i < menuItems.length; i++) {
            var item = menuItems[i];
            menuHTML += '<div class="vrMenuItem" data-action="' + item.action + '" style="display:flex;align-items:center;gap:18px;padding:20px 24px;cursor:pointer;transition:background 0.2s ease">\
                <div style="width:50px;height:50px;border-radius:14px;background:' + item.color + ';display:flex;align-items:center;justify-content:center;font-size:26px">' + item.icon + '</div>\
                <div style="font-size:22px;font-weight:600;color:#fff">' + item.label + '</div>\
            </div>';
        }

        menuHTML += '</div>';

        // Close button at bottom
        menuHTML += '<div style="padding:20px 24px;border-top:1px solid rgba(255,255,255,0.1)">\
            <div class="vrMenuItem" data-action="cleanup" style="display:flex;align-items:center;gap:18px;padding:16px 20px;cursor:pointer;background:rgba(255,59,48,0.2);border-radius:16px">\
                <div style="width:50px;height:50px;border-radius:14px;background:#FF3B30;display:flex;align-items:center;justify-content:center;font-size:26px">✕</div>\
                <div style="font-size:22px;font-weight:600;color:#FF3B30">Stäng app</div>\
            </div>\
        </div>';

        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Add hover effects and click handlers
        var items = menu.querySelectorAll('.vrMenuItem');
        for (var j = 0; j < items.length; j++) {
            items[j].onmouseenter = function() {
                this.style.background = 'rgba(255,255,255,0.1)';
            };
            items[j].onmouseleave = function() {
                if (this.getAttribute('data-action') !== 'cleanup') {
                    this.style.background = 'transparent';
                } else {
                    this.style.background = 'rgba(255,59,48,0.2)';
                }
            };
            items[j].onclick = function() {
                var action = this.getAttribute('data-action');
                VR.closeMenu();
                if (VR[action]) {
                    VR.closeDayDetail();
                    VR[action]();
                }
            };
        }
    };

    VR.openMenu = function() {
        var menu = document.getElementById(VR.ID.menu);
        var overlay = document.getElementById(VR.ID.menuOverlay);
        if (menu) menu.style.left = '0';
        if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
        }
    };

    VR.closeMenu = function() {
        var menu = document.getElementById(VR.ID.menu);
        var overlay = document.getElementById(VR.ID.menuOverlay);
        if (menu) menu.style.left = '-320px';
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }
    };

    // ===== OB FUNCTIONALITY =====
    VR.doOB = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar OB-tillägg');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on Löneredovisningar page
        var hamtaBtn = VR.findHamtaButton();
        if (hamtaBtn) {
            VR.updateLoader(30, 'Sidan redan laddad...');
            VR.setupOBAndFetch();
            return;
        }

        // Try to find menu item directly
        var el = VR.findMenuItem('Löneredovisningar');
        if (el) {
            VR.updateLoader(15, 'Klickar på Löneredovisningar...');
            el.click();
            VR.waitForOBPage();
            return;
        }

        // Open folder menu first
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Löneredovisningar...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el2 = VR.findMenuItem('Löneredovisningar');
                if (el2) {
                    VR.stopTimer();
                    el2.click();
                    VR.updateLoader(25, 'Navigerar...');
                    VR.waitForOBPage();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout - hittade ej Löneredovisningar');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    // Find Hämta button
    VR.findHamtaButton = function() {
        var inputs = document.querySelectorAll('input[type="submit"], input[type="button"], button');
        for (var i = 0; i < inputs.length; i++) {
            var val = (inputs[i].value || inputs[i].textContent || '').toLowerCase();
            if (val.indexOf('hämta') > -1) {
                return inputs[i];
            }
        }
        return null;
    };

    // Wait for OB page to load
    VR.waitForOBPage = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var hamtaBtn = VR.findHamtaButton();
            if (hamtaBtn) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(VR.setupOBAndFetch, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // Setup OB page - select Lönedagar, set dates, click Hämta
    VR.setupOBAndFetch = function() {
        VR.updateLoader(50, 'Väljer Lönedagar...');

        // Find and click Lönedagar radio button
        var radios = document.querySelectorAll('input[type="radio"]');
        var lonedagarRadio = null;
        for (var i = 0; i < radios.length; i++) {
            var label = radios[i].parentElement ? radios[i].parentElement.textContent : '';
            var name = radios[i].name || '';
            var id = radios[i].id || '';
            if (label.toLowerCase().indexOf('lönedagar') > -1 ||
                name.toLowerCase().indexOf('lönedagar') > -1 ||
                id.toLowerCase().indexOf('lönedagar') > -1) {
                lonedagarRadio = radios[i];
                break;
            }
        }

        // Also check for labels
        if (!lonedagarRadio) {
            var labels = document.querySelectorAll('label');
            for (var j = 0; j < labels.length; j++) {
                if (labels[j].textContent.toLowerCase().indexOf('lönedagar') > -1) {
                    var forId = labels[j].getAttribute('for');
                    if (forId) {
                        lonedagarRadio = document.getElementById(forId);
                    } else {
                        lonedagarRadio = labels[j].querySelector('input[type="radio"]');
                    }
                    if (lonedagarRadio) break;
                }
            }
        }

        if (lonedagarRadio && !lonedagarRadio.checked) {
            lonedagarRadio.click();
        }

        setTimeout(function() {
            VR.updateLoader(55, 'Ställer in datum...');
            VR.setOBDates();
        }, 300);
    };

    // Set date range for OB
    VR.setOBDates = function() {
        // Find date dropdowns - look for select elements with date values
        var selects = document.querySelectorAll('select');
        var dateSelects = [];

        for (var i = 0; i < selects.length; i++) {
            var options = selects[i].querySelectorAll('option');
            for (var j = 0; j < options.length; j++) {
                var val = options[j].value || options[j].textContent;
                // Check if it looks like a date (DD-MM-YYYY or similar)
                if (val && val.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)) {
                    dateSelects.push(selects[i]);
                    break;
                }
            }
        }

        // Set first dropdown to earliest date (14-12-2025)
        if (dateSelects.length >= 1) {
            VR.setDateDropdown(dateSelects[0], '14-12-2025', true);
        }

        // Set second dropdown to latest date (31-12-2026)
        if (dateSelects.length >= 2) {
            VR.setDateDropdown(dateSelects[1], '31-12-2026', false);
        }

        setTimeout(function() {
            VR.updateLoader(65, 'Klickar Hämta...');
            VR.clickOBHamta();
        }, 400);
    };

    // Set a date dropdown to a specific date or earliest/latest available
    VR.setDateDropdown = function(select, targetDate, selectEarliest) {
        var options = select.querySelectorAll('option');
        var bestOption = null;
        var bestDate = null;

        for (var i = 0; i < options.length; i++) {
            var val = options[i].value || options[i].textContent;
            var match = val.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
            if (match) {
                var day = parseInt(match[1], 10);
                var month = parseInt(match[2], 10);
                var year = parseInt(match[3], 10);
                var dateObj = new Date(year, month - 1, day);

                // Check if this matches target date
                if (val.indexOf(targetDate) > -1) {
                    bestOption = options[i];
                    break;
                }

                // Otherwise find earliest or latest
                if (!bestDate) {
                    bestDate = dateObj;
                    bestOption = options[i];
                } else if (selectEarliest && dateObj < bestDate) {
                    bestDate = dateObj;
                    bestOption = options[i];
                } else if (!selectEarliest && dateObj > bestDate) {
                    bestDate = dateObj;
                    bestOption = options[i];
                }
            }
        }

        if (bestOption) {
            select.value = bestOption.value;
            // Trigger change event
            var evt = document.createEvent('HTMLEvents');
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
        }
    };

    // Click Hämta button and wait for data
    VR.clickOBHamta = function() {
        var hamtaBtn = VR.findHamtaButton();
        if (hamtaBtn) {
            hamtaBtn.click();
            VR.updateLoader(70, 'Hämtar data...');
            VR.waitForOBData();
        } else {
            VR.updateLoader(0, 'Hämta-knapp ej hittad');
            setTimeout(VR.hideLoader, 2000);
        }
    };

    // Wait for OB data to load after clicking Hämta
    VR.waitForOBData = function() {
        var n = 0;
        var initialContent = document.body.innerHTML.length;

        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(70 + Math.min(n, 20), 'Väntar på data...');

            // Check if page content has changed (data loaded)
            var currentContent = document.body.innerHTML.length;
            var tables = document.querySelectorAll('table');

            // Look for date headers like "14-12-2025 - Söndag"
            var dateHeaders = document.body.innerHTML.match(/\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/gi);

            if ((tables.length > 2 && dateHeaders && dateHeaders.length > 0) || n > 40) {
                VR.stopTimer();
                VR.updateLoader(92, 'Läser OB-data...');
                setTimeout(VR.parseAndShowOB, 500);
            } else if (n > 60) {
                VR.stopTimer();
                VR.updateLoader(0, 'Timeout - ingen data');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    VR.parseAndShowOB = function() {
        VR.updateLoader(95, 'Analyserar OB-data...');

        var obData = [];

        // OB rates
        var OB_RATES = {
            'L.Hb': { name: 'Kvalificerad OB', rate: 54.69 },
            'L.Storhelgstillägg': { name: 'Storhelgs OB', rate: 122.88 }
        };

        // We need to find date headers and their associated tables
        // The structure is: date header text, then a table below it
        // Walk through the DOM to find this pattern

        var bodyHTML = document.body.innerHTML;
        var currentDate = null;

        // Find all elements that might contain date headers or tables
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            // Check if this element contains a date header pattern
            // Format: "14-12-2025 - Söndag" or "14-12-2025 - Söndag - 17209"
            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD') {
                // Check if it's a direct match (not a parent containing many things)
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) { // Text node
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i)) {
                    currentDate = dateMatch[1];
                }
            }

            // Check if this is a table
            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';
                    var col2 = cells[1] ? cells[1].textContent.trim() : '';

                    // Skip headers
                    if (col1.toLowerCase() === 'löneslag') continue;

                    // Only include L.Hb and L.Storhelgstillägg
                    if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                        // Parse time value (e.g., "7:45")
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
                }
            }
        }

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildOBView(obData);

        var totalKr = 0;
        for (var k = 0; k < obData.length; k++) {
            totalKr += obData[k].kronor;
        }

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('OB-tillägg', obData.length + ' poster | ' + totalKr.toFixed(2) + ' kr', viewHtml);
        }, 300);
    };

    VR.buildOBView = function(obData) {
        if (obData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen OB-data hittades</div>\
                    <div style="font-size:22px;color:#888">Endast L.Hb och L.Storhelgstillägg visas</div>\
                </div>';
        }

        // Calculate totals per type
        var totals = {
            'L.Hb': { hours: 0, kronor: 0, count: 0, rate: 54.69, name: 'Kvalificerad OB' },
            'L.Storhelgstillägg': { hours: 0, kronor: 0, count: 0, rate: 122.88, name: 'Storhelgs OB' }
        };

        var grandTotalKr = 0;
        var grandTotalHours = 0;

        for (var i = 0; i < obData.length; i++) {
            var item = obData[i];
            if (totals[item.type]) {
                totals[item.type].hours += item.hours;
                totals[item.type].kronor += item.kronor;
                totals[item.type].count++;
            }
            grandTotalKr += item.kronor;
            grandTotalHours += item.hours;
        }

        // Header card with total
        var html = '<div style="background:linear-gradient(135deg,#AF52DE,#5856D6);border-radius:30px;padding:40px;margin-bottom:24px;text-align:center;box-shadow:0 10px 40px rgba(175,82,222,0.3)">';
        html += '<div style="font-size:50px;margin-bottom:12px">🌙</div>';
        html += '<div style="font-size:24px;font-weight:600;color:rgba(255,255,255,0.9)">OB-tillägg</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#fff;margin:12px 0">' + grandTotalKr.toFixed(2) + ' kr</div>';
        html += '<div style="font-size:16px;color:rgba(255,255,255,0.8)">' + grandTotalHours.toFixed(1) + ' timmar totalt</div>';
        html += '</div>';

        // Summary cards for each OB type
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px">';

        // L.Hb card
        if (totals['L.Hb'].count > 0) {
            html += '<div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
            html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">';
            html += '<span style="font-size:28px">🚂</span>';
            html += '<span style="font-size:16px;font-weight:600;color:#333">Kvalificerad OB</span>';
            html += '</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-bottom:12px">L.Hb · 54,69 kr/h</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#AF52DE">' + totals['L.Hb'].kronor.toFixed(2) + ' kr</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-top:4px">' + totals['L.Hb'].hours.toFixed(1) + ' h · ' + totals['L.Hb'].count + ' dagar</div>';
            html += '</div>';
        }

        // L.Storhelgstillägg card
        if (totals['L.Storhelgstillägg'].count > 0) {
            html += '<div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
            html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">';
            html += '<span style="font-size:28px">🎄</span>';
            html += '<span style="font-size:16px;font-weight:600;color:#333">Storhelgs OB</span>';
            html += '</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-bottom:12px">L.Storhelgstillägg · 122,88 kr/h</div>';
            html += '<div style="font-size:32px;font-weight:700;color:#FF9500">' + totals['L.Storhelgstillägg'].kronor.toFixed(2) + ' kr</div>';
            html += '<div style="font-size:14px;color:#8E8E93;margin-top:4px">' + totals['L.Storhelgstillägg'].hours.toFixed(1) + ' h · ' + totals['L.Storhelgstillägg'].count + ' dagar</div>';
            html += '</div>';
        }

        html += '</div>';

        // Data table
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Table header
        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">OB-typ</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Antal</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        // Table rows
        for (var d = 0; d < obData.length; d++) {
            var row = obData[d];
            var bgCol = d % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:15px;color:#333">' + row.typeName + '</div>';
            html += '<div style="font-size:15px;color:#333;text-align:right">' + row.time + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#AF52DE;text-align:right">' + row.kronor.toFixed(2) + '</div>';
            html += '</div>';
        }

        // Total row
        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:16px 20px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:16px;font-weight:700;color:#333">Totalt</div>';
        html += '<div></div>';
        html += '<div style="font-size:16px;font-weight:600;color:#333;text-align:right">' + grandTotalHours.toFixed(1) + ' h</div>';
        html += '<div style="font-size:16px;font-weight:700;color:#AF52DE;text-align:right">' + grandTotalKr.toFixed(2) + ' kr</div>';
        html += '</div>';

        html += '</div>';

        return html;
    };

    VR.doOnskemål = function() {
        VR.closeOverlay();
        VR.showView('Önskemål', 'Kommer snart...', '\
            <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                <div style="font-size:80px;margin-bottom:24px">📝</div>\
                <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Önskemål</div>\
                <div style="font-size:22px;color:#888">Denna funktion är under utveckling</div>\
            </div>');
    };

    // ===== FRÅNVARO FUNCTIONALITY =====
    VR.doFranvaro = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Frånvaro');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on Löneredovisningar page
        var hamtaBtn = VR.findHamtaButton();
        if (hamtaBtn) {
            VR.updateLoader(30, 'Sidan redan laddad...');
            VR.setupFranvaroAndFetch();
            return;
        }

        // Try to find menu item directly
        var el = VR.findMenuItem('Löneredovisningar');
        if (el) {
            VR.updateLoader(15, 'Klickar på Löneredovisningar...');
            el.click();
            VR.waitForFranvaroPage();
            return;
        }

        // Open folder menu first
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Löneredovisningar...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el2 = VR.findMenuItem('Löneredovisningar');
                if (el2) {
                    VR.stopTimer();
                    el2.click();
                    VR.updateLoader(25, 'Navigerar...');
                    VR.waitForFranvaroPage();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout - hittade ej Löneredovisningar');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    VR.waitForFranvaroPage = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var hamtaBtn = VR.findHamtaButton();
            if (hamtaBtn) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(VR.setupFranvaroAndFetch, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    VR.setupFranvaroAndFetch = function() {
        VR.updateLoader(50, 'Väljer Lönedagar...');

        // Find and click Lönedagar radio button
        var radios = document.querySelectorAll('input[type="radio"]');
        var lonedagarRadio = null;
        for (var i = 0; i < radios.length; i++) {
            var label = radios[i].parentElement ? radios[i].parentElement.textContent : '';
            var name = radios[i].name || '';
            var id = radios[i].id || '';
            if (label.toLowerCase().indexOf('lönedagar') > -1 ||
                name.toLowerCase().indexOf('lönedagar') > -1 ||
                id.toLowerCase().indexOf('lönedagar') > -1) {
                lonedagarRadio = radios[i];
                break;
            }
        }

        if (!lonedagarRadio) {
            var labels = document.querySelectorAll('label');
            for (var j = 0; j < labels.length; j++) {
                if (labels[j].textContent.toLowerCase().indexOf('lönedagar') > -1) {
                    var forId = labels[j].getAttribute('for');
                    if (forId) {
                        lonedagarRadio = document.getElementById(forId);
                    } else {
                        lonedagarRadio = labels[j].querySelector('input[type="radio"]');
                    }
                    if (lonedagarRadio) break;
                }
            }
        }

        if (lonedagarRadio && !lonedagarRadio.checked) {
            lonedagarRadio.click();
        }

        setTimeout(function() {
            VR.updateLoader(55, 'Ställer in datum...');
            VR.setFranvaroDates();
        }, 300);
    };

    VR.setFranvaroDates = function() {
        var selects = document.querySelectorAll('select');
        var dateSelects = [];

        for (var i = 0; i < selects.length; i++) {
            var options = selects[i].querySelectorAll('option');
            for (var j = 0; j < options.length; j++) {
                var val = options[j].value || options[j].textContent;
                if (val && val.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)) {
                    dateSelects.push(selects[i]);
                    break;
                }
            }
        }

        if (dateSelects.length >= 1) {
            VR.setDateDropdown(dateSelects[0], '14-12-2025', true);
        }
        if (dateSelects.length >= 2) {
            VR.setDateDropdown(dateSelects[1], '31-12-2026', false);
        }

        setTimeout(function() {
            VR.updateLoader(65, 'Klickar Hämta...');
            VR.clickFranvaroHamta();
        }, 400);
    };

    VR.clickFranvaroHamta = function() {
        var hamtaBtn = VR.findHamtaButton();
        if (hamtaBtn) {
            hamtaBtn.click();
            VR.updateLoader(70, 'Hämtar data...');
            VR.waitForFranvaroData();
        } else {
            VR.updateLoader(0, 'Hämta-knapp ej hittad');
            setTimeout(VR.hideLoader, 2000);
        }
    };

    VR.waitForFranvaroData = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(70 + Math.min(n, 20), 'Väntar på data...');

            var tables = document.querySelectorAll('table');
            var dateHeaders = document.body.innerHTML.match(/\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/gi);

            if ((tables.length > 2 && dateHeaders && dateHeaders.length > 0) || n > 40) {
                VR.stopTimer();
                VR.updateLoader(92, 'Läser frånvaro-data...');
                setTimeout(VR.parseAndShowFranvaro, 500);
            } else if (n > 60) {
                VR.stopTimer();
                VR.updateLoader(0, 'Timeout - ingen data');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    VR.parseAndShowFranvaro = function() {
        VR.updateLoader(95, 'Analyserar frånvaro-data...');

        var franvaroData = [];

        // Frånvaro type mappings
        var FRANVARO_TYPES = {
            'L.Föräldraledig >5 dagar': { name: 'Föräldrarledig, lång', icon: '👶' },
            'L.Föräldraledig>5 dagar': { name: 'Föräldrarledig, lång', icon: '👶' },
            'L.Föräldraledig <5 dagar': { name: 'Föräldrarledig, kort', icon: '👶' },
            'L.Föräldraledig<5 dagar': { name: 'Föräldrarledig, kort', icon: '👶' },
            'S.Frånvaro: FRIDAG': { name: 'FP', icon: '🏖️' },
            'S.Frånvaro: FV/FP2/FP-V': { name: 'FPV', icon: '🌴' },
            'L.Vård av barn': { name: 'VAB', icon: '🏥' }
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

                    // Check if this matches any frånvaro type
                    var matchedType = null;
                    var matchedInfo = null;

                    for (var typeKey in FRANVARO_TYPES) {
                        if (col1.indexOf(typeKey) > -1 || col1 === typeKey) {
                            matchedType = typeKey;
                            matchedInfo = FRANVARO_TYPES[typeKey];
                            break;
                        }
                    }

                    // Also check with partial matches
                    if (!matchedType) {
                        if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('>5') > -1) {
                            matchedInfo = { name: 'Föräldrarledig, lång', icon: '👶' };
                            matchedType = col1;
                        } else if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('<5') > -1) {
                            matchedInfo = { name: 'Föräldrarledig, kort', icon: '👶' };
                            matchedType = col1;
                        } else if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            matchedInfo = { name: 'FP', icon: '🏖️' };
                            matchedType = col1;
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            matchedInfo = { name: 'FPV', icon: '🌴' };
                            matchedType = col1;
                        } else if (col1.indexOf('Vård av barn') > -1) {
                            matchedInfo = { name: 'VAB', icon: '🏥' };
                            matchedType = col1;
                        }
                    }

                    if (matchedInfo) {
                        franvaroData.push({
                            date: currentDate,
                            originalType: col1,
                            typeName: matchedInfo.name,
                            icon: matchedInfo.icon,
                            time: col2
                        });
                    }
                }
            }
        }

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildFranvaroView(franvaroData);

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('Frånvaro', franvaroData.length + ' poster', viewHtml);
        }, 300);
    };

    VR.buildFranvaroView = function(franvaroData) {
        if (franvaroData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen frånvaro hittades</div>\
                    <div style="font-size:22px;color:#888">Söker: FP, FPV, VAB, Föräldraledig</div>\
                </div>';
        }

        // Calculate totals per type
        var totals = {};
        for (var i = 0; i < franvaroData.length; i++) {
            var item = franvaroData[i];
            if (!totals[item.typeName]) {
                totals[item.typeName] = { count: 0, icon: item.icon, totalMinutes: 0 };
            }
            totals[item.typeName].count++;

            var timeMatch = item.time.match(/(\d+):(\d+)/);
            if (timeMatch) {
                var hours = parseInt(timeMatch[1], 10);
                var mins = parseInt(timeMatch[2], 10);
                totals[item.typeName].totalMinutes += hours * 60 + mins;
            }
        }

        // Header card
        var html = '<div style="background:linear-gradient(135deg,#FF6B6B,#EE5A5A);border-radius:30px;padding:40px;margin-bottom:24px;text-align:center;box-shadow:0 10px 40px rgba(255,107,107,0.3)">';
        html += '<div style="font-size:50px;margin-bottom:12px">🏠</div>';
        html += '<div style="font-size:24px;font-weight:600;color:rgba(255,255,255,0.9)">Frånvaro</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#fff;margin:12px 0">' + franvaroData.length + ' dagar</div>';
        html += '</div>';

        // Summary cards
        var typeKeys = Object.keys(totals);
        if (typeKeys.length > 0) {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">';

            for (var t = 0; t < typeKeys.length; t++) {
                var typeKey = typeKeys[t];
                var typeData = totals[typeKey];
                var totalHrs = Math.floor(typeData.totalMinutes / 60);
                var totalMins = typeData.totalMinutes % 60;
                var timeStr = totalHrs + ':' + (totalMins < 10 ? '0' : '') + totalMins;

                html += '<div style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 5px 20px rgba(0,0,0,0.08);text-align:center">';
                html += '<div style="font-size:36px;margin-bottom:8px">' + typeData.icon + '</div>';
                html += '<div style="font-size:16px;font-weight:600;color:#333">' + typeKey + '</div>';
                html += '<div style="font-size:28px;font-weight:700;color:#FF6B6B;margin-top:8px">' + typeData.count + '</div>';
                html += '<div style="font-size:13px;color:#8E8E93">(' + timeStr + ')</div>';
                html += '</div>';
            }

            html += '</div>';
        }

        // Data table
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Table header
        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Frånvaro-typ</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Antal</div>';
        html += '</div>';

        // Table rows
        for (var d = 0; d < franvaroData.length; d++) {
            var row = franvaroData[d];
            var bgCol = d % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:15px;color:#333;display:flex;align-items:center;gap:8px"><span>' + row.icon + '</span> ' + row.typeName + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#FF6B6B;text-align:right">' + row.time + '</div>';
            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    VR.doFPFPV = function() {
        VR.closeOverlay();
        VR.showView('FP/FPV', 'Kommer snart...', '\
            <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                <div style="font-size:80px;margin-bottom:24px">🏖️</div>\
                <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">FP/FPV</div>\
                <div style="font-size:22px;color:#888">Denna funktion är under utveckling</div>\
            </div>');
    };

    VR.doAnstallddata = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Anställddata');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on Anställddata page
        var empData = document.getElementById('EmployeeData');
        if (empData) {
            VR.updateLoader(40, 'Sidan redan laddad...');
            VR.parseAndShowAnstallddata();
            return;
        }

        // Try to find menu item
        var el = VR.findMenuItem('Anställddata');
        if (el) {
            VR.updateLoader(15, 'Klickar på Anställddata...');
            el.click();
            VR.waitForAnstallddata();
            return;
        }

        // Open folder menu first
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Anställddata...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el2 = VR.findMenuItem('Anställddata');
                if (el2) {
                    VR.stopTimer();
                    el2.click();
                    VR.updateLoader(25, 'Navigerar...');
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

            // Look for the employee data container or any data that appears
            var empData = document.getElementById('EmployeeData');
            var anyTable = document.querySelector('table');

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

        // Try to find all visible text fields and labels
        var data = {};

        // Method 1: Look for labeled input fields
        var inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var value = input.value ? input.value.trim() : '';
            if (!value) continue;

            // Try to find associated label
            var label = '';
            var parent = input.parentElement;

            // Check for preceding text node or label
            if (parent) {
                var prev = input.previousElementSibling;
                if (prev && prev.textContent) {
                    label = prev.textContent.trim();
                }
                // Also check parent's text
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

        // Method 2: Look for table rows with label-value pairs
        var rows = document.querySelectorAll('tr');
        for (var r = 0; r < rows.length; r++) {
            var cells = rows[r].querySelectorAll('td, th');
            if (cells.length >= 2) {
                var lbl = cells[0].textContent.trim();
                var val = cells[1].textContent.trim();
                if (lbl && val && lbl.length < 50 && val.length < 100) {
                    data[lbl] = val;
                }
            }
        }

        // Method 3: Look for spans/divs with specific patterns
        var allElements = document.querySelectorAll('span, div, label');
        for (var k = 0; k < allElements.length; k++) {
            var el = allElements[k];
            var text = el.textContent.trim();

            // Look for patterns like "Label: Value" or "Label Value"
            var colonMatch = text.match(/^([^:]+):\s*(.+)$/);
            if (colonMatch && colonMatch[1].length < 30 && colonMatch[2].length < 100) {
                data[colonMatch[1].trim()] = colonMatch[2].trim();
            }
        }

        // Filter out garbage data
        var filteredData = {};
        var keys = Object.keys(data);
        for (var f = 0; f < keys.length; f++) {
            var key = keys[f];
            var value = data[key];

            // Skip entries where key is just a number
            if (/^\d+$/.test(key)) continue;

            // Skip entries where value is just "20" or similar short meaningless numbers
            if (/^\d{1,2}$/.test(value)) continue;

            // Skip entries with date+number pattern like "2026-01-2620"
            if (/^\d{4}-\d{2}-\d{2}\d+$/.test(value)) continue;

            // Skip entries with malformed dates
            if (/^\d{4}-\d{2}-\d{2}[^\s]/.test(value) && !/^\d{4}-\d{2}-\d{2}\s/.test(value)) continue;

            // Skip very short keys (likely garbage)
            if (key.length < 2) continue;

            filteredData[key] = value;
        }

        VR.updateLoader(95, 'Bygger vy...');

        // Build the view
        var html = VR.buildAnstalldataView(filteredData);

        setTimeout(function() {
            VR.hideLoader();
            var count = Object.keys(filteredData).length;
            VR.showView('Anställddata', count + ' fält hittade', html);
        }, 300);
    };

    VR.buildAnstalldataView = function(data) {
        var keys = Object.keys(data);

        if (keys.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen data hittades</div>\
                    <div style="font-size:22px;color:#888">Navigera till Anställddata-sidan i CrewWeb först</div>\
                </div>';
        }

        // Profile card
        var html = '<div style="background:linear-gradient(135deg,#5AC8FA,#007AFF);border-radius:30px;padding:40px;margin-bottom:30px;text-align:center;box-shadow:0 10px 40px rgba(0,122,255,0.3)">';
        html += '<div style="width:120px;height:120px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:60px">👤</div>';

        // Try to find name
        var name = data['Namn'] || data['Name'] || data['Förnamn'] || '';
        if (name) {
            html += '<div style="font-size:36px;font-weight:700;color:#fff">' + name + '</div>';
        }

        // Try to find employee number
        var empNr = data['Anställningsnummer'] || data['Anst.nr'] || data['Anst nr'] || data['Personal nr'] || data['Personnr'] || '';
        if (empNr) {
            html += '<div style="font-size:22px;color:rgba(255,255,255,0.8);margin-top:8px">#' + empNr + '</div>';
        }

        html += '</div>';

        // Data cards
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = data[key];

            // Skip if already shown in header
            if (key === 'Namn' || key === 'Name' || key === 'Förnamn' ||
                key === 'Anställningsnummer' || key === 'Anst.nr' || key === 'Anst nr' ||
                key === 'Personal nr' || key === 'Personnr') continue;

            var borderStyle = i < keys.length - 1 ? 'border-bottom:1px solid #E5E5EA;' : '';

            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;' + borderStyle + '">';
            html += '<div style="font-size:20px;color:#8E8E93">' + key + '</div>';
            html += '<div style="font-size:22px;font-weight:600;color:#000;text-align:right;max-width:60%;word-break:break-word">' + value + '</div>';
            html += '</div>';
        }

        html += '</div>';

        // Debug: Show raw data
        html += '<details style="margin-top:30px;background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
        html += '<summary style="padding:20px 24px;font-size:20px;color:#8E8E93;cursor:pointer">Visa rådata (debug)</summary>';
        html += '<pre style="padding:20px 24px;font-size:14px;color:#666;overflow-x:auto;background:#F8F8F8">' + JSON.stringify(data, null, 2) + '</pre>';
        html += '</details>';

        return html;
    };

    // ===== HEADER =====
    VR.createHeader = function() {
        var h = document.createElement('div');
        h.id = VR.ID.header;
        var headerH = VR.getHeaderHeight();

        h.style.cssText = 'position:fixed;top:0;left:0;right:0;height:' + headerH +
            ';background:rgba(0,0,0,0.95);backdrop-filter:blur(20px);z-index:9999999;padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif';

        h.innerHTML = '\
<div style="display:flex;gap:14px;align-items:center;height:100%">\
<button id="vrMenuBtn" style="background:rgba(255,255,255,0.1);color:#fff;border:none;width:70px;height:70px;border-radius:18px;font-size:32px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">☰</button>\
<div style="flex:1;display:flex;gap:12px">\
<div id="vrTodayBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;text-align:center;cursor:pointer">\
<div style="font-size:16px;color:rgba(255,255,255,0.5)">Idag</div>\
<div id="vrTodayTur" style="font-size:22px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">...</div>\
</div>\
<div id="vrTomorrowBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;text-align:center;cursor:pointer">\
<div style="font-size:16px;color:rgba(255,255,255,0.5)">Imorgon</div>\
<div id="vrTomorrowTur" style="font-size:22px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">...</div>\
</div>\
<div id="vrSaldoBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;text-align:center;cursor:pointer">\
<div style="font-size:16px;color:rgba(255,255,255,0.5)">Saldo 🔄</div>\
<div id="vrKompSaldo" style="font-size:22px;color:#34C759;font-weight:700">...</div>\
</div>\
</div>\
</div>';

        document.body.appendChild(h);
        document.body.style.paddingTop = headerH;

        // Create menu
        VR.createMenu();

        // Event listeners
        document.getElementById('vrMenuBtn').onclick = function() {
            VR.openMenu();
        };
        document.getElementById('vrTodayBox').onclick = function() {
            if (VR.todayDateStr) VR.openDayFromHeader(VR.todayDateStr);
        };
        document.getElementById('vrTomorrowBox').onclick = function() {
            if (VR.tomorrowDateStr) VR.openDayFromHeader(VR.tomorrowDateStr);
        };
        document.getElementById('vrSaldoBox').onclick = function() {
            VR.manualRefreshSaldo();
        };
    };

    // ===== CLEANUP =====
    VR.cleanup = function() {
        var header = document.getElementById(VR.ID.header);
        if (header) header.remove();
        var v = document.getElementById(VR.ID.view);
        if (v) v.remove();
        var l = document.getElementById(VR.ID.loader);
        if (l) l.remove();
        var d = document.getElementById(VR.ID.detail);
        if (d) d.remove();
        var m = document.getElementById(VR.ID.menu);
        if (m) m.remove();
        var mo = document.getElementById(VR.ID.menuOverlay);
        if (mo) mo.remove();
        document.body.style.paddingTop = '';
    };

    // ===== HEADER INFO =====
    VR.parseTodayTur = function(tbl) {
        var rows = tbl.querySelectorAll('tr');
        var today = VR.getTodayStr();
        var tomorrow = VR.getTomorrowStr();

        VR.todayDateStr = today;
        VR.tomorrowDateStr = tomorrow;

        var foundToday = false, foundTomorrow = false;

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 11) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';

            if (dt === today && !foundToday) {
                foundToday = true;
                var ps = c[3] ? c[3].textContent.trim() : '';
                var tn = c[9] ? c[9].textContent.trim() : '';
                var period = c[10] ? c[10].textContent.trim() : '';
                var cd = c[12] ? c[12].textContent.trim() : '';

                VR.updateHeaderBox('vrTodayTur', ps, tn, period, cd);
            }

            if (dt === tomorrow && !foundTomorrow) {
                foundTomorrow = true;
                var ps2 = c[3] ? c[3].textContent.trim() : '';
                var tn2 = c[9] ? c[9].textContent.trim() : '';
                var period2 = c[10] ? c[10].textContent.trim() : '';
                var cd2 = c[12] ? c[12].textContent.trim() : '';

                VR.updateHeaderBox('vrTomorrowTur', ps2, tn2, period2, cd2);
            }

            if (foundToday && foundTomorrow) break;
        }

        if (!foundToday) {
            var elT = document.getElementById('vrTodayTur');
            if (elT) { elT.innerHTML = '—'; elT.style.color = 'rgba(255,255,255,0.5)'; }
        }
        if (!foundTomorrow) {
            var elM = document.getElementById('vrTomorrowTur');
            if (elM) { elM.textContent = '—'; elM.style.color = 'rgba(255,255,255,0.5)'; }
        }
    };

    VR.updateHeaderBox = function(elId, ps, tn, period, cd) {
        var el = document.getElementById(elId);
        if (!el) return;

        var psUp = (ps || '').toUpperCase();
        var isFPV = psUp === 'FV' || psUp === 'FP2' || psUp === 'FP-V' ||
                    psUp.indexOf('FP-V') > -1 || psUp.indexOf('FP2') > -1;
        var isFri = (cd && cd.toUpperCase() === 'FRIDAG') || isFPV;

        if (isFri) {
            var fB = VR.getHeaderFridagBadge(ps, cd);
            el.innerHTML = 'Ledig' + fB;
            el.style.color = '#F59E0B';
        } else if (tn) {
            var ic = VR.getHeaderIcons(tn);
            el.innerHTML = tn + ic;
            el.style.color = '#fff';
        } else if (period) {
            el.innerHTML = period;
            el.style.color = '#fff';
        } else if (ps) {
            el.innerHTML = ps;
            el.style.color = '#fff';
        } else {
            el.innerHTML = 'Ingen tur';
            el.style.color = 'rgba(255,255,255,0.5)';
        }
    };

    // ===== KOMP SALDO FOR HEADER =====
    VR.fetchKompForHeader = function() {
        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            el.click();
            setTimeout(VR.selectKompForHeader, 1500);
        } else {
            var balances = document.getElementById('CrewBalances');
            if (balances) VR.refreshKompSaldo();
        }
    };

    VR.manualRefreshSaldo = function() {
        var saldoEl = document.getElementById('vrKompSaldo');
        if (saldoEl) {
            saldoEl.textContent = '⏳';
            saldoEl.style.color = '#fff';
        }

        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            el.click();
            setTimeout(VR.selectKompForHeader, 1500);
        } else {
            var balances = document.getElementById('CrewBalances');
            if (balances) {
                VR.refreshKompSaldo();
            } else if (saldoEl) {
                saldoEl.textContent = '❌';
                saldoEl.style.color = '#FF3B30';
            }
        }
    };

    VR.selectKompForHeader = function() {
        var listbox = null;
        var all = document.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) {
            var tag = all[i].tagName || '';
            if (tag.toLowerCase().indexOf('listbox') > -1) {
                listbox = all[i];
                break;
            }
        }
        if (!listbox) return;

        if (listbox.getAttribute('value') === '3') {
            setTimeout(VR.refreshKompSaldo, 500);
            return;
        }

        var dropBtn = listbox.querySelector('.dropdlgbutton');
        if (dropBtn) {
            dropBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            dropBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        }

        setTimeout(function() {
            var found = null;
            var allEls = document.body.getElementsByTagName('*');
            for (var i = 0; i < allEls.length; i++) {
                var el = allEls[i];
                var txt = '';
                for (var j = 0; j < el.childNodes.length; j++) {
                    if (el.childNodes[j].nodeType === 3) txt += el.childNodes[j].textContent;
                }
                if (txt.trim() === 'Komp./Timkonto') {
                    var rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && !listbox.contains(el)) {
                        found = el;
                        break;
                    }
                }
            }
            if (found) {
                found.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                found.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                found.click();
                setTimeout(VR.refreshKompSaldo, 800);
            }
        }, 500);
    };

    VR.refreshKompSaldo = function() {
        var inputs = document.querySelectorAll('#CrewBalances input[type="text"]');
        if (inputs.length >= 2) {
            inputs[0].value = '14-12-2025';
            inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            var today = new Date();
            inputs[1].value = ('0' + today.getDate()).slice(-2) + '-' +
                              ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                              today.getFullYear();
            inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }

        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.trim() === 'Hämta') {
                btns[i].click();
                break;
            }
        }

        setTimeout(VR.parseKompSaldo, 1500);
    };

    VR.parseKompSaldo = function() {
        var tbl = document.querySelector('#CrewBalances table');
        if (!tbl) return;

        var rows = tbl.querySelectorAll('tr');
        if (rows.length < 2) return;

        var c = rows[1].querySelectorAll('td');
        if (c.length < 3) return;

        var saldo = c[2] ? c[2].textContent.trim() : '0:00';
        var el = document.getElementById('vrKompSaldo');
        if (el) {
            el.textContent = saldo + ' tim';
            el.style.color = saldo.indexOf('-') > -1 ? '#FF3B30' : '#34C759';
        }
    };

    // ===== FETCH HEADER INFO =====
    VR.fetchHeaderInfo = function() {
        var tbl = document.querySelector('#workdays table');
        if (tbl) VR.parseTodayTur(tbl);

        setTimeout(VR.doSchema, 100);
        setTimeout(VR.fetchKompForHeader, 2000);
    };

    // ===== INIT =====
    VR.init = function() {
        VR.createHeader();
        VR.fetchHeaderInfo();
        console.log('VR: Initialized');
    };

    console.log('VR: UI loaded');
})();
