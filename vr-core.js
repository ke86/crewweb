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

    // ===== DATE HELPERS =====
    VR.formatDate = function(dateStr) {
        var p = dateStr.split('-');
        if (p.length !== 3) return { day: '', mon: '', wd: '' };
        var dayNum = parseInt(p[0]);
        var monIdx = parseInt(p[1]) - 1;
        var year = parseInt(p[2]);
        var dateObj = new Date(year, monIdx, dayNum);
        return {
            day: dayNum,
            mon: VR.MONTHS_SHORT[monIdx],
            wd: VR.WEEKDAYS_SHORT[dateObj.getDay()]
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
        var textLower = text.toLowerCase();
        var candidates = [];

        // Helper to check exact match (case insensitive)
        function isExactMatch(str) {
            return str.trim().toLowerCase() === textLower;
        }

        // Helper to get direct text only (not from children)
        function getDirectText(el) {
            var direct = '';
            for (var j = 0; j < el.childNodes.length; j++) {
                if (el.childNodes[j].nodeType === 3) {
                    direct += el.childNodes[j].textContent;
                }
            }
            return direct.trim();
        }

        // Helper to check if element is valid (visible)
        function isVisible(el) {
            var r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        }

        // Collect ALL matching candidates with their "specificity score"
        var all = document.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (!isVisible(el)) continue;

            var directText = getDirectText(el);
            var fullText = el.textContent.trim();

            // Skip if direct text is a DIFFERENT menu item (e.g. "Redovisningar" when looking for "Löneredovisningar")
            if (directText.length > 0 && directText.length < text.length && textLower.indexOf(directText.toLowerCase()) > -1) {
                continue; // This element's direct text is a substring of what we want - skip it
            }

            // Check for exact match on direct text (best match)
            if (isExactMatch(directText)) {
                candidates.push({ el: el, score: 100, textLen: directText.length });
                continue;
            }

            // Check for exact match on full text (only if text length matches closely)
            if (isExactMatch(fullText) && fullText.length <= text.length + 2) {
                candidates.push({ el: el, score: 80, textLen: fullText.length });
            }
        }

        // Sort by score (higher is better), then by text length (shorter/exact is better)
        candidates.sort(function(a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return a.textLen - b.textLen;
        });

        // Return best candidate
        if (candidates.length > 0) {
            console.log('VR findMenuItem "' + text + '" found:', candidates[0].el.textContent.trim().substring(0, 30));
            return candidates[0].el;
        }

        console.log('VR findMenuItem "' + text + '" - not found');
        return null;
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
        var inputs = document.querySelectorAll('input');
        var dateInputs = [];
        for (var i = 0; i < inputs.length; i++) {
            var val = inputs[i].value || '';
            if (val.match(/\d{2}-\d{2}-\d{4}/)) {
                dateInputs.push(inputs[i]);
            }
        }
        if (dateInputs.length >= 2) {
            dateInputs[0].value = startDate;
            dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            dateInputs[1].value = endDate;
            dateInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
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

    VR.getTurIcons = function(tn) {
        if (!tn) return '';
        var tnU = tn.toUpperCase();

        // Reserv types
        if (tnU.indexOf('RESERV') === 0) {
            return '<span style="display:inline-block;background:#9333EA;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">xR</span>';
        }

        var c4 = tn.length >= 4 ? tn.charAt(3) : '';
        if (c4 === '8' || c4 === '9') {
            return '<span style="display:inline-block;background:#DC2626;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">R</span>';
        }

        var icons = '';
        var c3 = tn.length >= 3 ? tn.charAt(2) : '';
        var c6 = tn.length >= 6 ? tn.charAt(5) : '';

        // Country flag based on 3rd character
        if (c3 >= '0' && c3 <= '9') {
            var d3 = parseInt(c3);
            icons += d3 % 2 === 1
                ? '<span style="margin-left:9px;font-size:27px">🇸🇪</span>'
                : '<span style="margin-left:9px;font-size:27px">🇩🇰</span>';
        }

        // Shift indicator (A/B)
        if (c6.toUpperCase() === 'A') {
            icons += '<span style="display:inline-block;background:#2563EB;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">1</span>';
        } else if (c6.toUpperCase() === 'B') {
            icons += '<span style="display:inline-block;background:#059669;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:9px">2</span>';
        }

        return icons;
    };

    VR.getFridagBadge = function(ps, cd) {
        var p = (ps || '').toUpperCase();
        if (p === 'FV' || p === 'FP2' || p === 'FP-V' ||
            p.indexOf('FP-V') > -1 || p.indexOf('FP2') > -1) {
            return '<span style="display:inline-block;background:#F59E0B;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:14px">FP-V</span>';
        }
        return '<span style="display:inline-block;background:#F59E0B;color:#fff;font-size:23px;font-weight:700;padding:5px 12px;border-radius:9px;margin-left:14px">FP</span>';
    };

    VR.getHeaderIcons = function(tn) {
        if (!tn) return '';
        var tnU = tn.toUpperCase();
        if (tnU.indexOf('RESERV') === 0) {
            return '<span style="background:#9333EA;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">xR</span>';
        }
        var c4 = tn.length >= 4 ? tn.charAt(3) : '';
        if (c4 === '8' || c4 === '9') {
            return '<span style="background:#DC2626;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">R</span>';
        }
        var icons = '';
        var c3 = tn.length >= 3 ? tn.charAt(2) : '';
        if (c3 >= '0' && c3 <= '9') {
            var d3 = parseInt(c3);
            icons += d3 % 2 === 1 ? '🇸🇪' : '🇩🇰';
        }
        return icons;
    };

    VR.getHeaderFridagBadge = function(ps, cd) {
        var p = (ps || '').toUpperCase();
        if (p === 'FV' || p === 'FP2' || p === 'FP-V' ||
            p.indexOf('FP-V') > -1 || p.indexOf('FP2') > -1) {
            return '<span style="background:#F59E0B;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">FP-V</span>';
        }
        return '<span style="background:#F59E0B;color:#fff;font-size:18px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:5px">FP</span>';
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

    console.log('VR: Core loaded');
})();
