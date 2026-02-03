// VR CrewWeb - UI Components
(function() {
    'use strict';

    var VR = window.VR;

    // Version
    VR.VERSION = 'V.1.37';

    // Add menu ID
    VR.ID.menu = 'vrMenu';
    VR.ID.menuOverlay = 'vrMenuOverlay';

    // ===== MOBILE DETECTION =====
    VR.isMobile = function() {
        return window.innerWidth < 768;
    };

    VR.getHeaderHeight = function() {
        return VR.isMobile() ? '220px' : '180px';
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
<div style="padding:16px 20px 180px">' + content + '</div>';

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

        // Menu panel - 50% större (450px istället för 300px)
        var menu = document.createElement('div');
        menu.id = VR.ID.menu;
        menu.style.cssText = 'position:fixed;top:0;left:-480px;width:450px;height:100%;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);z-index:99999991;transition:left 0.3s ease;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;flex-direction:column;box-shadow:5px 0 30px rgba(0,0,0,0.5)';

        // Kategoriserad menystruktur
        var menuCategories = [
            {
                id: 'schema',
                icon: '📅',
                label: 'Schema & Kalender',
                color: '#007AFF',
                items: [
                    { icon: '📅', label: 'Schema', action: 'doSchema', color: '#007AFF' },
                    { icon: '🏖️', label: 'FP/FPV', action: 'doFPFPV', color: '#34C759' },
                    { icon: '👥', label: 'Vem jobbar?', action: 'doWhosWorking', color: '#FF6F00' }
                ]
            },
            {
                id: 'lon',
                icon: '💰',
                label: 'Lön & Ersättning',
                color: '#4CAF50',
                items: [
                    { icon: '💰', label: 'Lön', action: 'doLon', color: '#4CAF50' },
                    { icon: '⏱️', label: 'Övertid', action: 'doOvertid', color: '#FF9500' },
                    { icon: '🌙', label: 'OB', action: 'doOB', color: '#AF52DE' },
                    { icon: '⏰', label: 'Komp', action: 'doKomp', color: '#34C759' },
                    { icon: '🇩🇰', label: 'SR-Tillägg', action: 'doSRTillagg', color: '#C41E3A' },
                    { icon: '🏠', label: 'Frånvaro', action: 'doFranvaro', color: '#FF6B6B' }
                ]
            },
            {
                id: 'ovrigt',
                icon: '👤',
                label: 'Övrigt',
                color: '#5AC8FA',
                items: [
                    { icon: '👤', label: 'Anställddata', action: 'doAnstallddata', color: '#5AC8FA' },
                    { icon: '📊', label: 'Statistik', action: 'doStatistik', color: '#FF9500' },
                    { icon: '🔮', label: 'Förväntat', action: 'doForvantad', color: '#9B59B6' },
                    { icon: '📤', label: 'Exportera', action: 'doExport', color: '#667eea' }
                ]
            }
        ];

        // Role display - use detected role from SR_RATE if available
        var roleIcon = VR.userRole === 'Tågvärd' ? '🎫' : (VR.userRole === 'Lokförare' ? '🚂' : '');
        var roleText = VR.userRole ? (roleIcon + ' ' + VR.userRole) : '';

        var menuHTML = '<style>\
.vrMenuCategory{border-bottom:1px solid rgba(255,255,255,0.05)}\
.vrMenuCategoryHeader{display:flex;align-items:center;gap:21px;padding:24px 36px;cursor:pointer;transition:background 0.2s}\
.vrMenuCategoryHeader:hover{background:rgba(255,255,255,0.05)}\
.vrMenuCategoryIcon{width:66px;height:66px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:33px}\
.vrMenuCategoryLabel{flex:1;font-size:27px;font-weight:700;color:#fff}\
.vrMenuCategoryArrow{font-size:21px;color:rgba(255,255,255,0.4);transition:transform 0.2s}\
.vrMenuCategory.open .vrMenuCategoryArrow{transform:rotate(90deg)}\
.vrMenuCategoryItems{display:none;padding-bottom:12px}\
.vrMenuCategory.open .vrMenuCategoryItems{display:block}\
.vrMenuSubItem{display:flex;align-items:center;gap:21px;padding:21px 36px 21px 60px;cursor:pointer;transition:background 0.2s}\
.vrMenuSubItem:hover{background:rgba(255,255,255,0.08)}\
.vrMenuSubIcon{width:60px;height:60px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:30px}\
.vrMenuSubLabel{font-size:27px;font-weight:500;color:rgba(255,255,255,0.9)}\
</style>';

        menuHTML += '<div style="padding:36px 36px 30px;border-bottom:1px solid rgba(255,255,255,0.1)">\
            <div style="display:flex;justify-content:space-between;align-items:center">\
                <div style="font-size:39px;font-weight:700;color:#fff">CrewWeb</div>\
                <div style="font-size:20px;color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.1);padding:6px 15px;border-radius:12px">' + VR.VERSION + '</div>\
            </div>' +
            (roleText ? '<div style="font-size:23px;color:rgba(255,255,255,0.5);margin-top:6px">' + roleText + '</div>' : '') +
        '</div>';

        menuHTML += '<div style="flex:1;padding:12px 0;overflow-y:auto">';

        // Bygg kategorier
        for (var c = 0; c < menuCategories.length; c++) {
            var cat = menuCategories[c];
            // Första kategorin öppen som default
            var openClass = c === 0 ? ' open' : '';

            menuHTML += '<div class="vrMenuCategory' + openClass + '" data-category="' + cat.id + '">';
            menuHTML += '<div class="vrMenuCategoryHeader">';
            menuHTML += '<div class="vrMenuCategoryIcon" style="background:' + cat.color + '">' + cat.icon + '</div>';
            menuHTML += '<div class="vrMenuCategoryLabel">' + cat.label + '</div>';
            menuHTML += '<div class="vrMenuCategoryArrow">▶</div>';
            menuHTML += '</div>';
            menuHTML += '<div class="vrMenuCategoryItems">';

            for (var i = 0; i < cat.items.length; i++) {
                var item = cat.items[i];
                menuHTML += '<div class="vrMenuSubItem vrMenuItem" data-action="' + item.action + '">';
                menuHTML += '<div class="vrMenuSubIcon" style="background:' + item.color + '">' + item.icon + '</div>';
                menuHTML += '<div class="vrMenuSubLabel">' + item.label + '</div>';
                menuHTML += '</div>';
            }

            menuHTML += '</div></div>';
        }

        menuHTML += '</div>';

        // Close button at bottom (förladda data borttagen)
        menuHTML += '<div style="padding:30px 36px;border-top:1px solid rgba(255,255,255,0.1)">\
            <div class="vrMenuItem" data-action="cleanup" style="display:flex;align-items:center;gap:27px;padding:24px 30px;cursor:pointer;background:rgba(255,59,48,0.2);border-radius:24px">\
                <div style="width:75px;height:75px;border-radius:21px;background:#FF3B30;display:flex;align-items:center;justify-content:center;font-size:39px">✕</div>\
                <div style="font-size:33px;font-weight:600;color:#FF3B30">Stäng app</div>\
            </div>\
        </div>';

        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Kategori expand/collapse handlers
        var categoryHeaders = menu.querySelectorAll('.vrMenuCategoryHeader');
        for (var k = 0; k < categoryHeaders.length; k++) {
            categoryHeaders[k].onclick = function() {
                var category = this.parentElement;
                category.classList.toggle('open');
            };
        }

        // Add hover effects and click handlers for menu items
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
            items[j].onclick = function(e) {
                e.stopPropagation(); // Förhindra att kategori-klick triggas
                var action = this.getAttribute('data-action');
                VR.closeMenu();
                if (VR[action]) {
                    VR.closeDayDetail();
                    // Track current view for restore after preload (but not for preload/cleanup itself)
                    if (action !== 'doPreloadAll' && action !== 'cleanup') {
                        VR.currentViewAction = action;
                    }
                    // Small delay to let menu close completely before running action
                    setTimeout(function() {
                        VR[action]();
                    }, 100);
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
        if (menu) menu.style.left = '-480px';
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }
    };

    // ===== HEADER =====
    VR.createHeader = function() {
        var h = document.createElement('div');
        h.id = VR.ID.header;
        var headerH = VR.getHeaderHeight();

        h.style.cssText = 'position:fixed;top:0;left:0;right:0;height:' + headerH +
            ';background:rgba(0,0,0,0.95);backdrop-filter:blur(20px);z-index:9999999;padding:24px 24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif';

        h.innerHTML = '\
<div style="display:flex;gap:16px;align-items:center;height:100%">\
<button id="vrMenuBtn" style="background:rgba(255,255,255,0.1);color:#fff;border:none;width:90px;height:90px;border-radius:22px;font-size:44px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">☰</button>\
<div style="flex:1;display:flex;gap:14px">\
<div id="vrTodayBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:18px;padding:16px 18px;text-align:center;cursor:pointer">\
<div style="font-size:32px;color:rgba(255,255,255,0.5)">Idag</div>\
<div id="vrTodayTur" style="font-size:44px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">...</div>\
</div>\
<div id="vrTomorrowBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:18px;padding:16px 18px;text-align:center;cursor:pointer">\
<div style="font-size:32px;color:rgba(255,255,255,0.5)">Imorgon</div>\
<div id="vrTomorrowTur" style="font-size:44px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">...</div>\
</div>\
<div id="vrSaldoBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:18px;padding:16px 18px;text-align:center;cursor:pointer">\
<div style="font-size:32px;color:rgba(255,255,255,0.5)">Saldo</div>\
<div id="vrKompSaldo" class="vr-blink" style="font-size:44px;color:rgba(255,255,255,0.6);font-weight:600">Hämtar</div>\
</div>\
<style>\
@keyframes vrBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }\
.vr-blink { animation: vrBlink 1.5s ease-in-out infinite; }\
</style>\
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
            el.style.color = '#34C759';
        } else if (tn) {
            // Check if day data contains DK.K in sP or eP for Danish flag on Ändrad Reserv
            var hasDKKK = false;
            var dateKey = elId === 'vrTodayTur' ? VR.todayDateStr : VR.tomorrowDateStr;
            if (VR.dayData && VR.dayData[dateKey]) {
                var dayEvents = VR.dayData[dateKey];
                for (var di = 0; di < dayEvents.length; di++) {
                    var sp = (dayEvents[di].sP || '').toUpperCase();
                    var ep = (dayEvents[di].eP || '').toUpperCase();
                    if (sp.indexOf('DK.K') > -1 || ep.indexOf('DK.K') > -1) {
                        hasDKKK = true;
                        break;
                    }
                }
            }
            var ic = VR.getHeaderIcons(tn, hasDKKK);
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
        var saldoEl = document.getElementById('vrKompSaldo');
        if (saldoEl) {
            saldoEl.textContent = 'Hämtar...';
            saldoEl.style.color = 'rgba(255,255,255,0.6)';
            saldoEl.style.fontSize = '28px';
        }

        // Check if already on balances page
        var balances = document.getElementById('CrewBalances');
        if (balances) {
            VR.refreshKompSaldo();
            return;
        }

        // Try to find Redovisningar menu item
        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            el.click();
            setTimeout(VR.selectKompForHeader, 1500);
            return;
        }

        // Menu item not visible - open folder menu first
        VR.clickFolder();
        setTimeout(function() {
            var el2 = VR.findMenuItem('Redovisningar');
            if (el2) {
                el2.click();
                setTimeout(VR.selectKompForHeader, 1500);
            } else if (saldoEl) {
                saldoEl.textContent = 'Tryck 🔄';
                saldoEl.style.fontSize = '28px';
            }
        }, 800);
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

        // Find the newest saldo by parsing all rows and sorting by date
        var data = [];
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 3) continue;
            var d = c[0] ? c[0].textContent.trim() : '';
            var s = c[2] ? c[2].textContent.trim() : '';
            if (d && d.indexOf('-') > -1 && s) {
                var parts = d.split('-');
                if (parts.length === 3) {
                    var dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    data.push({ date: dateObj, saldo: s });
                }
            }
        }

        if (data.length === 0) return;

        // Sort by date descending (newest first)
        data.sort(function(a, b) { return b.date - a.date; });

        var saldo = data[0].saldo;
        VR.kompSaldo = saldo; // Store for later use

        var el = document.getElementById('vrKompSaldo');
        if (el) {
            el.textContent = saldo;
            el.style.color = saldo.indexOf('-') > -1 ? '#FF3B30' : '#34C759';
            el.style.fontSize = '44px';
            el.style.fontWeight = '600';
            el.classList.remove('vr-blink'); // Stop blinking
        }
    };

    // ===== FETCH HEADER INFO =====
    VR.fetchHeaderInfo = function() {
        var tbl = document.querySelector('#workdays table');
        if (tbl) VR.parseTodayTur(tbl);

        // Start Schema, Komp will load after Schema is done
        setTimeout(VR.doSchema, 100);
        // Note: fetchKompForHeader is now called from renderSchemaFromCache
    };

    // ===== UPDATE HEADER FROM CACHE =====
    VR.updateHeaderFromCache = function() {
        if (!VR.allSchemaData) return;

        var today = VR.getTodayStr();
        var tomorrow = VR.getTomorrowStr();

        VR.todayDateStr = today;
        VR.tomorrowDateStr = tomorrow;

        var todayData = VR.allSchemaData[today];
        var tomorrowData = VR.allSchemaData[tomorrow];

        if (todayData && todayData.length > 0) {
            var t = todayData[0];
            VR.updateHeaderBox('vrTodayTur', t.ps, t.tn, t.pr, t.cd);
        } else {
            var elT = document.getElementById('vrTodayTur');
            if (elT) { elT.textContent = '—'; elT.style.color = 'rgba(255,255,255,0.5)'; }
        }

        if (tomorrowData && tomorrowData.length > 0) {
            var m = tomorrowData[0];
            VR.updateHeaderBox('vrTomorrowTur', m.ps, m.tn, m.pr, m.cd);
        } else {
            var elM = document.getElementById('vrTomorrowTur');
            if (elM) { elM.textContent = '—'; elM.style.color = 'rgba(255,255,255,0.5)'; }
        }
    };

    // ===== INIT =====
    VR.init = function() {
        // Role will be detected from tour numbers in SR-Tillägg
        VR.createHeader();
        VR.fetchHeaderInfo();
        console.log('VR: Initialized');
    };

    console.log('VR: UI loaded');
})();
